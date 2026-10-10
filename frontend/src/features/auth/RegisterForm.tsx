import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';

import { currentLanguage } from '../../shared/i18n';
import { Button } from '../../shared/ui/Button';
import { Notice } from '../../shared/ui/Notice';
import { TextField } from '../../shared/ui/TextField';
import { authErrors, type FieldErrors } from './errors';
import styles from './AuthForm.module.css';
import { useAuth } from './store';

const EMPTY = { display_name: '', username: '', password: '', password_repeat: '' };
type Field = keyof typeof EMPTY;

export function RegisterForm() {
  const { t } = useTranslation();
  const register = useAuth((state) => state.register);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  function field(name: Field) {
    return {
      value: values[name],
      onChange: (event: { target: { value: string } }) =>
        setValues((old) => ({ ...old, [name]: event.target.value })),
      error: errors[name] ? t(`errors.${errors[name]}`) : undefined,
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: FieldErrors = {};
    for (const name of Object.keys(EMPTY) as Field[]) {
      if (!values[name].trim()) found[name] = 'required';
    }
    if (!found.password && values.password.length < 6) found.password = 'password_short';
    if (!found.password_repeat && values.password !== values.password_repeat) {
      found.password_repeat = 'passwords_differ';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await register({
        ...values,
        display_name: values.display_name.trim(),
        username: values.username.trim(),
        language: currentLanguage(),
      });
    } catch (error) {
      setErrors(authErrors(error));
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label={t('auth.displayName')}
        autoComplete="given-name"
        {...field('display_name')}
      />
      <TextField
        label={t('auth.username')}
        autoComplete="username"
        autoCapitalize="none"
        {...field('username')}
      />
      <TextField
        label={t('auth.password')}
        type="password"
        autoComplete="new-password"
        {...field('password')}
      />
      <TextField
        label={t('auth.passwordRepeat')}
        type="password"
        autoComplete="new-password"
        {...field('password_repeat')}
      />
      {errors.form && <Notice>{t(`errors.${errors.form}`)}</Notice>}
      <Button type="submit" wide disabled={busy} icon={<UserPlus aria-hidden="true" />}>
        {busy ? t('auth.working') : t('auth.registerButton')}
      </Button>
    </form>
  );
}
