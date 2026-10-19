# ZeroDay — Disaster Recovery Runbook (`DISASTER_RECOVERY.md`)

> **SCENARIO**: Your primary development workstation has been completely destroyed, lost, or compromised. You are sitting at a brand new, unconfigured computer with only access to your cloud accounts and master password vault.
>
> Follow this step-by-step guide to recover administrative access, bootstrap the environment, verify infrastructure health, and deploy production updates in under 15 minutes.

---

## Phase 0: Account Recovery (2FA & Password Vault)

Before configuring any hardware, ensure you can access the critical cloud control planes:

### 0.1 Password Manager Emergency Kit
All master credentials and one-time backup recovery codes must be stored in a secure password vault (e.g. 1Password / Bitwarden / KeePassXC) with an offsite Emergency Kit (printed on paper or stored on an encrypted cold USB drive):

1. **GitHub (`@MatteAdor`)**: Use your GitHub Emergency Recovery Codes (or hardware security key) if your phone's authenticator is lost.
2. **Supabase**: Access dashboard via email SSO or authenticated session; retrieve emergency database connection strings.
3. **Cloudflare / Vercel**: Hosting and DNS authority for `zeroday.gg` and `peer.zeroday.gg`.
4. **Lemon Squeezy**: Merchant of Record portal for customer subscriptions and webhook secret management.
5. **Metered.ca**: STUN/TURN ephemeral relay dashboard.
6. **VPS Provider (Hetzner / DigitalOcean / AWS)**: Cloud console access to spin up or re-image virtual machines.
7. **Cloudflare R2 / AWS S3**: Object storage holding encrypted question banks and offsite database backups.

> 🔒 **SECURITY DIRECTIVE**: Never commit passwords, recovery codes, or API tokens to any repository. All recovery credentials must be retrieved directly from your personal password vault.

---

## Phase 1: Machine Bootstrap (5 Minutes)

### 1.1 Install Core Toolchain
Install the following developer tools on the new machine:

- **Git**: `sudo apt install git` / `brew install git` / `winget install Git.Git`
- **Node.js (v22 LTS)**: Install via [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  nvm install 22 && nvm use 22
  ```
- **Docker Desktop / Docker Engine**: [docker.com](https://www.docker.com/) (Required for local Supabase emulator & pgTAP).
- **GitHub CLI (`gh`)**:
  ```bash
  # Linux (Debian/Ubuntu)
  sudo apt install gh
  # macOS
  brew install gh
  # Windows
  winget install GitHub.cli
  ```
- **Supabase CLI**:
  ```bash
  # macOS / Linux (Homebrew)
  brew install supabase/tap/supabase
  # Linux (Binary)
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin
  # Windows (Scoop / npm)
  npx supabase --version
  ```
- **AWS CLI**: (For downloading offsite encrypted backups from S3/R2).

### 1.2 Authenticate Cloud Access
Log into your cloud accounts via CLI:

```bash
# 1. Authenticate GitHub CLI (interactive web flow)
gh auth login -w -p https

# 2. Authenticate Supabase CLI
supabase login
```

---

## Phase 2: Repository Clone & Workspace Setup (3 Minutes)

```bash
# Clone the repository
git clone https://github.com/MatteAdor/zeroday_app.git
cd zeroday_app

# Install exact locked dependencies
npm ci

# Configure local development environment
cp .env.example .env
```

Edit `.env` and fill in your developer keys (see `docs/SECRETS.md`). For purely local development, Supabase defaults work out of the box with `supabase start`.

---

## Phase 3: Verify Local Verification Harness (3 Minutes)

Validate that the new machine executes all regression checks cleanly:

```bash
# 1. Run pure unit test suite (ranked math, cloudSync, controller mocks)
npm test

# 2. Build the client bundle (validates TypeScript & Vite bundling)
npm run build

# 3. Start local Supabase emulation stack
supabase start

# 4. Run authoritative pgTAP database tests (44 automated test assertions)
npm run test:pgtap

# 5. Run parallel matchmaking concurrency harness (SKIP LOCKED validation)
chmod +x supabase/tests/concurrency.sh
./supabase/tests/concurrency.sh
```

If all unit and pgTAP tests pass and concurrency reports 0 deadlocks, the codebase is 100% operational on the new workstation.

---

## Phase 4: Emergency Cloud & Infrastructure Operations

### 4.1 Re-seeding the Question Bank to a Fresh Database
The question bank (`questions_bank.json`) is never tracked in git plaintext to prevent exposing answers. During disaster recovery, fetch the encrypted asset from private storage and decrypt in memory:

```bash
# Provide the 32-byte vault key and service_role token
QUESTION_BANK_KEY="<YOUR_32_BYTE_VAULT_KEY>" \
QUESTION_BANK_REMOTE_URL="https://<YOUR_BUCKET>.r2.cloudflarestorage.com/assets/questions_bank.json.enc" \
SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" \
npm run seed:remote
```
*The script downloads the ciphertext from private storage, verifies the AES-256-GCM authentication tag, decrypts in memory via `scrypt`, and executes idempotent database upserts without writing any plaintext file to disk.*

### 4.2 Restoring Database from Offsite Encrypted Backup
If the production database was corrupted, lost, or accidentally truncated:

> [!IMPORTANT]
> **Production Note**: Supabase Pro tier ($25/mo) provides automated daily snapshots with Point-In-Time-Recovery (PITR). Always verify PITR in the Supabase Dashboard first. If platform-level restore is unavailable, use this offsite archive procedure:

1. Download the latest encrypted backup from your private object storage (Cloudflare R2 / S3):
   ```bash
   aws s3 cp "s3://${BACKUP_BUCKET_NAME}/backups/<BACKUP_FILE>.dump.enc" \
     ./prod_backup.dump.enc \
     --endpoint-url "${BACKUP_S3_ENDPOINT}"
   ```
2. Decrypt the dump using OpenSSL PBKDF2 (600,000 iterations):
   ```bash
   openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 600000 \
     -in ./prod_backup.dump.enc \
     -out restored.dump \
     -pass pass:<YOUR_BACKUP_ENCRYPTION_KEY>
   ```
3. Restore into target database (test on Staging first!):
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname="<TARGET_SUPABASE_POSTGRES_CONNECTION_STRING>" \
     restored.dump
   rm -f restored.dump
   ```

### 4.3 Provisioning a New PeerServer VPS from Scratch
If the VPS hosting the WebRTC signaling daemon goes offline:

1. Spin up a fresh Ubuntu 22.04 or 24.04 VPS (e.g. Hetzner CX22, DigitalOcean Droplet).
2. Point DNS A-record `peer.zeroday.gg` to the new VPS IP.
3. SSH into the VPS, clone the pinned release tag, verify checksum, and run provisioning:
   ```bash
   # Clone repository at pinned stable release tag
   git clone --depth 1 --branch v1.0.0 https://github.com/MatteAdor/zeroday_app.git /opt/zeroday_app
   cd /opt/zeroday_app

   # Verify integrity of provisioning script against committed SHA-256 hash
   sha256sum -c deploy/provision_vps.sh.sha256

   # Execute unattended provisioning with target domain
   sudo bash deploy/provision_vps.sh peer.zeroday.gg
   ```
4. Verify signaling daemon health:
   ```bash
   curl -I https://peer.zeroday.gg/peerjs
   ```

### 4.4 Generating a New Signed Android Release
No Android Studio or local Android SDK is required:

1. Trigger the workflow via GitHub CLI or push a release tag:
   ```bash
   gh workflow run android.yml
   ```
2. GitHub Actions builds the signed APK and AAB using the base64 keystore stored in GitHub Secrets.
3. Download the signed `zeroday-app-release-apk` artifact directly from the run summary.

---

## Phase 5: Payment & Monetization Architecture (Lemon Squeezy)

ZeroDay uses **Lemon Squeezy** as its Merchant of Record (PCI-DSS compliant).
- Checkout URLs are configured in `src/config/monetization.ts`.
- **Server-Side License Verification**:
  1. The client never sets or updates `is_pro` directly in the database.
  2. Legacy migration (`migrate_my_legacy_progress`) explicitly filters out and rejects `isPro` or `licenseKey` from user localStorage inventories.
  3. Ranked PvP duels require verified email auth, but do not require PRO.
  4. Offline PRO capabilities are validated client-side via cryptographic checksum validation (`0xPRO-XXXX-XXXX-XXXX`).
  5. Authoritative server-side PRO entitlement is designed around Lemon Squeezy webhook events (`order_created`, `subscription_cancelled`) validated with `LEMONSQUEEZY_WEBHOOK_SECRET` via Supabase Edge Function (`lemonsqueezy_webhook`).

---

## Phase 6: Live Operational Status & Checklist

Honest audit of infrastructure components:

| Component | Architecture & Code Ready | Verified Live in Cloud | Notes / Actions Needed |
|---|:---:|:---:|---|
| **Postgres Database Schema & RLS** | ✅ Yes | 🟡 Local Only | Applied & tested locally via `supabase start` and 44 pgTAP tests. Needs `supabase db push` to Cloud Prod/Staging. |
| **Matchmaking & Ranked RPCs** | ✅ Yes | 🟡 Local Only | Concurrency script verified locally. Needs execution on Cloud instances. |
| **TURN Ephemeral Relay (Metered)** | ✅ Yes | ⏳ Pending Live Credentials | Edge Function `get_turn_credentials` written and rate-limited. Requires user to add `METERED_API_KEY` in Supabase Secrets. |
| **WebRTC PeerServer Daemon (VPS)** | ✅ Yes | ⏳ Pending VPS Server | Dockerfile, docker-compose, and Caddy reverse proxy automated in `deploy/`. Requires live VPS IP & DNS A record for `peer.zeroday.gg`. |
| **DNS & Domain (`zeroday.gg`)** | ✅ Configured | ⏳ Pending Registrar Config | DNS records (`peer.zeroday.gg` $\to$ VPS, `@` $\to$ Cloudflare Pages / Vercel) documented. |
| **Web Frontend Hosting** | ✅ Yes | ⏳ Pending Git Hook | `npm run build` succeeds cleanly. Requires linking GitHub repo to Cloudflare Pages or Vercel. |
| **Encrypted Database Backups** | ✅ Yes | ⏳ Pending S3/R2 Bucket | `.github/workflows/db-backup.yml` updated with AES-256-CBC (iter 600,000) and S3 upload. Requires S3/R2 credentials in GitHub Secrets. |
| **Encrypted Question Bank Seeding** | ✅ Yes | ⏳ Pending Bucket Upload | Script uses AES-256-GCM + `scrypt`. `questions_bank.json.enc` must be uploaded to private R2 bucket (`QUESTION_BANK_REMOTE_URL`). |
| **Android Signed Release CI** | ✅ Yes | ⏳ Pending Keystore Secret | `.github/workflows/android.yml` fully configured. Requires `ANDROID_KEYSTORE_BASE64` in GitHub Secrets to produce signed release. |
| **Live Backup Restore Test** | ✅ Documented | ⏳ Pending First Cloud Dump | Procedure documented in `docs/RESTORE_TEST_PROCEDURE.md`. To be executed once first cloud dump is generated. |
