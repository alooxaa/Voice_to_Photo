import styles from './Avatar.module.css';

export type AvatarColor = 'blue' | 'sun' | 'ink';

interface AvatarProps {
  name: string;
  color: AvatarColor;
  size?: 'small' | 'large';
}

export function Avatar({ name, color, size = 'small' }: AvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[color]} ${styles[size]}`} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
