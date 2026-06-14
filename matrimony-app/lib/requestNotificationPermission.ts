export async function requestNotificationPermission(): Promise<void> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      await Notification.requestPermission();
    } catch {
      // Ignore unsupported or blocked permission requests.
    }
  }
}
