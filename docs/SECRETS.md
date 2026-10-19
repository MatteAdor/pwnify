# ZeroDay — Master Secrets & Credentials Inventory (`SECRETS.md`)

> **CRITICAL SECURITY DIRECTIVE**: This document defines the names, storage locations, scopes, and rotation procedures for all secrets required to operate, deploy, and restore ZeroDay. **NEVER record plain-text tokens, passwords, or private keys in this file or any file tracked by version control.**
>
> When setting secrets via the GitHub CLI, **always** use the interactive prompt:
> ```bash
> gh secret set SECRET_NAME
> ```
> **Never** use `--body` or inline arguments, as they leave sensitive credentials in shell history and terminal logs.

---

## 1. GitHub Actions Secrets Inventory

Configure these secrets in **GitHub Repository Settings → Secrets and variables → Actions** or via interactive CLI:
```bash
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROD_PROJECT_ID
# etc.
```

| Secret Name | Scope | Description | Rotation Frequency |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | CI/CD | Supabase CLI personal access token (`sbp_...`) for `db push` and functions deploy. | 90 days or on team departure |
| `SUPABASE_PROD_PROJECT_ID` | Production | Supabase production project reference ID (e.g., `abcedfghijklmnop`). | Immutable per project |
| `SUPABASE_PROD_URL` | Production | Full HTTPS API URL for production (`https://<ref>.supabase.co`). | Immutable per project |
| `SUPABASE_PROD_SERVICE_ROLE_KEY` | Production | Production `service_role` JWT secret for administrative seeding. | Rotate on leak |
| `SUPABASE_PROD_DB_URL` | Production | Direct pooled Postgres connection string for `pg_dump` backup workflow. | Rotate password on leak |
| `SUPABASE_STAGING_PROJECT_ID` | Staging | Supabase staging project reference ID. | Immutable per project |
| `SUPABASE_STAGING_URL` | Staging | Full HTTPS API URL for staging. | Immutable per project |
| `SUPABASE_STAGING_SERVICE_ROLE_KEY` | Staging | Staging `service_role` JWT secret. | Rotate on leak |
| `QUESTION_BANK_KEY` | All | 32-byte secret passphrase used to decrypt questions bank via `scrypt` + AES-256-GCM. | 180 days or on leak |
| `QUESTION_BANK_REMOTE_URL` | CI/CD | HTTPS URL to private R2/S3 bucket or private repo where encrypted question bank is hosted. | On bucket migration |
| `BACKUP_ENCRYPTION_KEY` | Production | Passphrase used by `db-backup.yml` to encrypt database dumps with AES-256-CBC (PBKDF2 600k iter). | 180 days |
| `BACKUP_S3_ENDPOINT` | Production | S3-compatible API endpoint (e.g. `https://<account_id>.r2.cloudflarestorage.com`). | Immutable per bucket |
| `BACKUP_BUCKET_NAME` | Production | S3/R2 private bucket name for database backup archives (e.g. `zeroday-encrypted-backups`). | Immutable |
| `BACKUP_S3_ACCESS_KEY_ID` | Production | S3/R2 Access Key ID for backup upload. | 180 days |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Production | S3/R2 Secret Access Key for backup upload. | 180 days |
| `LEMONSQUEEZY_API_KEY` | Production | Lemon Squeezy API token for license verification and store management. | 180 days |
| `LEMONSQUEEZY_STORE_ID` | Production | Numeric Lemon Squeezy Store ID. | Immutable per store |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Production | HMAC signing secret used by Edge Functions to verify Lemon Squeezy webhooks. | Rotate on leak |
| `FRONTEND_DEPLOY_HOOK_URL` | Production | Webhook URL for triggering automated production build on Vercel or Cloudflare Pages. | On compromise |
| `ANDROID_KEYSTORE_BASE64` | Android CI | Base64-encoded release keystore (`.jks` / `.keystore`) file. | 25 years (Play Store lifetime) |
| `ANDROID_KEY_ALIAS` | Android CI | Alias name for the key inside the Android keystore. | Matches keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Android CI | Master password protecting the Android keystore file. | Matches keystore |
| `ANDROID_KEY_PASSWORD` | Android CI | Password protecting the private key entry. | Matches keystore |
| `VITE_SUPABASE_URL` | Client Build | Public production Supabase URL embedded into frontend bundle. | Immutable per project |
| `VITE_SUPABASE_ANON_KEY` | Client Build | Public production Supabase anonymous client key. | Rotate on leak |

---

## 2. Supabase Cloud Secrets (Edge Functions)

Configure these secrets in Supabase via Dashboard (**Project Settings → Edge Functions → Secrets**) or interactive CLI:

```bash
# Set on Staging (CLI will prompt or read from secure environment)
supabase secrets set --project-ref <STAGING_REF> METERED_API_KEY METERED_DOMAIN LEMONSQUEEZY_WEBHOOK_SECRET

# Set on Production
supabase secrets set --project-ref <PROD_REF> METERED_API_KEY METERED_DOMAIN LEMONSQUEEZY_WEBHOOK_SECRET
```

| Secret Name | Component | Purpose |
|---|---|---|
| `METERED_API_KEY` | `get_turn_credentials` | Metered.ca API secret for generating ephemeral HMAC TURN tokens. |
| `METERED_DOMAIN` | `get_turn_credentials` | Metered TURN domain endpoint. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | `lemonsqueezy_webhook` | HMAC-SHA256 signature validation secret for order events. |
| `TURN_SECRET_KEY` | `get_turn_credentials` | (Alternative coturn) Shared HMAC secret for coturn if self-hosting TURN. |
| `TURN_REALM` | `get_turn_credentials` | (Alternative coturn) Realm domain for coturn. |

---

## 3. VPS & Signaling Daemon Environment (`/opt/zeroday-signaling/deploy/.env`)

Stored exclusively on the remote VPS hosting the PeerServer (`/opt/zeroday-signaling/deploy/.env`).

```ini
PEER_DOMAIN=peer.zeroday.gg
PEER_KEY=zeroday-pvp
PEER_ALLOW_ORIGIN=https://zeroday.gg,https://zeroday-app.vercel.app
PEER_CONCURRENT_LIMIT=1000
```

---

## 4. Third-Party Accounts & Access Portals

> [!IMPORTANT]
> **Production Infrastructure Requirement: Supabase Pro Tier ($25/month)**
> ZeroDay requires the Supabase Pro tier for production:
> 1. Prevents auto-pausing after 7 days of inactivity (which drops live production traffic on free tier).
> 2. Automated daily platform backups with Point-In-Time-Recovery (PITR).
> 3. SLA, increased egress, and dedicated connection poolers for ranked PvP.

| Provider | Purpose | Authentication Method | Fallback Recovery |
|---|---|---|---|
| **GitHub** (`MatteAdor/zeroday_app`) | Source code, Actions, Releases | FIDO2 / 2FA Authenticator + Recovery Codes | 2FA Recovery codes stored in offline password vault |
| **Supabase (Pro Plan)** | Auth, Postgres, RPCs, Edge Functions | SSO / Email 2FA | Emergency DB password stored in password vault |
| **Lemon Squeezy** | Merchant of Record, Payments & Subscriptions | 2FA Authenticator | Account recovery codes in password vault |
| **Metered.ca** | STUN/TURN ephemeral relay servers | Email 2FA | API key regeneration in Metered Dashboard |
| **Cloudflare / Vercel** | Frontend web hosting & DNS | FIDO2 / 2FA | Direct git-based deployment trigger |
| **Cloudflare R2 / AWS S3** | Offsite encrypted backups & encrypted bank | API Key / IAM 2FA | Root account MFA recovery keys |
| **Google Play Console** | Android APK/AAB distribution | Google Account 2FA | App signing key held by Google Play App Signing |

---

## 5. Secret Rotation Runbooks

### 5.1 Setting Secrets Interactively via GitHub CLI
To update any secret without leaking the value into shell history:
```bash
gh secret set SECRET_NAME
# Type or paste the secret value interactively when prompted, then press Enter
```

### 5.2 Rotating `SUPABASE_ACCESS_TOKEN`
1. Navigate to **Supabase Dashboard → Account → Access Tokens**.
2. Click **Generate new token**, label it `GitHub Actions CI/CD`.
3. Copy token, immediately execute:
   ```bash
   gh secret set SUPABASE_ACCESS_TOKEN
   ```
4. Revoke old token in Supabase Dashboard.

### 5.3 Rotating `QUESTION_BANK_KEY` and Questions Bank
1. Generate new 32-byte secret passphrase:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Decrypt questions bank locally and re-encrypt with the new key:
   ```bash
   QUESTION_BANK_KEY="<NEW_KEY>" node scripts/encrypt_questions.cjs
   ```
   *Note: `questions_bank.json.enc` is excluded from git via `.gitignore` to prevent leaking question answers even in ciphertext form on public repositories.*
3. Upload the freshly encrypted `questions_bank.json.enc` to your private object storage bucket (e.g. Cloudflare R2):
   ```bash
   aws s3 cp supabase/questions_bank.json.enc "s3://${BACKUP_BUCKET_NAME}/assets/questions_bank.json.enc" \
     --endpoint-url "${BACKUP_S3_ENDPOINT}"
   ```
4. Update `QUESTION_BANK_KEY` in GitHub Secrets:
   ```bash
   gh secret set QUESTION_BANK_KEY
   ```
5. Remove local unencrypted artifacts:
   ```bash
   rm -f supabase/questions_bank.json.enc
   ```

### 5.4 Rotating Android Keystore
> ⚠️ **WARNING**: If the app is published to the Google Play Store with Play App Signing, the upload key can be reset via Play Console Support. If not using Play App Signing, changing the keystore will prevent users from updating the app!
