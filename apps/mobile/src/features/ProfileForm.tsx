import type { Language } from '@krishi/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUpdateProfile } from '@/api/hooks';
import type { User } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, FormError, TextField } from '@/components';
import { LANGUAGE_NATIVE_NAMES, LANGUAGE_ORDER } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/theme';

export const DEFAULT_STATE = 'West Bengal';

export function ProfileForm({ submitLabel, onSaved }: { submitLabel: string; onSaved: (user: User) => void }) {
  const { t } = useTranslation();
  const { user, language, setUser, chooseLanguage } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [village, setVillage] = useState(user?.village ?? '');
  const [district, setDistrict] = useState(user?.district ?? '');
  const [state, setState] = useState(user?.state || DEFAULT_STATE);
  const [lang, setLang] = useState<Language>(language);
  const [nameError, setNameError] = useState<string | null>(null);
  const mutation = useUpdateProfile();

  const submit = () => {
    if (!name.trim()) {
      setNameError(t('errors.required'));
      return;
    }
    setNameError(null);
    mutation.mutate(
      {
        name: name.trim(),
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || DEFAULT_STATE,
        language: lang,
      },
      {
        onSuccess: async (updated) => {
          setUser(updated);
          // The PUT above already saved the language on the server.
          if (lang !== language) await chooseLanguage(lang, { sync: false });
          onSaved(updated);
        },
      },
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t('profile.name')}
        placeholder={t('profile.namePlaceholder')}
        value={name}
        onChangeText={setName}
        error={nameError}
        autoCapitalize="words"
        textContentType="name"
        returnKeyType="next"
      />
      <TextField
        label={t('profile.village')}
        optionalLabel={t('common.optional')}
        value={village}
        onChangeText={setVillage}
        autoCapitalize="words"
      />
      <TextField
        label={t('profile.district')}
        optionalLabel={t('common.optional')}
        value={district}
        onChangeText={setDistrict}
        autoCapitalize="words"
      />
      <TextField label={t('profile.state')} value={state} onChangeText={setState} autoCapitalize="words" />
      <Chips
        label={t('profile.language')}
        value={lang}
        onChange={setLang}
        options={LANGUAGE_ORDER.map((l) => ({ value: l, label: LANGUAGE_NATIVE_NAMES[l] }))}
      />
      <FormError message={mutation.isError ? errorMessage(mutation.error, t) : null} />
      <Button title={submitLabel} icon="checkmark" onPress={submit} loading={mutation.isPending} />
    </View>
  );
}
