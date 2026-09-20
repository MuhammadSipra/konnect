let pendingAccessToken: string | null = null;
let pendingRefreshToken: string | null = null;

export function setPendingGoogleTokens(accessToken: string, refreshToken: string) {
  pendingAccessToken = accessToken;
  pendingRefreshToken = refreshToken;
}

export function getPendingGoogleTokens(): { accessToken: string; refreshToken: string } | null {
  if (!pendingAccessToken || !pendingRefreshToken) return null;
  return { accessToken: pendingAccessToken, refreshToken: pendingRefreshToken };
}

export function clearPendingGoogleTokens() {
  pendingAccessToken = null;
  pendingRefreshToken = null;
}