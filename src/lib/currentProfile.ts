import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'konnect_current_profile';

let currentProfileId: number | null = null;
let currentRole: "contractor" | "client" | null = null;

export function setCurrentProfile(id: number, role: "contractor" | "client") {
  currentProfileId = id;
  currentRole = role;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id, role })).catch((err) => {
    console.log('Failed to persist profile:', err);
  });
}

export function getCurrentProfileId(): number | null {
  return currentProfileId;
}

export function getCurrentRole(): "contractor" | "client" | null {
  return currentRole;
}

export function clearCurrentProfile() {
  currentProfileId = null;
  currentRole = null;
  AsyncStorage.removeItem(STORAGE_KEY).catch((err) => {
    console.log('Failed to clear persisted profile:', err);
  });
}

// Called once at app startup (in _layout.tsx) to restore a phone-OTP login
// after the app was fully closed — phone-OTP users have no Supabase Auth
// session to fall back on, so this AsyncStorage copy is their only record.
export async function hydrateCurrentProfile(): Promise<{ id: number; role: "contractor" | "client" } | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.id && parsed?.role) {
      currentProfileId = parsed.id;
      currentRole = parsed.role;
      return parsed;
    }
    return null;
  } catch (err) {
    console.log('Failed to hydrate profile:', err);
    return null;
  }
}