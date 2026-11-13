import type { Metadata } from "next";
import { QuizPortal } from "@/components/quiz/QuizPortal";

export const metadata: Metadata = {
  title: "NASA Science Quiz Portal",
  description: "Age-adapted, bilingual quizzes built on NASA records and NASA PDS data, with a local learning dashboard.",
};

export default function QuizPage() {
  return <QuizPortal />;
}
