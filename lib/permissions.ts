// Centralized configuration for feature unlocking via RPG attributes
export type FeatureId =
  | 'focus_timer'
  | 'analysis_page'
  | 'correlations_widget'
  | 'hardcore_mode'

export interface FeatureRequirement {
  attribute: string // e.g., 'intellect', 'discipline', 'focus'
  level: number
}

// Map of feature IDs to their minimum RPG level requirements
export const FEATURE_LOCKS: Record<FeatureId, FeatureRequirement> = {
  // Requires consistent intellect/learning habits
  analysis_page: { attribute: 'intellect', level: 1 },
  correlations_widget: { attribute: 'intellect', level: 3 },

  // Requires consistent focus/deep work habits
  focus_timer: { attribute: 'focus', level: 2 },

  // Requires extreme consistency
  hardcore_mode: { attribute: 'discipline', level: 5 },
}

// Helper: Pass the user's attributes map, get back true if they meet the req
export function canAccessFeature(
  feature: FeatureId,
  userAttributes: Record<string, { xp: number; level: number }> | undefined
): boolean {
  if (!userAttributes) return false // Fail safe

  const req = FEATURE_LOCKS[feature]
  const userAttr = userAttributes[req.attribute]

  if (!userAttr) return false // They haven't earned any XP in this attribute yet
  return userAttr.level >= req.level
}
