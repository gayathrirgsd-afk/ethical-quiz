// Pure helpers shared by the browser and the API routes (no DOM / Node APIs).

export const DEFAULT_UNIT = "General";
const LETTERS = "ABCDEFGH";

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function nextLetter(optionOrder) {
  for (const l of LETTERS) if (!optionOrder.includes(l)) return l;
  return null;
}

// Make sure every question has every field (also accepts JSON exported by the Streamlit version).
export function normalizeQuestions(list) {
  return (Array.isArray(list) ? list : []).map((q) => {
    const options = {};
    const order = Array.isArray(q.option_order) && q.option_order.length ? q.option_order : Object.keys(q.options || {});
    order.forEach((l) => (options[l] = String((q.options || {})[l] ?? "")));
    return {
      id: q.id || newId(),
      number: String(q.number ?? ""),
      stem: String(q.stem ?? ""),
      options,
      option_order: [...order],
      answer: String(q.answer ?? "").trim().toUpperCase(),
      explanation: String(q.explanation ?? ""),
      unit: String(q.unit || DEFAULT_UNIT).trim() || DEFAULT_UNIT,
    };
  });
}

// Returns a human-readable problem, or null if the question is publishable.
export function questionProblem(q) {
  if (!q.stem.trim()) return "Question text is empty";
  if (q.option_order.length < 2) return "Needs at least 2 options";
  if (q.option_order.some((l) => !String(q.options[l] || "").trim())) return "An option is empty";
  if (!q.answer) return "No correct answer set";
  if (!q.option_order.includes(q.answer)) return `Answer '${q.answer}' is not one of the options`;
  return null;
}

export function unitsOf(questions) {
  const seen = [];
  for (const q of questions) if (!seen.includes(q.unit)) seen.push(q.unit);
  return seen;
}
