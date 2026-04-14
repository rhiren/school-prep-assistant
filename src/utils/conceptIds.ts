const LEGACY_CONCEPT_ID_MAP = {
  "concept-unit-rate": "concept-unit-rates",
} as const;

export function normalizeConceptId(conceptId: string | null | undefined): string | null {
  if (!conceptId) {
    return null;
  }

  return LEGACY_CONCEPT_ID_MAP[conceptId as keyof typeof LEGACY_CONCEPT_ID_MAP] ?? conceptId;
}

export function normalizeConceptIds(conceptIds: string[]): string[] {
  return conceptIds.map((conceptId) => normalizeConceptId(conceptId) ?? conceptId);
}
