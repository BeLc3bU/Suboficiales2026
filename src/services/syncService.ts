import type { ActiveQuiz, HistoryEntry, SrsMap, SyncPayload, ThemeMode } from '@/types';

const LS_KEYS = {
  theme: 'patronato_theme',
  favorites: 'patronato_favorites',
  errors: 'patronato_errors',
  history: 'patronato_history',
  srs: 'patronato_srs',
  activeQuiz: 'patronato_active_quiz',
  activeQuizUpdatedAt: 'patronato_active_quiz_updated_at',
  profileCode: 'patronato_profile_code',
} as const;

export function getProfileCode(): string {
  const raw = localStorage.getItem(LS_KEYS.profileCode) || 'master';
  return normalizeProfileCode(raw);
}

export function setProfileCode(code: string): string {
  const normalized = normalizeProfileCode(code);
  localStorage.setItem(LS_KEYS.profileCode, normalized);
  return normalized;
}

export function normalizeProfileCode(code: string): string {
  const cleaned = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return cleaned || 'master';
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function collectLocalData(): SyncPayload {
  const activeQuiz = safeParse<ActiveQuiz | null>(localStorage.getItem(LS_KEYS.activeQuiz), null);
  const activeQuizUpdatedAt = parseInt(localStorage.getItem(LS_KEYS.activeQuizUpdatedAt) || '0', 10) || 0;
  const themeRaw = localStorage.getItem(LS_KEYS.theme);

  return {
    version: 3,
    theme: themeRaw === 'dark' ? 'dark' : 'light',
    favorites: safeParse<string[]>(localStorage.getItem(LS_KEYS.favorites), []),
    errors: safeParse<string[]>(localStorage.getItem(LS_KEYS.errors), []),
    history: safeParse<HistoryEntry[]>(localStorage.getItem(LS_KEYS.history), []),
    srs: safeParse<SrsMap>(localStorage.getItem(LS_KEYS.srs), {}),
    activeQuiz,
    activeQuizUpdatedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function applyLocalData(data: Partial<SyncPayload>): void {
  if (Array.isArray(data.favorites)) {
    localStorage.setItem(LS_KEYS.favorites, JSON.stringify(data.favorites));
  }
  if (Array.isArray(data.errors)) {
    localStorage.setItem(LS_KEYS.errors, JSON.stringify(data.errors));
  }
  if (Array.isArray(data.history)) {
    localStorage.setItem(LS_KEYS.history, JSON.stringify(data.history));
  }
  if (data.srs && typeof data.srs === 'object') {
    localStorage.setItem(LS_KEYS.srs, JSON.stringify(data.srs));
  }
  if (data.theme === 'dark' || data.theme === 'light') {
    localStorage.setItem(LS_KEYS.theme, data.theme);
  }
  if (data.activeQuizUpdatedAt !== undefined) {
    localStorage.setItem(LS_KEYS.activeQuizUpdatedAt, String(data.activeQuizUpdatedAt));
    if (data.activeQuiz) {
      localStorage.setItem(LS_KEYS.activeQuiz, JSON.stringify(data.activeQuiz));
    } else {
      localStorage.removeItem(LS_KEYS.activeQuiz);
    }
  }
}

function getHistoryKey(h: HistoryEntry): string {
  if (h.date && h.title) return `${h.date}_${h.title}_${h.total ?? ''}`;
  return h.id || `${h.title ?? ''}_${h.score ?? ''}`;
}

export function mergeSyncPayloads(local: SyncPayload, remote: Partial<SyncPayload> | null): SyncPayload {
  if (!remote) return local;

  const favSet = new Set([...(local.favorites || []), ...(remote.favorites || [])]);
  const errSet = new Set([...(local.errors || []), ...(remote.errors || [])]);

  const historyMap = new Map<string, HistoryEntry>();
  [...(local.history || []), ...(remote.history || [])].forEach((h) => {
    if (!h) return;
    const key = getHistoryKey(h);
    if (!key) return;
    const existing = historyMap.get(key);
    if (!existing) {
      historyMap.set(key, { ...h });
    } else {
      const best = { ...existing };
      if (!best.id && h.id) best.id = h.id;
      if ((!best.questionsReview || best.questionsReview.length === 0) && h.questionsReview?.length) {
        best.questionsReview = h.questionsReview;
      }
      historyMap.set(key, best);
    }
  });

  const mergedHistory = Array.from(historyMap.values()).sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );

  const localQuizTime = local.activeQuizUpdatedAt || local.activeQuiz?.savedAt || 0;
  const remoteQuizTime = remote.activeQuizUpdatedAt || remote.activeQuiz?.savedAt || 0;

  let mergedActiveQuiz = local.activeQuiz;
  let mergedActiveQuizUpdatedAt = localQuizTime;

  if (remoteQuizTime > localQuizTime) {
    mergedActiveQuiz = remote.activeQuiz ?? null;
    mergedActiveQuizUpdatedAt = remoteQuizTime;
  }

  return {
    version: 3,
    theme: (local.theme || remote.theme || 'light') as ThemeMode,
    favorites: Array.from(favSet),
    errors: Array.from(errSet),
    history: mergedHistory,
    srs: { ...(remote.srs || {}), ...(local.srs || {}) },
    activeQuiz: mergedActiveQuiz,
    activeQuizUpdatedAt: mergedActiveQuizUpdatedAt,
    updatedAt: new Date().toISOString(),
  };
}

function buildProgressEndpoint(profileCode: string): string[] {
  const q = profileCode && profileCode !== 'master' ? `?profile=${encodeURIComponent(profileCode)}` : '';
  return [`/api/progress${q}`, `http://127.0.0.1:8080/api/progress${q}`];
}

export async function fetchCloudProgress(profileCode = getProfileCode()): Promise<Partial<SyncPayload> | null> {
  const endpoints = buildProgressEndpoint(profileCode);
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { method: 'GET', cache: 'no-cache' });
      if (res.ok) {
        const json = (await res.json()) as { data?: Partial<SyncPayload> | null };
        if (json?.data) return json.data;
      }
    } catch {
      // Probar siguiente endpoint
    }
  }
  return null;
}

export async function pushCloudProgress(payload: SyncPayload, profileCode = getProfileCode()): Promise<boolean> {
  const endpoints = buildProgressEndpoint(profileCode);
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
    } catch {
      // Probar siguiente endpoint
    }
  }
  return false;
}
