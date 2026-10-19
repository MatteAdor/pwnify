# ZeroDay — Database Backup & Restore Verification Procedure

> **OBJECTIVE**: Verify the integrity of production database backups (`zeroday_prod_*.dump.enc`) by performing a simulated restore into an isolated Staging database environment. Never restore untested dumps directly to Production.

---

## Prerequisites
- A recent encrypted backup from the [Database Automated Backup](https://github.com/MatteAdor/zeroday_app/actions/workflows/db-backup.yml) GitHub Action run.
- `BACKUP_ENCRYPTION_KEY` from password vault / GitHub Secrets.
- PostgreSQL Client (`pg_restore`, `psql`) v15+.
- Supabase Staging Database Connection String (`SUPABASE_STAGING_DB_URL`).

---

## Step 1: Download & Decrypt Backup

1. Download the `database-backup-encrypted.zip` artifact from GitHub Actions and extract `zeroday_prod_<timestamp>.dump.enc`.
2. Decrypt using OpenSSL with PBKDF2:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 \
     -in "zeroday_prod_<timestamp>.dump.enc" \
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
