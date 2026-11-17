import {
  normalizeGeneratedQuizQuestions,
  QuizDeck,
  QuizDifficulty,
  QuizQuestionType,
} from '../game/rules';

export interface StudyMaterialSelection {
  kind: 'pdf' | 'text' | 'url' | 'video';
  name: string;
  notes?: string;
  sourceUrl?: string;
  video?: {
    data: string;
    mimeType: string;
    name: string;
  };
}

export interface QuizGenerationInput {
  title: string;
  subject: string;
  notes: string;
  questionCount: number;
  difficulty: QuizDifficulty;
  questionTypes: QuizQuestionType[];
  gameMode?: string;
  sourceUrl?: string;
  sourceType?: 'url' | 'video';
  video?: StudyMaterialSelection['video'];
}

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function generateQuizDeck(input: QuizGenerationInput): Promise<QuizDeck> {
  if (!input.title.trim()) throw new Error('Enter a title for this quiz.');
  if (!Number.isInteger(input.questionCount) || input.questionCount < 1 || input.questionCount > 100) {
    throw new Error('Choose between 1 and 100 questions.');
  }
  if (!input.questionTypes.length) throw new Error('Choose at least one question type.');
  if (input.notes.trim().length < 20 && !input.sourceUrl && !input.video) {
    throw new Error('Add at least 20 characters of study text, a link, or a supported video.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/quiz/generate`, {
      method: 'POST',
      credentials: API_URL ? 'include' : 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('Could not reach the quiz service. Check the connection and try again.');
  }

  const rawText = await response.text().catch(() => '');
  let payload: unknown;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    const contentType = response.headers.get('content-type') || '';
    if (
      response.url.includes('__cookie_check') ||
      contentType.includes('text/html') ||
      rawText.trimStart().startsWith('<')
    ) {
      throw new Error('Preview session expired or blocked cookies. Reload the page or allow cookies and try again.');
    }
    throw new Error(`Quiz service returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload &&
      typeof payload.error === 'string'
      ? payload.error
      : `Quiz generation failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  if (!payload || typeof payload !== 'object' || !('deck' in payload) ||
      !payload.deck || typeof payload.deck !== 'object' || !('questions' in payload.deck)) {
    throw new Error('Quiz service returned an invalid deck.');
  }

  const rawDeck = payload.deck as Partial<QuizDeck>;
  const questions = normalizeGeneratedQuizQuestions(
    rawDeck.questions,
    input.questionCount,
    input.questionTypes,
    input.difficulty,
  );
  return {
    id: typeof rawDeck.id === 'string' ? rawDeck.id : `deck-ai-${Date.now()}`,
    title: typeof rawDeck.title === 'string' ? rawDeck.title : input.title.trim(),
    subject: typeof rawDeck.subject === 'string' ? rawDeck.subject : input.subject.trim(),
    sourceSummary: typeof rawDeck.sourceSummary === 'string'
      ? rawDeck.sourceSummary
      : input.notes.trim().slice(0, 160),
    createdAt: typeof rawDeck.createdAt === 'string'
      ? rawDeck.createdAt
      : new Date().toISOString().slice(0, 10),
    questions,
  };
}
