import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './store';

/** Pages inside are only for signed-in children; others go to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((state) => state.status);
  const location = useLocation();

  if (status === 'checking') return null;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** Login and register pages are pointless when already signed in. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const status = useAuth((state) => state.status);
  if (status === 'checking') return null;
  if (status === 'signedIn') return <Navigate to="/" replace />;
  return children;
}
