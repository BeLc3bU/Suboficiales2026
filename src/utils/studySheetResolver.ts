import type { StudyData, StudySheet } from '@/types';

export function resolveStudySheet(topicId: string | null | undefined, studyData: StudyData | null): StudySheet | null {
  if (!topicId || !studyData?.sheets) return null;
  const sheets = studyData.sheets;
  if (sheets[topicId]) return sheets[topicId];

  const lower = topicId.toLowerCase();
  const temaMatch = lower.match(/^(tema_\d+)/);
  if (temaMatch && sheets[temaMatch[1]]) {
    return sheets[temaMatch[1]];
  }
  if (lower.includes('pronombres')) {
    return sheets['tema_3'] || sheets['temario_unit1_pronombres'] || null;
  }
  return null;
}

export function getSrsCardKey(sheetTopicId: string, cardIndex: number): string {
  return `${sheetTopicId}::card_${cardIndex}`;
}
