import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;
  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: true,
    disable_session_recording: true,
    persistence: "localStorage",
  });
  initialized = true;
}

export function identifyUser(userId: string) {
  if (!initialized) return;
  posthog.identify(userId);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, props);
}
