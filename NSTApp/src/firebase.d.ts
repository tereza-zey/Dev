declare module './firebase' {
  export function initializeFirebase(): boolean;
  export function requestNotificationPermission(): Promise<string | null>;
} 