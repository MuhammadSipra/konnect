let currentProfileId: number | null = null;
let currentRole: "contractor" | "client" | null = null;
 
export function setCurrentProfile(id: number, role: "contractor" | "client") {
  currentProfileId = id;
  currentRole = role;
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
}
 






















