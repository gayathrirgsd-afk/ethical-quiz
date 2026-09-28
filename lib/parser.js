import { DEFAULT_UNIT, newId } from "./quiz";

// Handles common textbook / exam-bank layouts:
//   1. Question text...           Q1. Question text...
//   A) option   A. option   (A) option
//   Answer: C   Ans: C   Correct Answer: C          Explanation: ...
// Headings such as "Unit 1: Basics", "Chapter 2", "Module 3" tag every following question with that unit.

const RE_PAGE_NOISE = /^\s*page\s*\d+(\s*(of|\/)\s*\d+)?\s*$/i;
const RE_QUESTION_START = /^\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})[.)]\s*(.*)$/;
const RE_OPTION_START = /^\s*\(?([A-Da-d])\)?[.):]\s+(.*)$/;
const RE_ANSWER_LINE = /^\s*(?:correct\s+)?(?:answer|ans)\s*[:\-]?\s*\(?([A-Da-d])(?![A-Za-z0-9])\)?\.?\s*(.*)$/i;
const RE_EXPLANATION_LINE = /^\s*explanation\s*[:\-]?\s*(.*)$/i;
const RE_UNIT_HEADING = /^\s*(unit|chapter|section|module|topic)\b\s*[:\-]?\s*(\d+)?\s*[:\-]?\s*(.*)$/i;

export function parseQuestions(rawText) {
  const lines = rawText.split("\n").map((l) => l.replace(/\s+$/, ""));
  const questions = [];
  let current = null;
  let active = null; // ["stem"] | ["option", "A"] | ["answer"] | ["explanation"]
  let currentUnit = DEFAULT_UNIT;

  const hasContent = (q) => q && (q.stem.trim() || q.option_order.length);

  const startNew = (num, first) => {
    if (hasContent(current)) questions.push(current);
    current = {
      id: newId(),
      number: num,
      stem: first.trim(),
      options: {},
      option_order: [],
      answer: "",
      explanation: "",
      unit: currentUnit,
    };
    active = ["stem"];
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    if (RE_PAGE_NOISE.test(line)) continue;

    const mQ = line.match(RE_QUESTION_START);
    const mOpt = line.match(RE_OPTION_START);
    const mAns = line.match(RE_ANSWER_LINE);
    const mExp = line.match(RE_EXPLANATION_LINE);
    const mUnit = line.match(RE_UNIT_HEADING);

    if (mQ && !mOpt) {
      startNew(mQ[1], mQ[2]);
      continue;
    }
    if (mUnit && !mOpt && !mAns) {
      currentUnit = line.trim();
      active = null;
      continue;
    }
    if (!current) continue;

    if (mOpt) {
      const letter = mOpt[1].toUpperCase();
      current.options[letter] = mOpt[2].trim();
      if (!current.option_order.includes(letter)) current.option_order.push(letter);
      active = ["option", letter];
      continue;
    }
    if (mAns) {
      current.answer = mAns[1].toUpperCase();
      if (mAns[2].trim()) current.explanation = (current.explanation + " " + mAns[2].trim()).trim();
      active = ["answer"];
      continue;
    }
    if (mExp) {
      current.explanation = (current.explanation + " " + mExp[1].trim()).trim();
      active = ["explanation"];
      continue;
    }

    if (!active) continue;
    const t = line.trim();
    if (active[0] === "stem") current.stem = (current.stem + " " + t).trim();
    else if (active[0] === "option") current.options[active[1]] = (current.options[active[1]] + " " + t).trim();
    else current.explanation = (current.explanation + " " + t).trim();
  }
  if (hasContent(current)) questions.push(current);

  return questions.filter((q) => q.option_order.length >= 2);
}
