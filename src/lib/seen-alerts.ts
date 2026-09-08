const STORAGE_KEY = "ps-seen-alerts";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isAlertSeen(id: string) {
  return readIds().includes(id);
}

export function markAlertSeen(id: string) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...readIds(), id]));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("ps-seen-alerts"));
}

export function markAlertsSeen(ids: string[]) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...readIds(), ...ids]));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("ps-seen-alerts"));
}

export function subscribeSeenAlerts(onStoreChange: () => void) {
  window.addEventListener("ps-seen-alerts", onStoreChange);
  return () => window.removeEventListener("ps-seen-alerts", onStoreChange);
}

export function getSeenAlertsSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

export function getSeenAlertsServerSnapshot() {
  return "__ssr__";
}
