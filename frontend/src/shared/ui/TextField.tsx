import { useId, type InputHTMLAttributes } from 'react';
import { Info } from 'lucide-react';

import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...input }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className={styles.error}>
          <Info aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
