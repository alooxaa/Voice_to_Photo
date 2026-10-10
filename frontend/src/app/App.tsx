import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router-dom';

import { useAuth } from '../features/auth/store';
import { router } from './router';

export function App() {
  const restore = useAuth((state) => state.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    // "user": when the system asks for reduced motion, movement is dropped and only fades remain.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
