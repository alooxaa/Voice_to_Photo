import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

import styles from './Notice.module.css';

/** A calm message box for problems. It stays until the situation changes. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      <Info aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
