/** Preset category keys stored in task_templates.category */
export const PRESET_CATEGORY_KEYS = [
  'work',
  'learning',
  'social',
  'creative',
  'other',
] as const

export type PresetCategoryKey = (typeof PRESET_CATEGORY_KEYS)[number]

export const PRESET_CATEGORY_LABELS: Record<PresetCategoryKey, string> = {
  work: '工作',
  learning: '學習',
  social: '社交',
  creative: '創作',
  other: '其他',
}

/** Legacy keys from older app versions — still shown in badges */
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  reminder: '提醒事項',
  chores: '庶務',
  health: '健康',
  personal: '個人',
}

/** Main task groups on home (no separate reminder section in new IA) */
export const MAIN_TASK_CATEGORY_ORDER: PresetCategoryKey[] = [
  'work',
  'learning',
  'social',
  'creative',
  'other',
]

export function isPresetCategory(category: string): category is PresetCategoryKey {
  return (PRESET_CATEGORY_KEYS as readonly string[]).includes(category)
}

export function labelForCategory(category: string): string {
  if (isPresetCategory(category)) return PRESET_CATEGORY_LABELS[category]
  const legacy = LEGACY_CATEGORY_LABELS[category]
  if (legacy) return legacy
  return category.trim() || '自訂'
}

export const CUSTOM_CATEGORY_STYLE = {
  bg: 'bg-amber-100',
  text: 'text-amber-800',
} as const

export const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  work: { bg: 'bg-red-100', text: 'text-red-800' },
  learning: { bg: 'bg-yellow-100', text: 'text-yellow-900' },
  social: { bg: 'bg-orange-100', text: 'text-orange-800' },
  creative: { bg: 'bg-blue-100', text: 'text-blue-800' },
  other: { bg: 'bg-green-100', text: 'text-green-800' },
  reminder: { bg: 'bg-rose-100', text: 'text-rose-800' },
  chores: { bg: 'bg-slate-200', text: 'text-slate-700' },
  health: { bg: 'bg-green-100', text: 'text-green-700' },
  personal: { bg: 'bg-orange-100', text: 'text-orange-700' },
}

export const DEFAULT_CATEGORY_STYLE = {
  bg: 'bg-slate-100',
  text: 'text-slate-600',
}

export function styleForCategory(category: string): { bg: string; text: string } {
  if (!isPresetCategory(category)) {
    if (CATEGORY_STYLES[category]) return CATEGORY_STYLES[category]
    return CUSTOM_CATEGORY_STYLE
  }
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE
}

export const MAX_CUSTOM_CATEGORY_LEN = 40
