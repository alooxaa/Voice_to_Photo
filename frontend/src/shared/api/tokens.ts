/** JWT storage. Tokens live in localStorage so a child stays logged in between visits. */

const ACCESS_KEY = 'dauys-foto.access';
const REFRESH_KEY = 'dauys-foto.refresh';

export interface Tokens {
  access: string;
  refresh: string;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  get access(): string | null {
    return read(ACCESS_KEY);
  },
  get refresh(): string | null {
    return read(REFRESH_KEY);
  },
  save({ access, refresh }: Tokens): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  saveAccess(access: string): void {
    localStorage.setItem(ACCESS_KEY, access);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
