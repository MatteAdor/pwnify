/**
 * ZeroDay — In-App Update Manager & Distribution Engine
 * Supports two Android flavors:
 *   - 'play': Google Play In-App Updates (Immediate / Flexible) via @capawesome/capacitor-app-update
 *   - 'direct': Direct APK in-app download, SHA-256 verification & PackageInstaller via DirectUpdatePlugin
 * Fail-open resilience: network or server failure NEVER blocks the operator.
 * Arena duel protection: avoids interrupting live 1v1 PvP combat.
 */

import { AppUpdate, AppUpdateAvailability, FlexibleUpdateInstallStatus } from '@capawesome/capacitor-app-update';
import { App } from '@capacitor/app';
import { 
  getRuntimeVersionInfo, 
  getCachedVersionInfo, 
  DirectUpdate, 
  isNativeApp,
  type DistributionFlavor,
  type RuntimeVersionInfo
} from './platform.ts';
import { 
  evaluateUpdateDisposition, 
  resolveApkSha256,
  resolveApkDownloadUrl,
  isAllowedDownloadUrl,
  isValidSha256,
  type RemotePlatformConfig, 
  type UpdateDisposition 
} from './versionUtils.ts';
import { analytics } from './analytics.ts';
import { supabase, isSupabaseConfigured } from '../config/supabase.ts';

export type UpdateStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'UP_TO_DATE'
  | 'FLEXIBLE_AVAILABLE'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'INSTALLING'
  | 'FORCE_REQUIRED'
  | 'ERROR';

export interface UpdateManagerState {
  status: UpdateStatus;
  flavor: DistributionFlavor;
  clientVersionCode: number;
  clientVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  minSupportedVersionCode: number;
  minSupportedVersion: string;
  progressPercent: number; // 0-100
  bytesDownloaded: number;
  totalBytes: number;
  errorMessage: string | null;
  forceMessage: Record<string, string> | null;
  storeUrl: string;
  apkDownloadUrl: string;
  apkSha256: string;
  changelog: Record<string, string[]> | null;
  isArenaDuelActive: boolean;
  needsPermission: boolean;
  showWhatsNew: boolean;
}

const CONFIG_STORAGE_KEY = 'zeroday_remote_app_config_v1';
const LAST_CHECK_KEY = 'zeroday_last_update_check_ts';
const LAST_SEEN_CHANGELOG_BUILD_KEY = 'zeroday_last_seen_changelog_build';
const DEBOUNCE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

type UpdateStateListener = (state: UpdateManagerState) => void;

class UpdateManager {
  private state: UpdateManagerState;
  private listeners: Set<UpdateStateListener> = new Set();
  private isChecking: boolean = false;
  private queuedFlexibleConfig: RemotePlatformConfig | null = null;
  private hasInitialized: boolean = false;

  constructor() {
    const cached = getCachedVersionInfo();
    this.state = {
      status: 'IDLE',
      flavor: cached.flavor,
      clientVersionCode: cached.versionCode,
      clientVersionName: cached.versionName,
      latestVersionCode: cached.versionCode,
      latestVersionName: cached.versionName,
      minSupportedVersionCode: cached.versionCode,
      minSupportedVersion: cached.versionName,
      progressPercent: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      errorMessage: null,
      forceMessage: null,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.zeroday.academy',
      apkDownloadUrl: resolveApkDownloadUrl(),
      apkSha256: '',
      changelog: null,
      isArenaDuelActive: false,
      needsPermission: false,
      showWhatsNew: false,
    };
  }

  public getState(): UpdateManagerState {
    return { ...this.state };
  }

  public subscribe(listener: UpdateStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.warn('[UpdateManager] Listener error:', err);
      }
    });
  }

  private updateState(partial: Partial<UpdateManagerState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  /**
   * Initializes listeners, reports session app_version analytics,
   * checks for changelog note, and sets up foreground watchdog.
   */
  public async initialize(): Promise<void> {
    if (this.hasInitialized) return;
    this.hasInitialized = true;

    // 1. Resolve exact native runtime version & distribution flavor
    const runtime = await getRuntimeVersionInfo();
    this.updateState({
      flavor: runtime.flavor,
      clientVersionCode: runtime.versionCode,
      clientVersionName: runtime.versionName,
    });

    // 2. Track app_version on session startup
    analytics.track('app_version', {
      app_version: runtime.versionName,
      app_build: runtime.versionCode,
      platform: runtime.platform,
      flavor: runtime.flavor,
    });

    // 3. Setup foreground lifecycle listener & back-button trap on Android
    if (isNativeApp()) {
      try {
        await App.addListener('appStateChange', async (appState) => {
          if (appState.isActive) {
            await this.handleAppForeground();
          }
        });

        // Setup flexible download state listener for Play flavor
        if (runtime.flavor === 'play') {
          await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
            const downloaded = state.bytesDownloaded ?? 0;
            const total = state.totalBytesToDownload ?? 0;

            if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADING) {
              const progress = total > 0 ? Math.round((downloaded * 100) / total) : 0;
              this.updateState({
                status: 'DOWNLOADING',
                progressPercent: progress,
                bytesDownloaded: downloaded,
                totalBytes: total,
              });
            } else if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
              this.updateState({
                status: 'DOWNLOADED',
                progressPercent: 100,
              });
              analytics.track('update_completed', { flavor: 'play', flow: 'flexible' });
            } else if (state.installStatus === FlexibleUpdateInstallStatus.FAILED) {
              this.updateState({
                status: 'ERROR',
                errorMessage: 'Flexible update failed on Google Play.',
              });
              analytics.track('update_failed', { flavor: 'play', reason: 'FlexibleUpdateInstallStatus.FAILED' });
            }
          });
        }

        // Setup direct download progress listener for Direct flavor
        if (runtime.flavor === 'direct') {
          await DirectUpdate.addListener('downloadProgress', (data) => {
            this.updateState({
              status: 'DOWNLOADING',
              progressPercent: data.progress,
              bytesDownloaded: data.bytesDownloaded,
              totalBytes: data.totalBytes,
            });
          });
        }
      } catch (err) {
        console.warn('[UpdateManager] Native listener registration error:', err);
      }
    }

    // 4. Initial update check (fail-open)
    await this.checkForUpdates({ ignoreDebounce: false });
  }

  /**
   * Called when app returns to foreground.
   * Resumes immediate update if one was interrupted.
   */
  private async handleAppForeground(): Promise<void> {
    if (this.state.flavor === 'play') {
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS) {
          console.log('[UpdateManager] Resuming interrupted Google Play immediate update...');
          await AppUpdate.performImmediateUpdate();
          return;
        }
      } catch (err) {
        console.warn('[UpdateManager] Error checking Play update on foreground:', err);
      }
    }

    // Run debounced check
    await this.checkForUpdates({ ignoreDebounce: false });
  }

  /**
   * Fetches remote platform config from Supabase with local cache and fail-open guarantees.
   */
  public async fetchRemoteConfig(): Promise<RemotePlatformConfig | null> {
    try {
      if (isSupabaseConfigured) {
        // Try RPC first
        const { data, error } = await (supabase as unknown as { rpc: (name: string, params?: unknown) => Promise<{ data: unknown; error: unknown }> }).rpc('get_remote_app_config', {
          p_platform: 'android',
        });

        if (!error && data) {
          const config = data as unknown as RemotePlatformConfig;
          this.persistCachedConfig(config);
          return config;
        }

        // Fallback to direct table read
        const { data: tableData, error: tableError } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown; error: unknown }> } } } })
          .from('app_versions')
          .select('*')
          .eq('platform', 'android')
          .single();

        if (!tableError && tableData) {
          const config = tableData as unknown as RemotePlatformConfig;
          this.persistCachedConfig(config);
          return config;
        }
      }
    } catch (err) {
      console.warn('[UpdateManager] Remote config fetch exception (fail-open):', err);
    }

    // Fail-open: return cached config if available
    return this.loadCachedConfig();
  }

  private loadCachedConfig(): RemotePlatformConfig | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.config || null;
      }
    } catch {}
    return null;
  }

  private persistCachedConfig(config: RemotePlatformConfig): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(
        CONFIG_STORAGE_KEY,
        JSON.stringify({ config, savedAt: Date.now() })
      );
    } catch {}
  }

  /**
   * Primary check method. Evaluates disposition against remote configuration.
   */
  public async checkForUpdates(options: {
    forceImmediateCheck?: boolean;
    ignoreDebounce?: boolean;
  } = {}): Promise<void> {
    if (this.isChecking) return;

    const now = Date.now();
    if (!options.ignoreDebounce && !options.forceImmediateCheck) {
      try {
        const lastCheckStr = localStorage.getItem(LAST_CHECK_KEY);
        if (lastCheckStr) {
          const lastCheck = parseInt(lastCheckStr, 10);
          if (now - lastCheck < DEBOUNCE_INTERVAL_MS) {
            return; // Debounce window active
          }
        }
      } catch {}
    }

    this.isChecking = true;
    try {
      localStorage.setItem(LAST_CHECK_KEY, String(now));
    } catch {}

    try {
      const config = await this.fetchRemoteConfig();
      if (!config) {
        // Fail-open: network unreachable, do not disrupt user
        return;
      }

      this.updateState({
        latestVersionCode: config.latest_version_code,
        latestVersionName: config.latest_version,
        minSupportedVersionCode: config.min_supported_version_code,
        minSupportedVersion: config.min_supported_version,
        forceMessage: config.force_message,
        storeUrl: config.store_url,
        apkDownloadUrl: resolveApkDownloadUrl(config),
        apkSha256: resolveApkSha256(config) || '',
        changelog: config.changelog || null,
      });

      // Check What's New modal eligibility (first launch after an update)
      this.evaluateWhatsNew(config);

      const disposition: UpdateDisposition = evaluateUpdateDisposition(
        this.state.clientVersionCode,
        config
      );

      if (disposition === 'FORCE_UPDATE_REQUIRED') {
        await this.handleForceUpdateRequired(config);
      } else if (disposition === 'FLEXIBLE_UPDATE_AVAILABLE') {
        await this.handleFlexibleUpdateAvailable(config);
      } else {
        this.updateState({ status: 'UP_TO_DATE' });
      }
    } catch (err) {
      console.warn('[UpdateManager] Check for updates error (fail-open):', err);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Handles mandatory blocking update.
   */
  private async handleForceUpdateRequired(config: RemotePlatformConfig): Promise<void> {
    analytics.track('update_blocking_shown', {
      client_build: this.state.clientVersionCode,
      min_supported_build: config.min_supported_version_code,
      flavor: this.state.flavor,
    });

    if (this.state.flavor === 'play' && isNativeApp()) {
      try {
        const playInfo = await AppUpdate.getAppUpdateInfo();
        if (playInfo.immediateUpdateAllowed) {
          analytics.track('update_started', { flavor: 'play', flow: 'immediate' });
          await AppUpdate.performImmediateUpdate();
          return;
        }
      } catch (err) {
        console.warn('[UpdateManager] Google Play immediate update unavailable, falling back to modal:', err);
      }
    }

    // Set state to FORCE_REQUIRED to render blocking modal
    this.updateState({
      status: 'FORCE_REQUIRED',
    });
  }

  /**
   * Handles non-blocking flexible update. Protects active duels.
   */
  private async handleFlexibleUpdateAvailable(config: RemotePlatformConfig): Promise<void> {
    // Arena duel protection: queue update until battle is over
    if (this.state.isArenaDuelActive) {
      console.log('[UpdateManager] Arena duel in progress. Postponing flexible update notification.');
      this.queuedFlexibleConfig = config;
      return;
    }

    analytics.track('update_available_shown', {
      client_build: this.state.clientVersionCode,
      latest_build: config.latest_version_code,
      flavor: this.state.flavor,
    });

    if (this.state.flavor === 'play' && isNativeApp()) {
      try {
        const playInfo = await AppUpdate.getAppUpdateInfo();
        if (playInfo.flexibleUpdateAllowed) {
          analytics.track('update_started', { flavor: 'play', flow: 'flexible' });
          await AppUpdate.startFlexibleUpdate();
          return;
        }
      } catch (err) {
        console.warn('[UpdateManager] Play flexible update start error:', err);
      }
    }

    // For direct flavor or Play fallback, display discrete banner
    this.updateState({
      status: 'FLEXIBLE_AVAILABLE',
    });
  }

  /**
   * Called by game/duel controllers when Arena match starts or finishes.
   */
  public setArenaDuelActive(isActive: boolean): void {
    this.updateState({ isArenaDuelActive: isActive });
    if (!isActive && this.queuedFlexibleConfig) {
      const cfg = this.queuedFlexibleConfig;
      this.queuedFlexibleConfig = null;
      this.handleFlexibleUpdateAvailable(cfg).catch(() => {});
    }
  }

  /**
   * Executes update action when user clicks primary button:
   * - In 'play' flavor: opens Google Play Store via market:// URL
   * - In 'direct' flavor: initiates in-app APK download and installation
   */
  public async executePrimaryUpdateAction(): Promise<void> {
    if (this.state.flavor === 'play') {
      analytics.track('update_fallback_to_store', {
        store_url: this.state.storeUrl,
        flavor: 'play',
      });
      try {
        await AppUpdate.openAppStore({ appId: 'com.zeroday.academy' });
      } catch {
        window.open(this.state.storeUrl, '_blank');
      }
      return;
    }

    // Direct flavor: In-app APK download and installation
    if (this.state.flavor === 'direct') {
      await this.startDirectApkInstall();
    }
  }

  /**
   * Direct flavor APK download and package installer execution.
   */
  public async startDirectApkInstall(): Promise<void> {
    analytics.track('update_started', { flavor: 'direct', flow: 'in_app_apk' });

    // Check unknown app sources permission first on Android
    if (isNativeApp()) {
      try {
        const perm = await DirectUpdate.canRequestPackageInstalls();
        if (!perm.canInstall) {
          this.updateState({
            needsPermission: true,
            status: 'FORCE_REQUIRED',
            errorMessage: 'Permesso di installazione app sconosciute richiesto.',
          });
          await DirectUpdate.openInstallPermissionSettings();
          return;
        }
      } catch (err) {
        console.warn('[UpdateManager] Error checking install permission:', err);
      }
    }

    this.updateState({
      status: 'DOWNLOADING',
      progressPercent: 0,
      errorMessage: null,
      needsPermission: false,
    });

    try {
      const targetUrl = this.state.apkDownloadUrl.startsWith('http')
        ? this.state.apkDownloadUrl
        : `${window.location.origin}${this.state.apkDownloadUrl}`;

      if (!isAllowedDownloadUrl(targetUrl)) {
        throw new Error('URL di download APK non autorizzato: consentito solo protocollo HTTPS su domini ufficiali in allowlist.');
      }

      if (!isValidSha256(this.state.apkSha256)) {
        throw new Error('Impossibile procedere con l\'installazione: hash SHA-256 di integrità assente o non valido nella configurazione remota.');
      }

      if (isNativeApp()) {
        const res = await DirectUpdate.downloadAndInstallApk({
          url: targetUrl,
          expectedSha256: this.state.apkSha256,
        });

        if (res.success) {
          this.updateState({ status: 'INSTALLING', progressPercent: 100 });
          analytics.track('update_completed', { flavor: 'direct', flow: 'in_app_apk' });
        }
      } else {
        // Web browser: trigger standard browser download
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = 'zeroday.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.updateState({ status: 'UP_TO_DATE' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.updateState({
        status: 'ERROR',
        errorMessage: msg || 'Download o verifica dell\'aggiornamento fallita.',
      });
      analytics.track('update_failed', { flavor: 'direct', reason: msg });
    }
  }

  /**
   * Completes flexible update and restarts app (Play flavor).
   */
  public async completeFlexibleUpdate(): Promise<void> {
    if (this.state.flavor === 'play' && isNativeApp()) {
      try {
        await AppUpdate.completeFlexibleUpdate();
      } catch (err) {
        console.warn('[UpdateManager] Error completing flexible update:', err);
      }
    }
  }

  /**
   * Intercepts HTTP 426 Upgrade Required from any API call.
   */
  public handleHttp426Received(detailPayload?: Record<string, unknown>): void {
    console.warn('[UpdateManager] HTTP 426 Upgrade Required intercepted from server:', detailPayload);
    analytics.track('api_426_received', detailPayload);

    this.updateState({
      status: 'FORCE_REQUIRED',
      errorMessage: 'La versione in uso non è più supportata dal protocollo ZeroDay.',
    });

    // Run immediate check
    this.checkForUpdates({ forceImmediateCheck: true, ignoreDebounce: true }).catch(() => {});
  }

  /**
   * Evaluates if the "What's New" note should be displayed for this build.
   */
  private evaluateWhatsNew(config: RemotePlatformConfig): void {
    try {
      if (!config.changelog) return;
      const lastSeenStr = localStorage.getItem(LAST_SEEN_CHANGELOG_BUILD_KEY);
      const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : 0;

      if (this.state.clientVersionCode > lastSeen) {
        this.updateState({ showWhatsNew: true });
      }
    } catch {}
  }

  /**
   * Dismisses the "What's New" dialog and records the current build code.
   */
  public dismissWhatsNew(): void {
    try {
      localStorage.setItem(
        LAST_SEEN_CHANGELOG_BUILD_KEY,
        String(this.state.clientVersionCode)
      );
    } catch {}
    this.updateState({ showWhatsNew: false });
  }
}

export const updateManager = new UpdateManager();

if (typeof window !== 'undefined') {
  window.addEventListener('zeroday_upgrade_required', (e: Event) => {
    const customEvt = e as CustomEvent<Record<string, unknown>>;
    updateManager.handleHttp426Received(customEvt.detail);
  });
}
