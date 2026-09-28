"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import InstructorGate from "../../components/InstructorGate";
import { authHeaders } from "../../lib/client";

function Dashboard() {
  const [attempts, setAttempts] = useState([]);
  const [persistent, setPersistent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [student, setStudent] = useState("All students");
  const [unit, setUnit] = useState("All");
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/attempts", { headers: authHeaders(), cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      setAttempts(d.attempts);
      setPersistent(d.persistent);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const names = useMemo(() => [...new Set(attempts.map((a) => a.student_name))].sort(), [attempts]);
  const unitsSeen = useMemo(() => [...new Set(attempts.map((a) => a.unit_filter))].sort(), [attempts]);
  const filtered = useMemo(
    () => attempts.filter((a) => (student === "All students" || a.student_name === student) && (unit === "All" || a.unit_filter === unit)),
    [attempts, student, unit]
  );

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const pcts = filtered.map((a) => Number(a.percentage));
    const byUnit = {};
    filtered.forEach((a) => Object.entries(a.unit_breakdown || {}).forEach(([u, b]) => {
      const x = (byUnit[u] ||= { correct: 0, total: 0 });
      x.correct += b.correct; x.total += b.total;
    }));
    return {
      avg: pcts.reduce((s, v) => s + v, 0) / pcts.length,
      best: Math.max(...pcts),
      byUnit: Object.entries(byUnit).map(([name, b]) => ({ name, ...b, pct: b.total ? (b.correct / b.total) * 100 : 0 })),
    };
  }, [filtered]);

  async function clearAll() {
    await fetch("/api/attempts", { method: "DELETE", headers: authHeaders() });
    setConfirm(false);
    load();
  }

  if (loading) return <p className="muted">Loading…</p>;
  return (
    <>
      <h1>📊 Score Dashboard</h1>
      {!persistent && <div className="alert warn"><b>No database connected</b> — attempts are held in temporary memory only. See README to connect Upstash Redis.</div>}
      {err && <div className="alert err">{err}</div>}
      <div className="card">
        <div className="row">
          <div><label>Student</label>
            <select value={student} onChange={(e) => setStudent(e.target.value)}><option>All students</option>{names.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label>Unit taken</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}><option>All</option>{unitsSeen.map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <p style={{ marginBottom: 0 }}><button onClick={load}>🔄 Refresh</button> <span className="muted">(auto-refreshes every 20 s)</span></p>
      </div>

      {!stats ? (
        <div className="alert info">No attempts recorded yet (or none match the filter).</div>
      ) : (
        <>
          <div className="metrics">
            <div className="metric"><div className="v">{filtered.length}</div><div className="l">Attempts</div></div>
            <div className="metric"><div className="v">{Math.round(stats.avg)}%</div><div className="l">Average score</div></div>
            <div className="metric"><div className="v">{Math.round(stats.best)}%</div><div className="l">Best score</div></div>
          </div>
          {stats.byUnit.length > 0 && (
            <>
              <h3>Average performance by unit</h3>
              <div className="bars">
                {stats.byUnit.map((d) => (
                  <div className="bar" key={d.name}>
                    <span className="name" title={d.name}>{d.name}</span>
                    <span className="track"><span className="fill" style={{ width: `${d.pct}%`, display: "block" }} /></span>
                    <span className="pct">{Math.round(d.pct)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <h3>Attempt history</h3>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Time</th><th>Student</th><th>Unit</th><th>Score</th><th>%</th></tr></thead>
              <tbody>
                {[...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((a, i) => (
                  <tr key={i}>
                    <td>{new Date(a.timestamp).toLocaleString()}</td><td>{a.student_name}</td><td>{a.unit_filter}</td>
                    <td>{a.score}/{a.total}</td><td>{a.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {attempts.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <b>🧹 Clear all recorded attempts</b>
          <p className="muted">This permanently deletes every student's history.</p>
          <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I understand this cannot be undone
          </label>
          <p><button className="danger" disabled={!confirm} onClick={clearAll}>Delete all history</button></p>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return <InstructorGate><Dashboard /></InstructorGate>;
}
