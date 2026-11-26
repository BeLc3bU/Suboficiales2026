import { useState } from 'react';
import { AnalyticsView } from '@/components/AnalyticsView';
import { BottomNav } from '@/components/BottomNav';
import { DashboardView } from '@/components/DashboardView';
import { Header } from '@/components/Header';
import { HistoryDetailHeader, HistoryView } from '@/components/HistoryView';
import { ProfileModal } from '@/components/ProfileModal';
import { PwaReloadPrompt } from '@/components/PwaReloadPrompt';
import { QuizView } from '@/components/QuizView';
import { ResultsView } from '@/components/ResultsView';
import { StudySheetView } from '@/components/StudySheetView';
import { TopicsView } from '@/components/TopicsView';
import { useAppState } from '@/hooks/useAppState';
import { resolveStudySheet } from '@/utils/studySheetResolver';

export function App() {
  const state = useAppState();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const topics = state.testData?.topics || [];
  const activeSheet = resolveStudySheet(state.selectedStudyTopicId, state.studyData);
  const selectedHistoryEntry =
    state.history.find((h) => h.id === state.selectedHistoryId) || state.latestResults;

  const openStudySheet = (topicId: string) => {
    state.setSelectedStudyTopicId(topicId);
    state.setView('study-sheet');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-50">
      <Header
        view={state.view}
        onNavigate={(v) => {
          state.setView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        theme={state.theme}
        onToggleTheme={state.toggleTheme}
        syncStatus={state.syncStatus}
        profileCode={state.profileCode}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10">
        {state.isLoadingData ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="text-sm font-semibold">Cargando banco oficial de preguntas y fichas…</p>
          </div>
        ) : state.dataError ? (
          <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <h2 className="text-base font-extrabold">Error cargando datos</h2>
            <p className="mt-1 text-xs">{state.dataError}</p>
            <button
              type="button"
              onClick={state.reloadRemoteDatasets}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {state.view === 'dashboard' && (
              <DashboardView
                totalQuestions={state.allQuestions.length}
                topics={topics}
                history={state.history}
                errorsCount={state.errors.length}
                favsCount={state.favorites.length}
                activeQuiz={state.activeQuiz}
                onResumeQuiz={state.resumeActiveQuiz}
                onDiscardQuiz={state.discardActiveQuiz}
                onStartOfficialMock={state.startOfficialMockExam}
                onStartGlobalExam={state.startGlobalExam}
                onStartSmartReview={state.startSmartReview}
                onStartErrorsQuiz={state.startErrorsQuiz}
                onStartFavsQuiz={state.startFavsQuiz}
                onNavigate={state.setView}
                onOpenStudySheet={openStudySheet}
                onStartTopicQuiz={state.startTopicQuiz}
              />
            )}

            {state.view === 'topics' && (
              <TopicsView
                topics={topics}
                studyData={state.studyData}
                getTopicProgress={state.getTopicProgress}
                onStartTopicQuiz={state.startTopicQuiz}
                onOpenStudySheet={openStudySheet}
              />
            )}

            {state.view === 'quiz' && state.activeQuiz && (
              <QuizView
                quiz={state.activeQuiz}
                favorites={state.favorites}
                onAnswer={state.answerCurrentQuestion}
                onRevealInteractive={state.revealInteractiveQuestion}
                onSetIndex={state.setQuestionIndex}
                onToggleFavorite={state.toggleFavorite}
                onFinish={state.finishQuiz}
                onPause={state.pauseQuiz}
                onDiscard={state.discardActiveQuiz}
              />
            )}

            {state.view === 'results' && state.latestResults && (
              <ResultsView
                entry={state.latestResults}
                favorites={state.favorites}
                onToggleFavorite={state.toggleFavorite}
                onRetry={(onlyFailed) => state.retryFromEntry(state.latestResults!, onlyFailed)}
                onGoHome={() => state.setView('dashboard')}
                onGoHistory={() => state.setView('history')}
              />
            )}

            {state.view === 'history' && (
              <HistoryView
                history={state.history}
                onViewDetail={(testId) => {
                  state.setSelectedHistoryId(testId);
                  state.setView('history-detail');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDeleteItem={state.deleteHistoryEntry}
                onClearAll={state.clearHistory}
              />
            )}

            {state.view === 'history-detail' && selectedHistoryEntry && (
              <div>
                <HistoryDetailHeader onBack={() => state.setView('history')} />
                <ResultsView
                  entry={selectedHistoryEntry}
                  favorites={state.favorites}
                  onToggleFavorite={state.toggleFavorite}
                  onRetry={(onlyFailed) => state.retryFromEntry(selectedHistoryEntry, onlyFailed)}
                  onGoHome={() => state.setView('dashboard')}
                  onGoHistory={() => state.setView('history')}
                />
              </div>
            )}

            {state.view === 'analytics' && (
              <AnalyticsView
                history={state.history}
                topics={topics}
                studyData={state.studyData}
                srs={state.srs}
                errorsCount={state.errors.length}
                onStartTopicQuiz={state.startTopicQuiz}
                onOpenStudySheet={openStudySheet}
                onStartSmartReview={() => state.startSmartReview(25)}
              />
            )}

            {state.view === 'study-sheet' && activeSheet && (
              <StudySheetView
                sheet={activeSheet}
                srs={state.srs}
                onSetSrsStatus={state.setCardSrsStatus}
                onBack={() => state.setView('topics')}
                onStartTopicTest={() => {
                  const t = topics.find((item) => item.id === state.selectedStudyTopicId);
                  if (t) state.startTopicQuiz(t, 'practice');
                  else state.setView('topics');
                }}
              />
            )}
          </>
        )}
      </main>

      <footer className="hidden border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 md:block dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        PATRONATO 2026 • Preparación para la Escala de Suboficiales • Sin penalización de fallos • Exige 70% de aciertos para Apto
      </footer>

      <BottomNav
        view={state.view}
        onNavigate={(v) => {
          state.setView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onStartSmartReview={() => state.startSmartReview(25)}
        errorCount={state.errors.length}
      />

      <ProfileModal
        open={profileModalOpen}
        currentCode={state.profileCode}
        onClose={() => setProfileModalOpen(false)}
        onSaveCode={state.changeProfileCode}
      />

      <PwaReloadPrompt />

      {state.toastMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl md:bottom-6 dark:bg-blue-700">
          {state.toastMessage}
        </div>
      )}
    </div>
  );
}
