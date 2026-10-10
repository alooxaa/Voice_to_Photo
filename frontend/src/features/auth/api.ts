import { api } from '../../shared/api/client';
import type { Tokens } from '../../shared/api/tokens';
import type { Language } from '../../shared/i18n';
import type { AvatarColor } from '../../shared/ui/Avatar';

export interface Profile {
  username: string;
  display_name: string;
  language: Language;
  avatar_color: AvatarColor;
  /** A grown-up has read that the AI studio sends photos to an external service. */
  ai_notice_accepted: boolean;
}

export interface RegisterData {
  display_name: string;
  username: string;
  password: string;
  password_repeat: string;
  language: Language;
}

export const authApi = {
  login: (username: string, password: string) =>
    api<Tokens>('auth/login/', { method: 'POST', body: { username, password }, anonymous: true }),

  register: (data: RegisterData) =>
    api<Tokens & { profile: Profile }>('auth/register/', {
      method: 'POST',
      body: { ...data },
      anonymous: true,
    }),

  me: () => api<Profile>('auth/me/'),

  updateMe: (patch: Partial<Omit<Profile, 'username'>>) =>
    api<Profile>('auth/me/', { method: 'PATCH', body: patch }),
};
