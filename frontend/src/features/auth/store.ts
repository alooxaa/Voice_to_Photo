import { create } from 'zustand';

import { handleSessionExpired } from '../../shared/api/client';
import { tokens } from '../../shared/api/tokens';
import { setLanguage, type Language } from '../../shared/i18n';
import { authApi, type Profile, type RegisterData } from './api';

interface AuthState {
  profile: Profile | null;
  /** "checking" while a saved session is being restored on start-up. */
  status: 'checking' | 'guest' | 'signedIn';
  restore: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<Omit<Profile, 'username'>>) => Promise<void>;
  /** Switch the interface language; when signed in, also remember it in the profile. */
  changeLanguage: (language: Language) => void;
}

export const useAuth = create<AuthState>((set, get) => {
  function signIn(profile: Profile) {
    setLanguage(profile.language);
    set({ profile, status: 'signedIn' });
  }

  return {
    profile: null,
    status: tokens.refresh ? 'checking' : 'guest',

    async restore() {
      if (!tokens.refresh) return set({ status: 'guest' });
      try {
        signIn(await authApi.me());
      } catch {
        tokens.clear();
        set({ profile: null, status: 'guest' });
      }
    },

    async login(username, password) {
      tokens.save(await authApi.login(username, password));
      signIn(await authApi.me());
    },

    async register(data) {
      const { profile, ...newTokens } = await authApi.register(data);
      tokens.save(newTokens);
      signIn(profile);
    },

    logout() {
      tokens.clear();
      set({ profile: null, status: 'guest' });
    },

    async updateProfile(patch) {
      set({ profile: await authApi.updateMe(patch) });
    },

    changeLanguage(language) {
      setLanguage(language);
      const { profile } = get();
      if (profile && profile.language !== language) {
        set({ profile: { ...profile, language } });
        // Remembering the choice is a convenience; the switch already happened.
        authApi.updateMe({ language }).catch(() => {});
      }
    },
  };
});

handleSessionExpired(() => useAuth.getState().logout());
