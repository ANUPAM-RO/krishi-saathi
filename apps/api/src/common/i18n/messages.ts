import type { Language } from '@prisma/client';

/** Server-generated notification text. Clients localise everything else. */
const messages = {
  activityDueToday: {
    en: { title: 'Today: {activity}', body: '{crop} on {farm}. Open the app to see the steps.' },
    hi: { title: 'आज: {activity}', body: '{farm} पर {crop}। तरीका देखने के लिए ऐप खोलें।' },
    bn: { title: 'আজ: {activity}', body: '{farm}-এ {crop}। কী করতে হবে দেখতে অ্যাপ খুলুন।' },
  },
  activityDueTomorrow: {
    en: { title: 'Tomorrow: {activity}', body: '{crop} on {farm}. Get ready for tomorrow’s work.' },
    hi: { title: 'कल: {activity}', body: '{farm} पर {crop}। कल के काम की तैयारी करें।' },
    bn: { title: 'আগামীকাল: {activity}', body: '{farm}-এ {crop}। আগামীকালের কাজের জন্য তৈরি থাকুন।' },
  },
  heavyRain: {
    en: {
      title: 'Heavy rain expected tomorrow',
      body: 'Around {rain} mm of rain ({prob}% chance) near {place}. Avoid spraying and fertilizer tomorrow and check field drainage.',
    },
    hi: {
      title: 'कल भारी बारिश की संभावना',
      body: '{place} के पास लगभग {rain} मिमी बारिश ({prob}% संभावना)। कल छिड़काव और खाद न डालें, खेत की नाली देख लें।',
    },
    bn: {
      title: 'আগামীকাল ভারী বৃষ্টির সম্ভাবনা',
      body: '{place}-এর কাছে প্রায় {rain} মিমি বৃষ্টি ({prob}% সম্ভাবনা)। আগামীকাল স্প্রে বা সার দেবেন না, জমির জল নিকাশি দেখে নিন।',
    },
  },
} as const;

export type MessageKey = keyof typeof messages;

export function renderMessage(
  key: MessageKey,
  language: Language,
  vars: Record<string, string | number>,
): { title: string; body: string } {
  const template = messages[key][language] ?? messages[key].en;
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
  return { title: fill(template.title), body: fill(template.body) };
}

/** Picks the localised variant of a field: nameBn / nameHi / name. */
export function pickLocalized<T extends Record<string, unknown>>(item: T, field: string, language: Language): string {
  const suffix = language === 'bn' ? 'Bn' : language === 'hi' ? 'Hi' : '';
  return String(item[`${field}${suffix}`] ?? item[field] ?? '');
}
