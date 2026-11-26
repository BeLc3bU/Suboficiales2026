import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadExamData, loadStudyData, loadTestData } from '@/services/dataLoader';
import {
  applyLocalData,
  collectLocalData,
  fetchCloudProgress,
  getProfileCode,
  mergeSyncPayloads,
  pushCloudProgress,
  setProfileCode as persistProfileCode,
} from '@/services/syncService';
import type {
  ActiveQuiz,
  AppView,
  ExamData,
  HistoryEntry,
  Question,
  QuestionReview,
  QuizMode,
  SrsMap,
  SrsStatus,
  StudyData,
  SyncStatus,
  TestData,
  ThemeMode,
  Topic,
} from '@/types';
import { generateOfficialExam } from '@/utils/examGenerator';
import { checkTextAnswer } from '@/utils/mistakeExplainer';

export interface TopicProgressSummary {
  practice: {
    completed: boolean;
    isPaused: boolean;
    count: number;
    bestScore: number | null;
  };
  exam: {
    completed: boolean;
    isPaused: boolean;
    count: number;
    passed: boolean;
    bestScore: number | null;
  };
  masteryPct: number;
}

export function useAppState() {
  const [testData, setTestData] = useState<TestData | null>(null);
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const initialLocal = useMemo(() => collectLocalData(), []);
  const [theme, setThemeState] = useState<ThemeMode>(initialLocal.theme);
  const [favorites, setFavorites] = useState<string[]>(initialLocal.favorites);
  const [errors, setErrors] = useState<string[]>(initialLocal.errors);
  const [history, setHistory] = useState<HistoryEntry[]>(initialLocal.history);
  const [srs, setSrs] = useState<SrsMap>(initialLocal.srs);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(initialLocal.activeQuiz);
  const [profileCode, setProfileCodeState] = useState<string>(() => getProfileCode());

  const [view, setView] = useState<AppView>('dashboard');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedStudyTopicId, setSelectedStudyTopicId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [latestResults, setLatestResults] = useState<HistoryEntry | null>(null);

  const saveTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Aplicar tema claro / oscuro en <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
    localStorage.setItem('patronato_theme', theme);
  }, [theme]);

  const scheduleCloudSave = useCallback(
    (codeOverride?: string) => {
      setSyncStatus('saving');
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(async () => {
        const ok = await pushCloudProgress(collectLocalData(), codeOverride ?? getProfileCode());
        setSyncStatus(ok ? 'saved' : 'offline');
      }, 600);
    },
    [],
  );

  // Cargar JSON bajo demanda al iniciar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tData, sData] = await Promise.all([loadTestData(), loadStudyData()]);
        if (!mounted) return;
        setTestData(tData);
        setStudyData(sData);
        setIsLoadingData(false);
        // Precargar examData en segundo plano sin bloquear la primera vista
        loadExamData().then((eData) => {
          if (mounted) setExamData(eData);
        }).catch(() => {});
      } catch (err) {
        if (!mounted) return;
        setDataError(err instanceof Error ? err.message : 'Error cargando datos.');
        setIsLoadingData(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sincronización inicial en la nube
  const syncWithCloud = useCallback(
    async (codeOverride?: string) => {
      const code = codeOverride ?? getProfileCode();
      setSyncStatus('loading');
      try {
        const remote = await fetchCloudProgress(code);
        const local = collectLocalData();
        if (remote) {
          const merged = mergeSyncPayloads(local, remote);
          applyLocalData(merged);
          setThemeState(merged.theme);
          setFavorites(merged.favorites);
          setErrors(merged.errors);
          setHistory(merged.history);
          setSrs(merged.srs);
          setActiveQuiz(merged.activeQuiz);
          setSyncStatus('saved');
        } else {
          if (local.history.length > 0 || local.favorites.length > 0 || local.errors.length > 0 || local.activeQuiz) {
            const ok = await pushCloudProgress(local, code);
            setSyncStatus(ok ? 'saved' : 'offline');
          } else {
            setSyncStatus('saved');
          }
        }
      } catch {
        setSyncStatus('offline');
      }
    },
    [],
  );

  useEffect(() => {
    syncWithCloud();
    const onOnline = () => syncWithCloud();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [syncWithCloud]);

  // Temporizador automático en modo examen
  useEffect(() => {
    if (view !== 'quiz' || !activeQuiz || activeQuiz.isFinished || activeQuiz.mode !== 'exam') return;
    const id = window.setInterval(() => {
      setActiveQuiz((prev) => {
        if (!prev || prev.isFinished) return prev;
        const next = { ...prev, elapsedSeconds: prev.elapsedSeconds + 1, savedAt: Date.now() };
        if (next.elapsedSeconds % 5 === 0) {
          localStorage.setItem('patronato_active_quiz', JSON.stringify(next));
          localStorage.setItem('patronato_active_quiz_updated_at', String(next.savedAt));
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [view, activeQuiz?.isFinished, activeQuiz?.mode]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('patronato_theme', next);
      scheduleCloudSave();
      return next;
    });
  }, [scheduleCloudSave]);

  const changeProfileCode = useCallback(
    async (newCode: string) => {
      const normalized = persistProfileCode(newCode);
      setProfileCodeState(normalized);
      await syncWithCloud(normalized);
      showToast(`Perfil activo: ${normalized}`);
    },
    [showToast, syncWithCloud],
  );

  const allQuestions = useMemo<Question[]>(() => {
    if (!testData?.topics) return [];
    const list: Question[] = [];
    for (const t of testData.topics) {
      for (const q of t.questions || []) {
        list.push({ ...q, topicTitle: t.title, topicBadge: t.badge });
      }
    }
    return list;
  }, [testData]);

  const getQuestionById = useCallback(
    (qId: string): Question | null => allQuestions.find((q) => q.id === qId) ?? null,
    [allQuestions],
  );

  const persistActiveQuiz = useCallback((quiz: ActiveQuiz | null) => {
    const now = Date.now();
    if (quiz) {
      const withTime = { ...quiz, savedAt: now };
      localStorage.setItem('patronato_active_quiz', JSON.stringify(withTime));
      localStorage.setItem('patronato_active_quiz_updated_at', String(now));
      setActiveQuiz(withTime);
    } else {
      localStorage.removeItem('patronato_active_quiz');
      localStorage.setItem('patronato_active_quiz_updated_at', String(now));
      setActiveQuiz(null);
    }
  }, []);

  const startQuizSession = useCallback(
    (params: {
      topicId: string | null;
      title: string;
      badge: string;
      mode: QuizMode;
      questions: Question[];
      isOfficialMock?: boolean;
      timeLimitMinutes?: number | null;
      totalTimeSeconds?: number | null;
    }) => {
      const nextQuiz: ActiveQuiz = {
        topicId: params.topicId,
        title: params.title,
        badge: params.badge,
        mode: params.mode,
        questions: params.questions,
        currentIndex: 0,
        userAnswers: {},
        interactiveChecked: {},
        isFinished: false,
        startTime: Date.now(),
        elapsedSeconds: 0,
        isOfficialMock: Boolean(params.isOfficialMock),
        timeLimitMinutes: params.timeLimitMinutes ?? null,
        totalTimeSeconds: params.totalTimeSeconds ?? null,
      };
      persistActiveQuiz(nextQuiz);
      scheduleCloudSave();
      setView('quiz');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [persistActiveQuiz, scheduleCloudSave],
  );

  const startTopicQuiz = useCallback(
    (topic: Topic, mode: QuizMode) => {
      if (!topic.questions?.length) {
        showToast('Este tema no contiene preguntas disponibles.');
        return;
      }
      startQuizSession({
        topicId: topic.id,
        title: topic.title,
        badge: topic.badge || 'Tema',
        mode,
        questions: topic.questions.map((q) => ({ ...q, topicTitle: topic.title, topicBadge: topic.badge })),
      });
    },
    [showToast, startQuizSession],
  );

  const startOfficialMockExam = useCallback(async () => {
    try {
      const eData = examData ?? (await loadExamData());
      if (!examData) setExamData(eData);
      const exam = generateOfficialExam(eData);
      startQuizSession(exam);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error generando simulacro oficial.');
    }
  }, [examData, showToast, startQuizSession]);

  const startGlobalExam = useCallback(
    (count: number) => {
      if (!allQuestions.length) {
        showToast('No hay preguntas disponibles.');
        return;
      }
      const selected = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, Math.min(count, allQuestions.length));
      startQuizSession({
        topicId: 'global_exam',
        title: `Simulacro General (${selected.length} preguntas)`,
        badge: 'Simulacro',
        mode: 'exam',
        questions: selected,
      });
    },
    [allQuestions, showToast, startQuizSession],
  );

  const startSmartReview = useCallback(
    (count = 25) => {
      if (!allQuestions.length) return;
      const target = Math.min(count, allQuestions.length);
      const errorSet = new Set(errors);
      const seenSet = new Set<string>();
      history.forEach((h) => h.questionsReview?.forEach((qr) => qr.id && !qr.isBlank && seenSet.add(qr.id)));

      const shuffleArr = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
      const priorityErrors = shuffleArr(allQuestions.filter((q) => errorSet.has(q.id)));
      const priorityUnseen = shuffleArr(allQuestions.filter((q) => !errorSet.has(q.id) && !seenSet.has(q.id)));
      const restSeen = shuffleArr(allQuestions.filter((q) => !errorSet.has(q.id) && seenSet.has(q.id)));

      const selected = [...priorityErrors, ...priorityUnseen, ...restSeen].slice(0, target);
      const errCount = selected.filter((q) => errorSet.has(q.id)).length;
      const unseenCount = selected.filter((q) => !errorSet.has(q.id) && !seenSet.has(q.id)).length;

      startQuizSession({
        topicId: 'smart_review',
        title: `Repaso Inteligente (${errCount} fallos, ${unseenCount} nuevas)`,
        badge: 'Repaso IA',
        mode: 'practice',
        questions: selected,
      });
    },
    [allQuestions, errors, history, startQuizSession],
  );

  const startErrorsQuiz = useCallback(() => {
    const errorQuestions = allQuestions.filter((q) => errors.includes(q.id));
    if (!errorQuestions.length) {
      showToast('No tienes fallos pendientes en tu banco de errores.');
      return;
    }
    startQuizSession({
      topicId: 'errors_quiz',
      title: `Repaso de Fallos (${errorQuestions.length} preguntas)`,
      badge: 'Fallos',
      mode: 'practice',
      questions: errorQuestions,
    });
  }, [allQuestions, errors, showToast, startQuizSession]);

  const startFavsQuiz = useCallback(() => {
    const favQuestions = allQuestions.filter((q) => favorites.includes(q.id));
    if (!favQuestions.length) {
      showToast('Aún no has marcado preguntas favoritas.');
      return;
    }
    startQuizSession({
      topicId: 'favs_quiz',
      title: `Preguntas Guardadas (${favQuestions.length} preguntas)`,
      badge: 'Favoritas',
      mode: 'practice',
      questions: favQuestions,
    });
  }, [allQuestions, favorites, showToast, startQuizSession]);

  const updateErrorsState = useCallback((qId: string, isCorrect: boolean) => {
    setErrors((prev) => {
      const next = isCorrect ? prev.filter((id) => id !== qId) : prev.includes(qId) ? prev : [...prev, qId];
      localStorage.setItem('patronato_errors', JSON.stringify(next));
      return next;
    });
  }, []);

  const answerCurrentQuestion = useCallback(
    (q: Question, answerValue: string, isInteractive = false) => {
      setActiveQuiz((prev) => {
        if (!prev) return prev;
        const next: ActiveQuiz = {
          ...prev,
          userAnswers: { ...prev.userAnswers, [q.id]: answerValue },
          interactiveChecked: isInteractive
            ? { ...prev.interactiveChecked, [q.id]: true }
            : prev.interactiveChecked,
          savedAt: Date.now(),
        };
        localStorage.setItem('patronato_active_quiz', JSON.stringify(next));
        localStorage.setItem('patronato_active_quiz_updated_at', String(next.savedAt));
        return next;
      });

      if (activeQuiz?.mode === 'practice') {
        const isCorrect =
          q.type === 'choice' ? answerValue === q.answer : checkTextAnswer(answerValue, q.answer);
        updateErrorsState(q.id, isCorrect);
      }
      scheduleCloudSave();
    },
    [activeQuiz?.mode, scheduleCloudSave, updateErrorsState],
  );

  const revealInteractiveQuestion = useCallback(
    (qId: string) => {
      setActiveQuiz((prev) => {
        if (!prev) return prev;
        const next: ActiveQuiz = {
          ...prev,
          interactiveChecked: { ...prev.interactiveChecked, [qId]: true },
          savedAt: Date.now(),
        };
        localStorage.setItem('patronato_active_quiz', JSON.stringify(next));
        return next;
      });
      updateErrorsState(qId, false);
      scheduleCloudSave();
    },
    [scheduleCloudSave, updateErrorsState],
  );

  const setQuestionIndex = useCallback(
    (index: number) => {
      setActiveQuiz((prev) => {
        if (!prev) return prev;
        const clamped = Math.max(0, Math.min(prev.questions.length - 1, index));
        const next = { ...prev, currentIndex: clamped, savedAt: Date.now() };
        localStorage.setItem('patronato_active_quiz', JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const toggleFavorite = useCallback(
    (qId: string) => {
      setFavorites((prev) => {
        const next = prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId];
        localStorage.setItem('patronato_favorites', JSON.stringify(next));
        return next;
      });
      scheduleCloudSave();
    },
    [scheduleCloudSave],
  );

  const finishQuiz = useCallback(() => {
    if (!activeQuiz) return;
    const total = activeQuiz.questions.length;
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let part1Correct = 0;
    let part2Correct = 0;

    const updatedErrors = new Set(errors);

    const questionsReview: QuestionReview[] = activeQuiz.questions.map((q, idx) => {
      const userAns = activeQuiz.userAnswers[q.id];
      const isBlank = userAns === undefined || userAns === '';
      let isRight = false;
      if (isBlank) {
        blank++;
      } else {
        isRight = q.type === 'choice' ? userAns === q.answer : checkTextAnswer(userAns, q.answer);
        if (isRight) {
          correct++;
          if (q.part === 1) part1Correct++;
          else if (q.part === 2) part2Correct++;
          updatedErrors.delete(q.id);
        } else {
          wrong++;
          updatedErrors.add(q.id);
        }
      }
      return {
        ...q,
        number: q.number || idx + 1,
        userAnswer: isBlank ? null : userAns,
        isCorrect: isRight,
        isBlank,
      };
    });

    const nextErrors = Array.from(updatedErrors);
    setErrors(nextErrors);
    localStorage.setItem('patronato_errors', JSON.stringify(nextErrors));

    const scoreVal = total > 0 ? parseFloat(((correct / total) * 10).toFixed(1)) : 0;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const isPassed = pct >= 70;
    const testId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const entry: HistoryEntry = {
      id: testId,
      date: new Date().toISOString(),
      topicId: activeQuiz.topicId,
      mode: activeQuiz.mode,
      title: activeQuiz.title,
      badge: activeQuiz.badge,
      isOfficialMock: Boolean(activeQuiz.isOfficialMock),
      part1Score: `${part1Correct} / 30`,
      part2Score: `${part2Correct} / 30`,
      part1Correct,
      part2Correct,
      total,
      correct,
      wrong,
      blank,
      score: scoreVal,
      passed: isPassed,
      timeSeconds: activeQuiz.elapsedSeconds,
      questionsReview,
    };

    setHistory((prev) => {
      const next = [entry, ...prev];
      localStorage.setItem('patronato_history', JSON.stringify(next));
      return next;
    });

    persistActiveQuiz(null);
    setLatestResults(entry);
    setSelectedHistoryId(entry.id);
    setView('results');
    scheduleCloudSave();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeQuiz, errors, persistActiveQuiz, scheduleCloudSave]);

  const pauseQuiz = useCallback(() => {
    if (activeQuiz) {
      persistActiveQuiz({ ...activeQuiz, savedAt: Date.now() });
      scheduleCloudSave();
      showToast('Test pausado y guardado. Puedes reanudarlo cuando quieras.');
    }
    setView('dashboard');
  }, [activeQuiz, persistActiveQuiz, scheduleCloudSave, showToast]);

  const discardActiveQuiz = useCallback(() => {
    persistActiveQuiz(null);
    scheduleCloudSave();
    setView('dashboard');
  }, [persistActiveQuiz, scheduleCloudSave]);

  const resumeActiveQuiz = useCallback(() => {
    if (!activeQuiz || activeQuiz.isFinished) return;
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeQuiz]);

  const retryFromEntry = useCallback(
    (entry: HistoryEntry, onlyFailed: boolean) => {
      const source = entry.questionsReview || [];
      const baseQs = onlyFailed ? source.filter((q) => !q.isCorrect && !q.isBlank) : source;
      if (!baseQs.length) {
        showToast('No hay preguntas falladas para repetir en este test.');
        return;
      }
      const mapped: Question[] = baseQs.map((qr) => getQuestionById(qr.id) || qr);
      startQuizSession({
        topicId: entry.topicId,
        title: onlyFailed ? `${entry.title} (Solo falladas)` : entry.title,
        badge: onlyFailed ? 'Repaso' : entry.badge,
        mode: onlyFailed ? 'practice' : entry.mode,
        questions: mapped,
      });
    },
    [getQuestionById, showToast, startQuizSession],
  );

  const deleteHistoryEntry = useCallback(
    (testId: string) => {
      setHistory((prev) => {
        const next = prev.filter((h) => h.id !== testId);
        localStorage.setItem('patronato_history', JSON.stringify(next));
        return next;
      });
      scheduleCloudSave();
      showToast('Registro eliminado del historial.');
    },
    [scheduleCloudSave, showToast],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.setItem('patronato_history', '[]');
    scheduleCloudSave();
    showToast('Historial borrado por completo.');
  }, [scheduleCloudSave, showToast]);

  const setCardSrsStatus = useCallback(
    (cardKey: string, status: SrsStatus) => {
      setSrs((prev) => {
        const next = { ...prev, [cardKey]: status };
        localStorage.setItem('patronato_srs', JSON.stringify(next));
        return next;
      });
      scheduleCloudSave();
    },
    [scheduleCloudSave],
  );

  const getTopicProgress = useCallback(
    (topicId: string, topicTitle?: string): TopicProgressSummary => {
      const practiceAttempts = history.filter(
        (h) => (h.topicId === topicId || (topicTitle && h.title?.includes(topicTitle))) && h.mode === 'practice',
      );
      const examAttempts = history.filter(
        (h) => (h.topicId === topicId || (topicTitle && h.title?.includes(topicTitle))) && h.mode === 'exam',
      );

      const isQuizPaused = (mode: QuizMode) => {
        if (!activeQuiz || activeQuiz.isFinished) return false;
        const matchTopic = activeQuiz.topicId === topicId || Boolean(topicTitle && activeQuiz.title?.includes(topicTitle));
        return matchTopic && activeQuiz.mode === mode;
      };

      const bestPractice = practiceAttempts.length ? Math.max(...practiceAttempts.map((h) => h.score ?? 0)) : null;
      const bestExam = examAttempts.length ? Math.max(...examAttempts.map((h) => h.score ?? 0)) : null;
      const bestAny = Math.max(bestPractice ?? 0, bestExam ?? 0);

      return {
        practice: {
          completed: practiceAttempts.length > 0,
          isPaused: isQuizPaused('practice'),
          count: practiceAttempts.length,
          bestScore: bestPractice,
        },
        exam: {
          completed: examAttempts.length > 0,
          isPaused: isQuizPaused('exam'),
          count: examAttempts.length,
          passed: examAttempts.some((h) => h.passed),
          bestScore: bestExam,
        },
        masteryPct: practiceAttempts.length || examAttempts.length ? Math.round((bestAny / 10) * 100) : 0,
      };
    },
    [activeQuiz, history],
  );

  const reloadRemoteDatasets = useCallback(async () => {
    try {
      const [tData, sData, eData] = await Promise.all([
        loadTestData(true),
        loadStudyData(true),
        loadExamData(true),
      ]);
      setTestData(tData);
      setStudyData(sData);
      setExamData(eData);
      showToast(`Banco actualizado: ${tData.metadata.totalQuestions} preguntas cargadas.`);
    } catch {
      showToast('No se pudieron recargar los datos.');
    }
  }, [showToast]);

  return {
    testData,
    studyData,
    examData,
    isLoadingData,
    dataError,
    theme,
    toggleTheme,
    favorites,
    errors,
    history,
    srs,
    activeQuiz,
    profileCode,
    changeProfileCode,
    view,
    setView,
    syncStatus,
    toastMessage,
    selectedStudyTopicId,
    setSelectedStudyTopicId,
    selectedHistoryId,
    setSelectedHistoryId,
    latestResults,
    allQuestions,
    getTopicProgress,
    startTopicQuiz,
    startOfficialMockExam,
    startGlobalExam,
    startSmartReview,
    startErrorsQuiz,
    startFavsQuiz,
    answerCurrentQuestion,
    revealInteractiveQuestion,
    setQuestionIndex,
    toggleFavorite,
    finishQuiz,
    pauseQuiz,
    discardActiveQuiz,
    resumeActiveQuiz,
    retryFromEntry,
    deleteHistoryEntry,
    clearHistory,
    setCardSrsStatus,
    reloadRemoteDatasets,
    showToast,
  };
}
