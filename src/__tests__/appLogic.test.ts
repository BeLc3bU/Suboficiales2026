import { describe, expect, it } from 'vitest';
import examJson from '../../public/data/exam-data.json';
import studyCardsJson from '../../public/data/study-cards.json';
import { mergeSyncPayloads, normalizeProfileCode } from '@/services/syncService';
import type { ExamData, Question, StudyData } from '@/types';
import { generateOfficialExam, renumberClozeGaps } from '@/utils/examGenerator';
import { checkTextAnswer, getMistakeExplanation } from '@/utils/mistakeExplainer';
import { resolveStudySheet } from '@/utils/studySheetResolver';

describe('Exam Generator (Simulacro Oficial 60 Qs)', () => {
  const examData = examJson as unknown as ExamData;

  it('genera exactamente 60 preguntas (30 Parte I Reading + 30 Parte II Cloze 3x10)', () => {
    const exam = generateOfficialExam(examData);
    expect(exam.questions).toHaveLength(60);
    expect(exam.questions.filter((q) => q.part === 1)).toHaveLength(30);
    expect(exam.questions.filter((q) => q.part === 2)).toHaveLength(30);
    expect(exam.questions[0].number).toBe(1);
    expect(exam.questions[59].number).toBe(60);
    expect(exam.isOfficialMock).toBe(true);
    expect(exam.timeLimitMinutes).toBe(90);
  });

  it('renumera huecos cloze correlativamente', () => {
    const res = renumberClozeGaps('Hello (1) _____ world (2) _____ test.', 31);
    expect(res).toContain('(31) _____');
    expect(res).toContain('(32) _____');
  });
});

describe('Mistake Explainer & Text Checking', () => {
  it('valida respuestas de texto con alternativas separadas por /', () => {
    expect(checkTextAnswer('Each Other', 'each other / one another')).toBe(true);
    expect(checkTextAnswer('themselves', 'each other / one another')).toBe(false);
  });

  it('detecta errores gramaticales comunes de Patronato', () => {
    const q: Question = {
      id: 'Q1',
      type: 'choice',
      question: 'Look at those dark clouds! It ____ soon.',
      options: { A: 'will rain', B: 'is going to rain', C: 'rains', D: 'is rain' },
      answer: 'B',
    };
    expect(getMistakeExplanation(q, 'A')).toContain('be going to');
    expect(getMistakeExplanation(q, 'D')).toContain('agramatical');
  });
});

describe('Sync & Profile Isolation', () => {
  it('normaliza códigos de perfil de nube', () => {
    expect(normalizeProfileCode('  Sargento Juan! ')).toBe('sargentojuan');
    expect(normalizeProfileCode('Sargento-1')).toBe('sargento-1');
    expect(normalizeProfileCode('')).toBe('master');
  });

  it('fusiona favoritos, errores e historial sin duplicar', () => {
    const merged = mergeSyncPayloads(
      {
        version: 3,
        theme: 'light',
        favorites: ['Q1'],
        errors: ['Q2'],
        history: [],
        srs: { 'tema_1::card_0': 'mastered' },
        activeQuiz: null,
        activeQuizUpdatedAt: 10,
        updatedAt: '2026-11-26T00:00:00Z',
      },
      {
        favorites: ['Q1', 'Q3'],
        errors: ['Q4'],
        srs: { 'tema_1::card_1': 'repeat' },
        activeQuizUpdatedAt: 5,
      },
    );
    expect(merged.favorites.sort()).toEqual(['Q1', 'Q3']);
    expect(merged.errors.sort()).toEqual(['Q2', 'Q4']);
    expect(merged.srs).toEqual({
      'tema_1::card_0': 'mastered',
      'tema_1::card_1': 'repeat',
    });
  });
});

describe('Study Sheet Resolver', () => {
  const studyData = studyCardsJson as unknown as StudyData;

  it('resuelve alias tema_14_f1 hacia su ficha correspondiente', () => {
    const sheet = resolveStudySheet('tema_14_f1', studyData);
    expect(sheet).not.toBeNull();
    expect(sheet?.goldenRules.length).toBeGreaterThanOrEqual(2);
  });
});
