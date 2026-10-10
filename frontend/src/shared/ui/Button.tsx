import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'quiet';

interface CommonProps {
  variant?: Variant;
  icon?: ReactNode;
  wide?: boolean;
}

function classes(variant: Variant, wide: boolean, extra?: string): string {
  return [styles.button, styles[variant], wide && styles.wide, extra].filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  icon,
  wide = false,
  className,
  children,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, wide, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/** A plain link styled as a button, e.g. for downloads. */
export function ButtonAnchor({
  variant = 'primary',
  icon,
  wide = false,
  className,
  children,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={classes(variant, wide, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}

/** A router link styled as a button. */
export function ButtonLink({
  variant = 'primary',
  icon,
  wide = false,
  className,
  children,
  ...rest
}: CommonProps & LinkProps) {
  return (
    <Link className={classes(variant, wide, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
