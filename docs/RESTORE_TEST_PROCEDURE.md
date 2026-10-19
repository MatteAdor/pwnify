# ZeroDay — Database Backup & Restore Verification Procedure

> [!IMPORTANT]
> **Production Requirement: Supabase Pro Tier ($25/month)**
> ZeroDay in production mandates the Supabase Pro plan:
> 1. **Zero Auto-Pause**: Free tier projects pause automatically after 7 days of inactivity, dropping production traffic. Pro keeps services permanently active.
> 2. **Native Daily Backups & PITR**: Provides automated 7-day point-in-time recovery at the storage/WAL level alongside our offsite encrypted `pg_dump` automation.
> 3. **Higher Egress & Connection Limits**: Essential for concurrent 1v1 matchmaking and WebSocket/Realtime traffic.

---

## Prerequisites
- PostgreSQL Client (`pg_restore`, `psql`) v15+.
- AWS CLI configured with read access to the offsite encrypted backup bucket.
- `BACKUP_ENCRYPTION_KEY` from password vault.
- Supabase Staging Database Connection String (`SUPABASE_STAGING_DB_URL`).

---

## Step 1: Download & Decrypt Backup

1. Download the latest encrypted backup from your private object storage (Cloudflare R2 / AWS S3):
   ```bash
   aws s3 cp "s3://${BACKUP_BUCKET_NAME}/backups/<backup_filename>.dump.enc" \
     ./prod_backup.dump.enc \
     --endpoint-url "${BACKUP_S3_ENDPOINT}"
   ```
2. Decrypt using OpenSSL with PBKDF2 (600,000 iterations):
   ```bash
   openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 600000 \
     -in "./prod_backup.dump.enc" \
     -out "staging_restore.dump" \
     -pass "pass:${BACKUP_ENCRYPTION_KEY}"
   ```
3. Inspect dump header:
   ```bash
   pg_restore --list staging_restore.dump | head -n 30
   ```

---

## Step 2: Restore to Staging Environment

Run `pg_restore` targeting the Staging database:

```bash
pg_restore \
  --dbname="${SUPABASE_STAGING_DB_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  staging_restore.dump
```

*Note: Ignore warnings regarding standard Supabase schemas (`auth`, `storage`) that are managed by the Supabase platform.*

---

## Step 3: Run Integrity Assertions

Verify that all essential tables and records exist in the restored staging database:

```sql
-- 1. Check Profiles count and sample record
SELECT count(*) AS total_profiles, max(elo) AS max_elo FROM public.profiles;

-- 2. Verify Matches table integrity
SELECT count(*) AS total_matches, count(*) FILTER (WHERE status = 'completed') AS completed_matches FROM public.matches;

-- 3. Confirm Questions table exists with hidden correct_index
SELECT count(*) AS total_questions FROM public.questions;

-- 4. Check Forfeit History and Rate Limit logs
SELECT count(*) FROM public.forfeit_history;
SELECT count(*) FROM public.rpc_rate_limits;
```

---

## Step 4: Cleanup Local Working Files

```bash
# Immediately wipe decrypted dump file from disk
rm -f staging_restore.dump
```
