import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingRole = 'contractor' | 'client';
const KEY = 'domexa_pending_role';
let pendingRole: PendingRole | null = null;

export async function setPendingRole(role: string) {
  const r: PendingRole = role === 'contractor' ? 'contractor' : 'client';
  pendingRole = r;
  try {
    await AsyncStorage.setItem(KEY, r);
  } catch {}
}

// Memory first. If the app was killed while the Google browser was open,
// fall back to the copy saved on disk.
export async function resolvePendingRole(): Promise<PendingRole | null> {
  if (pendingRole) return pendingRole;
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === 'contractor' || saved === 'client') {
      pendingRole = saved;
      return saved;
    }
  } catch {}
  return null;
}

export function getPendingRole(): PendingRole | null {
  return pendingRole;
}

export async function clearPendingRole() {
  pendingRole = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}