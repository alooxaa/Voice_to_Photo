import { tokens } from './tokens';

/** An HTTP error from the backend, with its parsed JSON body when there is one. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** The backend could not be reached at all (server stopped, no network). */
export class NetworkError extends Error {}

type Body = FormData | Record<string, unknown>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Body;
  /** Send without the access token (login, register). */
  anonymous?: boolean;
}

let onSessionExpired: () => void = () => {};

/** Called when the refresh token is no longer valid, so the app can log out. */
export function handleSessionExpired(callback: () => void): void {
  onSessionExpired = callback;
}

// Several requests may fail with 401 at the same moment; they share one refresh.
let refreshing: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  refreshing ??= (async () => {
    const refresh = tokens.refresh;
    if (!refresh) return false;
    try {
      const response = await fetch('/api/auth/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { access: string };
      tokens.saveAccess(data.access);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (!options.anonymous && tokens.access) {
    headers.Authorization = `Bearer ${tokens.access}`;
  }

  try {
    return await fetch(`/api/${path}`, { method: options.method ?? 'GET', headers, body });
  } catch {
    throw new NetworkError();
  }
}

/** Call the backend API. Paths are relative to /api/, e.g. `photos/`. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  if (response.status === 401 && !options.anonymous) {
    if (await refreshAccessToken()) {
      response = await send(path, options);
    } else {
      tokens.clear();
      onSessionExpired();
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
  // A server error without JSON means the Vite proxy could not reach Django.
  if (response.status >= 500 && !isJson) throw new NetworkError();

  const data: unknown = isJson ? await response.json() : null;
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}
