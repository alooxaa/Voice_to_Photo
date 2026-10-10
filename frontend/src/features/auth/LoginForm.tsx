import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';

import { Button } from '../../shared/ui/Button';
import { Notice } from '../../shared/ui/Notice';
import { TextField } from '../../shared/ui/TextField';
import { authErrors, type FieldErrors } from './errors';
import styles from './AuthForm.module.css';
import { useAuth } from './store';

export function LoginForm() {
  const { t } = useTranslation();
  const login = useAuth((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const missing: FieldErrors = {};
    if (!username.trim()) missing.username = 'required';
    if (!password) missing.password = 'required';
    setErrors(missing);
    if (Object.keys(missing).length) return;

    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (error) {
      setErrors(authErrors(error));
      setBusy(false);
    }
  }

  const message = (field: string) => (errors[field] ? t(`errors.${errors[field]}`) : undefined);

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label={t('auth.username')}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        error={message('username')}
      />
      <TextField
        label={t('auth.password')}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        error={message('password')}
      />
      {errors.form && <Notice>{t(`errors.${errors.form}`)}</Notice>}
      <Button type="submit" wide disabled={busy} icon={<LogIn aria-hidden="true" />}>
        {busy ? t('auth.working') : t('auth.loginButton')}
      </Button>
    </form>
  );
}
