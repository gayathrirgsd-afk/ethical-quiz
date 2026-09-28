"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "../lib/client";
import { unitsOf } from "../lib/quiz";

function Bars({ data }) {
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar" key={d.name}>
          <span className="name" title={d.name}>{d.name}</span>
          <span className="track"><span className="fill" style={{ width: `${d.pct}%`, display: "block" }} /></span>
          <span className="pct">{d.correct}/{d.total} · {Math.round(d.pct)}%</span>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ pos, q, r }) {
  const status = r.correct ? "ok" : r.selected ? "bad" : "skip";
  return (
    <div className={`card ${r.correct ? "correct" : "incorrect"}`}>
      <b>Q{pos + 1}. {q.stem}</b>
      <span className={`badge ${status}`}>{r.correct ? "Correct" : r.selected ? "Incorrect" : "Unanswered"}</span>
      <div style={{ marginTop: ".6rem" }}>
        {q.option_order.map((l) => {
          let cls = "", suffix = "", icon = "";
          if (l === r.answer) { cls = "right"; suffix = " (correct answer)"; icon = "✅ "; }
          else if (l === r.selected) { cls = "wrong"; suffix = " (your answer)"; icon = "❌ "; }
          return <div key={l} className={`opt ${cls}`}>{icon}{l}. {q.options[l]}{suffix}</div>;
        })}
      </div>
      {!r.correct && r.explanation && <div className="muted" style={{ marginTop: ".5rem" }}>💡 {r.explanation}</div>}
    </div>
  );
}

export default function StudentPage() {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [name, setName] = useState("");
  const [unitSel, setUnitSel] = useState("All Units");
  const [sections, setSections] = useState([]); // [{ unit, ids }]
  const [responses, setResponses] = useState({});
  const [results, setResults] = useState({}); // unit -> { score, total, review: {id: {...}} }
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const combinedLogged = useRef(false);

  async function load() {
    setLoading(true);
    setLoadErr("");
    try {
      const r = await fetch("/api/quiz", { cache: "no-store" });
      const d = await r.json();
      setQuiz(d);
    } catch {
      setLoadErr("Could not load the quiz. Check your connection and try again.");
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const questions = quiz?.questions || [];
  const qById = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);
  const units = useMemo(() => unitsOf(questions), [questions]);

  function start() {
    const chosen = unitSel === "All Units" || !units.includes(unitSel) ? units : [unitSel];
    setSections(chosen.map((u) => ({ unit: u, ids: shuffle(questions.filter((q) => q.unit === u).map((q) => q.id)) })));
    setResponses({});
    setResults({});
    setErr("");
    combinedLogged.current = false;
    window.scrollTo({ top: 0 });
  }

  async function submitUnit(sec) {
    setBusy(sec.unit);
    setErr("");
    try {
      const mine = Object.fromEntries(sec.ids.filter((id) => responses[id]).map((id) => [id, responses[id]]));
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, unit: sec.unit, responses: mine }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Submit failed");
      const review = Object.fromEntries(d.review.map((x) => [x.id, x]));
      setResults((prev) => ({ ...prev, [sec.unit]: { score: d.score, total: d.total, review } }));
    } catch (e) {
      setErr(e.message);
    }
    setBusy("");
  }

  function retakeUnit(sec) {
    setSections((prev) => prev.map((s) => (s.unit === sec.unit ? { ...s, ids: shuffle(s.ids) } : s)));
    setResponses((prev) => {
      const n = { ...prev };
      sec.ids.forEach((id) => delete n[id]);
      return n;
    });
    setResults((prev) => {
      const n = { ...prev };
      delete n[sec.unit];
      return n;
    });
    combinedLogged.current = false;
  }

  const allDone = sections.length > 0 && sections.every((s) => results[s.unit]);

  // When every unit has been submitted, log one combined attempt (multi-unit quizzes only).
  useEffect(() => {
    if (!allDone || sections.length < 2 || combinedLogged.current) return;
    combinedLogged.current = true;
    const ids = new Set(sections.flatMap((s) => s.ids));
    const all = Object.fromEntries(Object.entries(responses).filter(([id]) => ids.has(id)));
    fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, unit: "All Units", units: sections.map((s) => s.unit), responses: all }),
    }).catch(() => {});
  }, [allDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const overall = useMemo(() => {
    if (!allDone) return null;
    const score = sections.reduce((a, s) => a + results[s.unit].score, 0);
    const total = sections.reduce((a, s) => a + results[s.unit].total, 0);
    return { score, total, pct: total ? (score / total) * 100 : 0 };
  }, [allDone, sections, results]);

  if (loading) return <p className="muted">Loading quiz…</p>;
  if (loadErr) return <div className="alert err">{loadErr} <button onClick={load}>Retry</button></div>;

  return (
    <>
      <h1>🎓 Take the Quiz</h1>
      {!quiz?.published ? (
        <div className="card">
          <p>No quiz has been published yet. Ask your instructor to publish one, then refresh.</p>
          <button onClick={load}>🔄 Refresh</button>
        </div>
      ) : (
        <div className="card">
          <div className="row">
            <div>
              <label>Your name</label>
              <input type="text" value={name} placeholder="e.g. Priya Sharma" onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label>Unit / Topic</label>
              <select value={unitSel} onChange={(e) => setUnitSel(e.target.value)}>
                <option>All Units</option>
                {units.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <p style={{ marginBottom: 0 }}>
            <button className="primary" disabled={!name.trim()} onClick={start}>▶️ Start / Restart Quiz</button>{" "}
            <button onClick={load}>🔄 Refresh quiz</button>{" "}
            {!name.trim() && <span className="muted">Enter your name to begin.</span>}
          </p>
        </div>
      )}

      {err && <div className="alert err">{err}</div>}

      {sections.map((sec) => {
        const res = results[sec.unit];
        return (
          <section key={sec.unit}>
            <h2>📘 {sec.unit} <span className="chip">{sec.ids.length} question(s)</span></h2>
            {!res ? (
              <>
                {sec.ids.map((id, pos) => {
                  const q = qById[id];
                  if (!q) return null;
                  return (
                    <div className="card" key={id}>
                      <b>Q{pos + 1}. {q.stem}</b>
                      <div style={{ marginTop: ".5rem" }}>
                        {q.option_order.map((l) => (
                          <label className="opt" key={l} style={{ color: "inherit", fontSize: "1rem", fontWeight: 400 }}>
                            <input type="radio" name={`q-${id}`} checked={responses[id] === l}
                                   onChange={() => setResponses((p) => ({ ...p, [id]: l }))} />
                            <span>{l}. {q.options[l]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button className="primary" disabled={busy === sec.unit} onClick={() => submitUnit(sec)}>
                  {busy === sec.unit ? "Submitting…" : `✅ Submit ${sec.unit}`}
                </button>
              </>
            ) : (
              <>
                <div className="metrics">
                  <div className="metric"><div className="v">{res.score} / {res.total}</div><div className="l">{sec.unit} score</div></div>
                  <div className="metric"><div className="v">{Math.round((res.score / res.total) * 100)}%</div><div className="l">Percentage</div></div>
                </div>
                <div className="progress"><div style={{ width: `${(res.score / res.total) * 100}%` }} /></div>
                {sec.ids.map((id, pos) => qById[id] && res.review[id] && <ReviewCard key={id} pos={pos} q={qById[id]} r={res.review[id]} />)}
                <button onClick={() => retakeUnit(sec)}>🔁 Retake {sec.unit} only</button>
              </>
            )}
            <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "1.5rem 0" }} />
          </section>
        );
      })}

      {overall && (
        <>
          <h2>📊 Overall Results</h2>
          <div className="metrics">
            <div className="metric"><div className="v">{overall.score} / {overall.total}</div><div className="l">Total score</div></div>
            <div className="metric"><div className="v">{Math.round(overall.pct)}%</div><div className="l">Percentage</div></div>
            <div className="metric"><div className="v">{sections.length}</div><div className="l">Units covered</div></div>
          </div>
          <div className="progress"><div style={{ width: `${overall.pct}%` }} /></div>
          {sections.length > 1 && (
            <>
              <h3>Unit-wise score points</h3>
              <Bars data={sections.map((s) => ({ name: s.unit, correct: results[s.unit].score, total: results[s.unit].total, pct: (results[s.unit].score / results[s.unit].total) * 100 }))} />
            </>
          )}
          <p><button className="primary" onClick={start}>🔄 Retake entire quiz (shuffled)</button></p>
        </>
      )}
    </>
  );
}
