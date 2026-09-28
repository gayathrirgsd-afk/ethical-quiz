import { NextResponse } from "next/server";
import { getQuiz, setQuiz, persistent } from "../../../lib/store";
import { isInstructor } from "../../../lib/auth";
import { normalizeQuestions, questionProblem } from "../../../lib/quiz";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// Students get the questions WITHOUT answers/explanations. Instructor (?full=1) gets everything.
export async function GET(req) {
  const full = new URL(req.url).searchParams.get("full") === "1";
  if (full && !isInstructor(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quiz = await getQuiz();
  if (!quiz) return NextResponse.json({ published: false, persistent, questions: [] }, { headers: NO_STORE });
  const questions = full
    ? quiz.questions
    : quiz.questions.map(({ answer, explanation, ...safe }) => safe);
  return NextResponse.json(
    { published: true, publishedAt: quiz.publishedAt, persistent, questions },
    { headers: NO_STORE }
  );
}

// Instructor publishes the quiz.
export async function PUT(req) {
  if (!isInstructor(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const questions = normalizeQuestions(body.questions);
  if (!questions.length) return NextResponse.json({ error: "No questions to publish" }, { status: 400 });
  if (questions.length > 1000) return NextResponse.json({ error: "Too many questions (max 1000)" }, { status: 400 });
  const bad = questions.map((q, i) => [i + 1, questionProblem(q)]).filter(([, p]) => p);
  if (bad.length) {
    return NextResponse.json(
      { error: `Fix these questions first: ${bad.slice(0, 10).map(([n, p]) => `Q${n} (${p})`).join(", ")}` },
      { status: 400 }
    );
  }
  await setQuiz({ questions, publishedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, count: questions.length, persistent });
}
