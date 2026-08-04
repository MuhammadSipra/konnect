let pendingRole: string | null = null;

export function setPendingRole(role: string) {
  pendingRole = role;
}

export function getPendingRole(): string {
  return pendingRole || "client";
}