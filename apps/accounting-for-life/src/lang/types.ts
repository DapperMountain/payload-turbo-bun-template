import type { NestedKeysStripped } from '@payloadcms/translations'
import { enTranslations } from '@payloadcms/translations/languages/en'

import en from './en'

/** English UI strings merged with Payload's built-in admin translations (for `t()` typing). */
export type CustomTranslationsObject = typeof enTranslations & typeof en

export type CustomTranslationKeys = NestedKeysStripped<CustomTranslationsObject>
