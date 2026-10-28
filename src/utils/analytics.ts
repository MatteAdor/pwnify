/**
 * ZeroDay — Telemetry & Analytics Dispatcher
 * Tracks in-app updates lifecycle, active app versions, API 426 events, and technical metrics.
 */

export type AnalyticsEventName =
  | 'app_version'
  | 'update_available_shown'
  | 'update_blocking_shown'
  | 'update_started'
  | 'update_downloaded'
  | 'update_completed'
  | 'update_failed'
  | 'update_fallback_to_store'
  | 'api_426_received'
  | 'distribution_flavor_timeout';

export interface AnalyticsEvent {
  event: AnalyticsEventName;
  timestamp: string;
  properties?: Record<string, unknown>;
}

const STORAGE_KEY = 'zeroday_telemetry_events_v1';
const MAX_STORED_EVENTS = 50;

class AnalyticsDispatcher {
  private inMemoryQueue: AnalyticsEvent[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.inMemoryQueue = JSON.parse(raw);
      }
    } catch {
      this.inMemoryQueue = [];
    }
  }

  private persist(): void {
    try {
      if (typeof window === 'undefined') return;
      if (this.inMemoryQueue.length > MAX_STORED_EVENTS) {
        this.inMemoryQueue = this.inMemoryQueue.slice(-MAX_STORED_EVENTS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryQueue));
    } catch {
      // Storage quota or privacy mode fallback
    }
  }

  /**
   * Tracks an event across telemetry buffer and debug console.
   */
  public track(event: AnalyticsEventName, properties?: Record<string, unknown>): void {
    const entry: AnalyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      properties,
    };

    this.inMemoryQueue.push(entry);
    this.persist();

    if (typeof window !== 'undefined') {
      console.log(`[Pwnify Analytics] [${entry.timestamp}] ${event}`, properties || '');
    }

    // Custom browser event for UI reactivity if needed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zeroday_analytics_event', { detail: entry }));
    }
  }

  /**
   * Returns recent telemetry events.
   */
  public getRecentEvents(): AnalyticsEvent[] {
    return [...this.inMemoryQueue];
  }

  /**
   * Clears telemetry buffer.
   */
  public clear(): void {
    this.inMemoryQueue = [];
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }
}

export const analytics = new AnalyticsDispatcher();
