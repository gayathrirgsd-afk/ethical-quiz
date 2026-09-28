import { NextResponse } from "next/server";
import { getQuiz, addAttempt } from "../../../lib/store";

export const dynamic = "force-dynamic";

// Grading happens on the server so students never receive the answer key before submitting.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const quiz = await getQuiz();
  if (!quiz) return NextResponse.json({ error: "No quiz published yet" }, { status: 404 });

  const name = String(body.name || "").trim().slice(0, 60) || "Anonymous";
  const unit = String(body.unit || "");
  const responses = body.responses && typeof body.responses === "object" ? body.responses : {};
  const combined = unit === "All Units";

  let qs = quiz.questions;
  if (combined) {
    if (Array.isArray(body.units)) qs = qs.filter((q) => body.units.includes(q.unit));
  } else {
    qs = qs.filter((q) => q.unit === unit);
  }
  if (!qs.length) return NextResponse.json({ error: "Unknown unit" }, { status: 400 });

  const review = qs.map((q) => {
    const given = responses[q.id];
    const selected = typeof given === "string" && q.option_order.includes(given) ? given : null;
    return { id: q.id, selected, answer: q.answer, correct: selected === q.answer, explanation: q.explanation || "" };
  });
  const score = review.filter((r) => r.correct).length;
  const total = qs.length;
  const percentage = Math.round((score / total) * 1000) / 10;

  const unit_breakdown = {};
  qs.forEach((q, i) => {
    const b = (unit_breakdown[q.unit] ||= { correct: 0, total: 0 });
    b.total += 1;
    if (review[i].correct) b.correct += 1;
  });

  try {
    await addAttempt({
      timestamp: new Date().toISOString(),
      student_name: name,
      unit_filter: combined ? "All Units (combined)" : unit,
      score,
      total,
      percentage,
      unit_breakdown,
    });
  } catch (e) {
    console.error("Could not save attempt", e);
  }
  return NextResponse.json({ score, total, percentage, review });
}
