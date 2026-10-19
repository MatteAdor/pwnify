# ZeroDay — Disaster Recovery Runbook (`DISASTER_RECOVERY.md`)

> **SCENARIO**: Your primary development workstation has been completely destroyed, lost, or compromised. You are sitting at a brand new, unconfigured computer with only access to your cloud accounts (GitHub, Supabase, Cloudflare/Vercel, Metered).

Follow this step-by-step guide to restore full development capability, verify infrastructure health, and deploy production updates in under 15 minutes.

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

### 1.2 Authenticate Cloud Access
Log into your cloud accounts via CLI:

```bash
# 1. Authenticate GitHub CLI
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

# 2. Build the client bundle
npm run build

# 3. Start local Supabase emulation stack
supabase start

# 4. Run authoritative pgTAP database tests
npm run test:pgtap

# 5. Run parallel matchmaking concurrency harness
chmod +x supabase/tests/concurrency.sh
./supabase/tests/concurrency.sh
```

If all 44 tests pass and concurrency exits with code 0, the local environment is 100% operational.

---

## Phase 4: Emergency Cloud & Infrastructure Operations

### 4.1 Re-seeding the Question Bank to a Fresh Database
If a new Supabase environment (Staging or Production) has been created without questions:

```bash
# Provide the 32-byte vault key and service_role token
QUESTION_BANK_KEY="<YOUR_VAULT_KEY>" \
SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" \
npm run seed:remote
```
*The script decrypts `supabase/questions_bank.json.enc` in memory and executes idempotent upserts without writing any plaintext file to disk.*

### 4.2 Restoring Database from Encrypted Backup
If the production database was corrupted or deleted:

1. Download the latest `database-backup-encrypted` artifact from the [GitHub Actions Database Backup workflow](https://github.com/MatteAdor/zeroday_app/actions/workflows/db-backup.yml).
2. Decrypt the dump:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 \
     -in zeroday_prod_YYYYMMDD_HHMMSSZ.dump.enc \
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
If the VPS hosting the signaling daemon goes offline:

1. Spin up any fresh Ubuntu 22.04/24.04 droplet (Hetzner, DigitalOcean, AWS, Linode).
2. Point DNS A-record `peer.zeroday.gg` to the new VPS IP.
3. SSH into the VPS and execute the single-command bootstrap:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/MatteAdor/zeroday_app/main/deploy/provision_vps.sh | sudo bash -s -- peer.zeroday.gg
   ```
4. Verify signaling daemon health:
   ```bash
   curl -I https://peer.zeroday.gg/peerjs
   ```

### 4.4 Generating a New Signed Android Release
No Android Studio or local Android SDK is required!

1. Push a release tag to GitHub:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
2. Or trigger manually via GitHub CLI:
   ```bash
   gh workflow run android.yml
   ```
3. GitHub Actions builds the signed APK and AAB with the base64 keystore stored in GitHub Secrets.
4. Download the signed `zeroday-app-release-apk` artifact directly from the GitHub Actions run summary.

---

## Phase 5: Disaster Recovery Verification Checklist

- [ ] Repository cloned cleanly without missing untracked files
- [ ] `npm test` passes 19/19 unit tests
- [ ] `supabase test db` passes 44/44 pgTAP tests
- [ ] `concurrency.sh` reports 0 deadlocks and clean pairing
- [ ] Question bank decodes in memory via `npm run seed:remote`
- [ ] PeerServer VPS active and serving valid HTTPS on `/peerjs`
- [ ] Zero sensitive keys stored unencrypted in repository
