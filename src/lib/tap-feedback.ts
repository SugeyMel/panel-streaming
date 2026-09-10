export function tapFeedback(enabled = true) {
  if (!enabled || typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(18);
  } catch {
    /* iOS and some browsers ignore vibrate */
  }
}
