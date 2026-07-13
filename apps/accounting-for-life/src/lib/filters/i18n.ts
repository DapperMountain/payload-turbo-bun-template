import type { CustomTranslationKeys } from '@/lang/types'

import type { FilterFieldDefinition, FilterFieldOption } from './types'

type TranslateFn = (key: CustomTranslationKeys) => string

/** Payload returns the key when a translation is missing — treat that as a miss for fallback chains. */
export function translateFilterKey(t: TranslateFn, key: CustomTranslationKeys): string {
  const result = t(key)
  return result === key ? '' : result
}

export function translateFieldLabel(t: TranslateFn, field: FilterFieldDefinition): string {
  return translateFilterKey(t, field.labelKey) || field.id
}

export function translateOptionLabel(
  t: TranslateFn,
  option: FilterFieldOption,
): string {
  if (option.valueKey) {
    return translateFilterKey(t, option.valueKey) || option.value
  }

  return option.value
}

export function findSelectOption(
  field: FilterFieldDefinition | undefined,
  value: string,
): FilterFieldOption | undefined {
  return field?.options?.find((option) => option.value === value)
}
