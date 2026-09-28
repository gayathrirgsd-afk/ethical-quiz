"use client";
import { useEffect, useMemo, useState } from "react";
import InstructorGate from "../../components/InstructorGate";
import { authHeaders } from "../../lib/client";
import { extractTextFromPdf } from "../../lib/pdf";
import { parseQuestions } from "../../lib/parser";
import { newId, nextLetter, normalizeQuestions, questionProblem, unitsOf } from "../../lib/quiz";

function QuestionEditor({ q, index, onChange, onDelete }) {
  const canDeleteOpt = q.option_order.length > 2;
  const setOpt = (l, v) => onChange({ options: { ...q.options, [l]: v } });
  const delOpt = (l) => {
    const options = { ...q.options };
    delete options[l];
    onChange({ options, option_order: q.option_order.filter((x) => x !== l), answer: q.answer === l ? "" : q.answer });
  };
  const addOpt = () => {
    const l = nextLetter(q.option_order);
    if (l) onChange({ options: { ...q.options, [l]: "" }, option_order: [...q.option_order, l] });
  };
  return (
    <div style={{ padding: ".6rem .2rem 1rem" }}>
      <label>Question</label>
      <textarea value={q.stem} onChange={(e) => onChange({ stem: e.target.value })} />
      <label style={{ marginTop: ".6rem" }}>Unit / Topic</label>
      <input type="text" value={q.unit} onChange={(e) => onChange({ unit: e.target.value })} />
      <label style={{ marginTop: ".6rem" }}>Options</label>
      {q.option_order.map((l) => (
        <div className="optrow" key={l}>
          <span className="lt">{l}</span>
          <input type="text" value={q.options[l]} onChange={(e) => setOpt(l, e.target.value)} />
          <button className="danger" disabled={!canDeleteOpt} title={canDeleteOpt ? "Remove option" : "At least 2 options required"} onClick={() => delOpt(l)}>🗑️</button>
        </div>
      ))}
      <button onClick={addOpt}>➕ Add option</button>
      <div className="row" style={{ marginTop: ".8rem" }}>
        <div>
          <label>Correct answer</label>
          <select value={q.answer} onChange={(e) => onChange({ answer: e.target.value })}>
            <option value="">— choose —</option>
            {q.option_order.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <label style={{ marginTop: ".6rem" }}>Explanation (shown to students who miss it)</label>
      <textarea value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} />
      <p><button className="danger" onClick={onDelete}>🗑️ Delete Q{index + 1}</button></p>
    </div>
  );
}

function Editor() {
  const [questions, setQuestions] = useState([]);
  const [open, setOpen] = useState({});
  const [msg, setMsg] = useState(null); // { type, text }
  const [busy, setBusy] = useState("");
  const [bulkUnit, setBulkUnit] = useState("");
  const [persistent, setPersistent] = useState(true);
  const [published, setPublished] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/quiz?full=1", { headers: authHeaders(), cache: "no-store" });
        const d = await r.json();
        setPersistent(d.persistent);
        if (d.published) {
          setQuestions(normalizeQuestions(d.questions));
          setPublished(d.publishedAt);
        }
      } catch {}
    })();
  }, []);

  const problems = useMemo(
    () => questions.map((q, i) => ({ i, q, p: questionProblem(q) })).filter((x) => x.p),
    [questions]
  );

  const update = (id, patch) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  async function onPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("Reading PDF…");
    setMsg(null);
    try {
      const text = await extractTextFromPdf(file);
      const qs = normalizeQuestions(parseQuestions(text));
      if (!qs.length) {
        setMsg({ type: "err", text: "No questions detected. The PDF may be a scanned image (no selectable text) or use an unusual layout." });
      } else {
        setQuestions(qs);
        setOpen({});
        setMsg({ type: "ok", text: `Parsed ${qs.length} question(s) across ${unitsOf(qs).length} unit(s). Review them below, then publish.` });
      }
    } catch (err) {
      setMsg({ type: "err", text: `Could not read the PDF: ${err.message}` });
    }
    setBusy("");
    e.target.value = "";
  }

  async function onJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const qs = normalizeQuestions(JSON.parse(await file.text()));
      setQuestions(qs);
      setMsg({ type: "ok", text: `Loaded ${qs.length} question(s) from JSON.` });
    } catch {
      setMsg({ type: "err", text: "That is not a valid quiz JSON file." });
    }
    e.target.value = "";
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quiz_bank.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function addQuestion() {
    const id = newId();
    setQuestions((qs) => [...qs, {
      id, number: String(qs.length + 1), stem: "", options: { A: "", B: "", C: "", D: "" },
      option_order: ["A", "B", "C", "D"], answer: "", explanation: "", unit: qs[0]?.unit || "General",
    }]);
    setOpen((o) => ({ ...o, [id]: true }));
  }

  async function publish() {
    setBusy("Publishing…");
    setMsg(null);
    try {
      const r = await fetch("/api/quiz", { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ questions }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Publish failed");
      setPersistent(d.persistent);
      setPublished(new Date().toISOString());
      setMsg({ type: "ok", text: `Published ${d.count} questions. Students can now open the site and take the quiz (they may need to click "Refresh quiz" if their page was already open).` });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
    setBusy("");
  }

  return (
    <>
      <h1>📄 Build & Publish Quiz</h1>
      {!persistent && (
        <div className="alert warn">
          <b>No database connected.</b> Published quizzes and student scores are only kept in temporary server memory and will be lost / not shared between server instances. Connect Upstash Redis (see README) before using this with a class.
        </div>
      )}
      {published && <div className="alert info">A quiz is currently published (last published {new Date(published).toLocaleString()}). It is loaded below for editing — publish again to update students.</div>}

      <div className="card">
        <div className="row">
          <div>
            <label>1. Upload a PDF of MCQs (with answer key)</label>
            <input type="file" accept="application/pdf" onChange={onPdf} />
          </div>
          <div>
            <label>…or load a saved quiz (.json)</label>
            <input type="file" accept="application/json" onChange={onJson} />
          </div>
        </div>
        {busy && <p className="muted">{busy}</p>}
      </div>

      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      {questions.length > 0 && (
        <>
          <h2>2. Review & fix ({questions.length} questions)</h2>
          <div className="card">
            <label>⚡ Bulk-assign one unit to ALL questions</label>
            <div className="row tight">
              <input type="text" style={{ width: 260 }} placeholder="e.g. Unit 1: Basics" value={bulkUnit} onChange={(e) => setBulkUnit(e.target.value)} />
              <button disabled={!bulkUnit.trim()} onClick={() => setQuestions((qs) => qs.map((q) => ({ ...q, unit: bulkUnit.trim() })))}>Apply to all</button>
            </div>
          </div>

          {questions.map((q, i) => {
            const p = questionProblem(q);
            const isOpen = !!open[q.id];
            return (
              <div className="card" key={q.id} style={{ padding: ".4rem .9rem" }}>
                <button className="qhead" style={{ border: 0 }} onClick={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}>
                  <span>{isOpen ? "▾" : "▸"}</span>
                  <span className="t">Q{i + 1} <span className="chip">{q.unit}</span> {q.stem.slice(0, 80)}</span>
                  {p && <span title={p}>⚠️</span>}
                </button>
                {isOpen && (
                  <QuestionEditor q={q} index={i} onChange={(patch) => update(q.id, patch)}
                    onDelete={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} />
                )}
              </div>
            );
          })}
          <button onClick={addQuestion}>➕ Add a new question</button>

          {problems.length > 0 && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <div className="alert warn">{problems.length} question(s) need fixing before you can publish.</div>
              <h3 style={{ marginTop: 0 }}>⚡ Quick fix</h3>
              {problems.slice(0, 30).map(({ i, q, p }) => (
                <div key={q.id} style={{ marginBottom: "1rem" }}>
                  <b>Q{i + 1}.</b> {q.stem || <i>(empty question)</i>} <span className="badge bad">{p}</span>
                  <div className="muted">{q.option_order.map((l) => `${l}. ${q.options[l]}`).join("  |  ")}</div>
                  <div className="row tight" style={{ marginTop: ".3rem" }}>
                    <select value={q.answer} onChange={(e) => update(q.id, { answer: e.target.value })}>
                      <option value="">— correct answer —</option>
                      {q.option_order.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button onClick={() => setOpen((o) => ({ ...o, [q.id]: true }))}>Open full editor</button>
                    <button className="danger" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}>Delete</button>
                  </div>
                </div>
              ))}
              {problems.length > 30 && <p className="muted">…and {problems.length - 30} more.</p>}
            </div>
          )}

          <h2>3. Save or publish</h2>
          <div className="row tight">
            <button onClick={downloadJson}>💾 Download quiz as JSON</button>
            <button className="primary" disabled={problems.length > 0 || !!busy} onClick={publish}>🚀 Publish Quiz to Students</button>
          </div>
        </>
      )}
    </>
  );
}

export default function InstructorPage() {
  return <InstructorGate><Editor /></InstructorGate>;
}
