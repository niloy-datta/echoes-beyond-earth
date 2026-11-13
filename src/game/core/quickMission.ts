import { itemsFor, type QuizItem } from "./assessment.ts";

export function buildQuickMission(round = 0): QuizItem[] {
  const safeRound = Number.isSafeInteger(round) && round >= 0 ? round : 0;
  return [0, 1, 2, 3, 4].map((chapter) => {
    const questions = itemsFor({ kind: "chapter", chapter });
    if (questions.length === 0) throw new Error(`No quiz questions for chapter ${chapter + 1}`);
    return questions[(safeRound + chapter) % questions.length];
  });
}

export function scoreQuickMission(items: readonly QuizItem[], choices: Readonly<Record<string, number>>) {
  const answered = items.filter((item) =>
    Object.prototype.hasOwnProperty.call(choices, item.id) &&
    Number.isInteger(choices[item.id]) &&
    choices[item.id] >= 0 &&
    choices[item.id] < item.options.length
  );
  const correct = answered.filter((item) => choices[item.id] === item.correct).length;
  return {
    answered: answered.length,
    correct,
    total: items.length,
    pct: items.length ? Math.round((correct / items.length) * 100) : 0,
  };
}
