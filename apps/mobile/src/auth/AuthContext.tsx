import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@krishi/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setAuthFailureHandler } from '@/api/client';
import { api } from '@/api/endpoints';
import { clearTokens, loadTokens, saveTokens } from '@/api/tokens';
import type { User, VerifyOtpResponse } from '@/api/types';
import i18n, { detectDeviceLanguage, isLanguage } from '@/i18n';
import { registerForPushNotifications, unregisterPushToken } from '@/lib/push';
import { clearQueryCache, restoreQueryCache } from '@/lib/queryClient';

const LANGUAGE_KEY = 'ks.language';
const USER_KEY = 'ks.user';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  language: Language;
  /** False until the farmer has picked a language on this device. */
  languageChosen: boolean;
  /** Logged in but no name yet: show profile setup. */
  needsProfile: boolean;
  /** Changes the UI language; when signed in also saves it to the server unless `sync` is false. */
  chooseLanguage: (lang: Language, opts?: { sync?: boolean }) => Promise<void>;
  signIn: (res: VerifyOtpResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistUser(user: User | null): Promise<void> {
  try {
    if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>(detectDeviceLanguage());
  const [languageChosen, setLanguageChosen] = useState(false);
  const languageRef = useRef(language);
  languageRef.current = language;

  const setUser = useCallback((u: User) => {
    setUserState(u);
    void persistUser(u);
  }, []);

  /** Local logout: used both by the Logout button and when the session cannot be refreshed. */
  const resetSession = useCallback(async () => {
    await clearTokens();
    await persistUser(null);
    await clearQueryCache();
    setUserState(null);
    setStatus('signedOut');
  }, []);

  // Keep the server's language in step with the app's.
  const syncLanguage = useCallback(
    async (u: User | null, lang: Language) => {
      if (!u || u.language === lang) return;
      try {
        setUser(await api.farmer.update({ language: lang }));
      } catch {
        // Offline: will sync next time the language is changed or on next login.
      }
    },
    [setUser],
  );

  // Boot: restore language, cache, tokens and user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedLang, tokens, storedUser] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY).catch(() => null),
        loadTokens(),
        AsyncStorage.getItem(USER_KEY).catch(() => null),
      ]);
      if (isLanguage(storedLang)) {
        setLanguage(storedLang);
        setLanguageChosen(true);
        await i18n.changeLanguage(storedLang);
      }
      let cachedUser: User | null = null;
      try {
        cachedUser = storedUser ? (JSON.parse(storedUser) as User) : null;
      } catch {
        cachedUser = null;
      }

      if (!tokens) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      await restoreQueryCache();
      if (cachedUser) {
        if (cancelled) return;
        setUserState(cachedUser);
        setStatus('signedIn');
        // Refresh the profile in the background; offline is fine.
        api.auth
          .me()
          .then((fresh) => !cancelled && setUser(fresh))
          .catch(() => undefined);
        return;
      }
      try {
        const fresh = await api.auth.me();
        if (cancelled) return;
        setUser(fresh);
        setStatus('signedIn');
      } catch {
        if (!cancelled) await resetSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resetSession, setUser]);

  // The API client calls this when a refresh fails.
  useEffect(() => {
    setAuthFailureHandler(() => void resetSession());
    return () => setAuthFailureHandler(null);
  }, [resetSession]);

  // Register for push once per signed-in session.
  const pushDone = useRef(false);
  useEffect(() => {
    if (status !== 'signedIn') {
      pushDone.current = false;
      return;
    }
    if (pushDone.current) return;
    pushDone.current = true;
    void registerForPushNotifications();
  }, [status]);

  const chooseLanguage = useCallback(
    async (lang: Language, opts?: { sync?: boolean }) => {
      setLanguage(lang);
      setLanguageChosen(true);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_KEY, lang).catch(() => undefined);
      if (status === 'signedIn' && opts?.sync !== false) await syncLanguage(user, lang);
    },
    [status, user, syncLanguage],
  );

  const signIn = useCallback(
    async (res: VerifyOtpResponse) => {
      await saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setUser(res.user);
      setStatus('signedIn');
      // The language picked on this phone wins over what the server had.
      void syncLanguage(res.user, languageRef.current);
    },
    [setUser, syncLanguage],
  );

  const signOut = useCallback(async () => {
    const tokens = await loadTokens();
    await unregisterPushToken();
    if (tokens) await api.auth.logout(tokens.refreshToken).catch(() => undefined);
    await resetSession();
  }, [resetSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      language,
      languageChosen,
      needsProfile: status === 'signedIn' && !!user && !user.name?.trim(),
      chooseLanguage,
      signIn,
      signOut,
      setUser,
    }),
    [status, user, language, languageChosen, chooseLanguage, signIn, signOut, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
