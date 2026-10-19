# ZeroDay — Master Secrets & Credentials Inventory (`SECRETS.md`)

> **CRITICAL SECURITY DIRECTIVE**: This document defines the names, storage locations, scopes, and rotation procedures for all secrets required to operate, deploy, and restore ZeroDay. **NEVER record plain-text tokens, passwords, or private keys in this file or any file tracked by version control.**

---

## 1. GitHub Actions Secrets Inventory

Configure these secrets in **GitHub Repository Settings → Secrets and variables → Actions**.

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
| `QUESTION_BANK_KEY` | All | 32-byte secret passphrase used to decrypt `questions_bank.json.enc` in memory. | 180 days or on leak |
| `BACKUP_ENCRYPTION_KEY` | Production | Passphrase used by `db-backup.yml` to encrypt database dumps with AES-256. | 180 days |
| `FRONTEND_DEPLOY_HOOK_URL` | Production | Webhook URL for triggering automated production build on Vercel or Cloudflare. | On compromise |
| `ANDROID_KEYSTORE_BASE64` | Android CI | Base64-encoded release keystore (`.jks` / `.keystore`) file. | 25 years (Play Store lifetime) |
| `ANDROID_KEY_ALIAS` | Android CI | Alias name for the key inside the Android keystore. | Matches keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Android CI | Master password protecting the Android keystore file. | Matches keystore |
| `ANDROID_KEY_PASSWORD` | Android CI | Password protecting the private key entry. | Matches keystore |
| `VITE_SUPABASE_URL` | Client Build | Public production Supabase URL embedded into frontend bundle. | Immutable per project |
| `VITE_SUPABASE_ANON_KEY` | Client Build | Public production Supabase anonymous client key. | Rotate on leak |

---

## 2. Supabase Cloud Secrets (Edge Functions)

Configure these secrets in Supabase via CLI or Dashboard (**Project Settings → Edge Functions → Secrets**).

```bash
# Set on Staging
supabase secrets set --project-ref <STAGING_REF> \
  METERED_API_KEY="<api-key>" \
  METERED_DOMAIN="<subdomain.metered.ca>"

# Set on Production
supabase secrets set --project-ref <PROD_REF> \
  METERED_API_KEY="<api-key>" \
  METERED_DOMAIN="<subdomain.metered.ca>"
```

| Secret Name | Component | Purpose |
|---|---|---|
| `METERED_API_KEY` | `get_turn_credentials` | Metered.ca API secret for generating ephemeral HMAC TURN tokens. |
| `METERED_DOMAIN` | `get_turn_credentials` | Metered TURN domain endpoint. |
| `TURN_SECRET_KEY` | `get_turn_credentials` | (Alternative coturn) Shared HMAC secret for coturn if self-hosting TURN. |
| `TURN_REALM` | `get_turn_credentials` | (Alternative coturn) Realm domain for coturn. |

---

## 3. VPS & Signaling Daemon Environment (`deploy/.env`)

Stored exclusively on the remote VPS hosting the PeerServer (`/opt/zeroday-signaling/deploy/.env`).

```ini
PEER_DOMAIN=peer.zeroday.gg
PEER_KEY=zeroday-pvp
PEER_ALLOW_ORIGIN=https://zeroday.gg,https://zeroday-app.vercel.app
PEER_CONCURRENT_LIMIT=1000
```

---

## 4. Third-Party Accounts & Access Portals

| Provider | Purpose | Authentication Method | Fallback Recovery |
|---|---|---|---|
| **GitHub** (`MatteAdor/zeroday_app`) | Source code, Actions, Releases | FIDO2 / 2FA Authenticator + Recovery Codes | 2FA Recovery codes stored in offline password vault |
| **Supabase** | Auth, Postgres, RPCs, Edge Functions | SSO / Email 2FA | Emergency DB password stored in password vault |
| **Metered.ca** | STUN/TURN ephemeral relay servers | Email 2FA | API key regeneration in Metered Dashboard |
| **Vercel / Cloudflare** | Frontend web hosting & DNS | FIDO2 / 2FA | Direct git-based deployment trigger |
| **Google Play Console** | Android APK/AAB distribution | Google Account 2FA | App signing key held by Google Play App Signing |

---

## 5. Secret Rotation Runbooks

### 5.1 Rotating `SUPABASE_ACCESS_TOKEN`
1. Navigate to **Supabase Dashboard → Account → Access Tokens**.
2. Click **Generate new token**, label it `GitHub Actions CI/CD`.
3. Copy token, immediately open **GitHub Repo → Settings → Secrets → Actions → `SUPABASE_ACCESS_TOKEN`**.
4. Paste new token and save.
5. Revoke old token in Supabase Dashboard.

### 5.2 Rotating `QUESTION_BANK_KEY`
1. Generate new 32-byte secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Decrypt existing bank and re-encrypt with new key:
   ```bash
   QUESTION_BANK_KEY="<NEW_KEY>" node scripts/encrypt_questions.cjs
   ```
3. Commit and push the updated `supabase/questions_bank.json.enc`.
4. Update `QUESTION_BANK_KEY` in GitHub Secrets.

### 5.3 Rotating Android Keystore
> ⚠️ **WARNING**: If the app is published to the Google Play Store with Play App Signing, the upload key can be reset via Play Console Support. If not using Play App Signing, changing the keystore will prevent users from updating the app!
