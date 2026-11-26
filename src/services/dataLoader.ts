import type { ExamData, StudyData, TestData } from '@/types';

let testDataCache: TestData | null = null;
let studyDataCache: StudyData | null = null;
let examDataCache: ExamData | null = null;

async function fetchJson<T>(url: string, bustCache = false): Promise<T> {
  const finalUrl = bustCache ? `${url}?t=${Date.now()}` : url;
  const res = await fetch(finalUrl, { cache: bustCache ? 'no-cache' : 'default' });
  if (!res.ok) {
    throw new Error(`No se pudo cargar ${url} (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function loadTestData(forceReload = false): Promise<TestData> {
  if (testDataCache && !forceReload) return testDataCache;
  testDataCache = await fetchJson<TestData>('/data/questions.json', forceReload);
  return testDataCache;
}

export async function loadStudyData(forceReload = false): Promise<StudyData> {
  if (studyDataCache && !forceReload) return studyDataCache;
  studyDataCache = await fetchJson<StudyData>('/data/study-cards.json', forceReload);
  return studyDataCache;
}

export async function loadExamData(forceReload = false): Promise<ExamData> {
  if (examDataCache && !forceReload) return examDataCache;
  examDataCache = await fetchJson<ExamData>('/data/exam-data.json', forceReload);
  return examDataCache;
}
