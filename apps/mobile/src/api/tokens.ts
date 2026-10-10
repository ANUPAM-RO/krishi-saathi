import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'ks.accessToken';
const REFRESH_KEY = 'ks.refreshToken';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// In-memory copy so every request does not hit the keystore.
let cache: Tokens | null | undefined;

export async function loadTokens(): Promise<Tokens | null> {
  if (cache !== undefined) return cache;
  try {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  cache = tokens;
  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    ]);
  } catch {
    // Keystore failure: keep the in-memory session for this run.
  }
}

export async function clearTokens(): Promise<void> {
  cache = null;
  try {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  } catch {
    // ignore
  }
}
