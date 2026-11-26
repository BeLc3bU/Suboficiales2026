import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuizView } from '@/components/QuizView';
import type { ActiveQuiz } from '@/types';

describe('QuizView Split-Pane Reading & Cloze', () => {
  it('muestra el panel de texto y resalta el hueco activo del Cloze', () => {
    const quiz: ActiveQuiz = {
      topicId: 'sim_1',
      title: 'Simulacro Oficial',
      badge: 'Oficial 2022',
      mode: 'exam',
      currentIndex: 0,
      userAnswers: {},
      interactiveChecked: {},
      isFinished: false,
      startTime: Date.now(),
      elapsedSeconds: 12,
      isOfficialMock: true,
      questions: [
        {
          id: 'Q31',
          number: 31,
          part: 2,
          type: 'choice',
          section: 'Parte II: Cloze',
          readingText: 'Yesterday the cadets (31) _____ early to inspect (32) _____ equipment.',
          question: 'Completa el hueco (31) del texto:',
          options: { A: 'arrived', B: 'arrive', C: 'arriving', D: 'arrives' },
          answer: 'A',
        },
      ],
    };

    render(
      <QuizView
        quiz={quiz}
        favorites={[]}
        onAnswer={vi.fn()}
        onRevealInteractive={vi.fn()}
        onSetIndex={vi.fn()}
        onToggleFavorite={vi.fn()}
        onFinish={vi.fn()}
        onPause={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText('Parte II • Cloze (Use of English)')).toBeTruthy();
    const mark = document.querySelector('mark');
    expect(mark?.textContent).toContain('(31)');
    expect(screen.getByText('arrived')).toBeTruthy();
  });
});
