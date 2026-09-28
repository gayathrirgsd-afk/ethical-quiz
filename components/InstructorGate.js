"use client";
import { useEffect, useState } from "react";
import { getPw, setPw } from "../lib/client";

// Wraps instructor-only pages. Shows a password box unless the server accepts the stored password.
export default function InstructorGate({ children }) {
  const [state, setState] = useState("checking"); // checking | locked | open
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [configured, setConfigured] = useState(true);

  async function verify(pw, silent) {
    try {
      const r = await fetch("/api/auth", { headers: { "x-instructor-password": pw }, cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setConfigured(d.configured);
        setPw(pw);
        setState("open");
      } else {
        setState("locked");
        if (!silent) setErr("Wrong password");
      }
    } catch {
      setState("locked");
      if (!silent) setErr("Could not reach the server");
    }
  }

  useEffect(() => { verify(getPw(), true); }, []);

  if (state === "checking") return <p className="muted">Checking access…</p>;
  if (state === "locked") {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h2 style={{ marginTop: 0 }}>🔒 Instructor login</h2>
        <label>Password</label>
        <input type="password" value={input} onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && verify(input, false)} autoFocus />
        {err && <div className="alert err">{err}</div>}
        <p><button className="primary" onClick={() => verify(input, false)}>Unlock</button></p>
        <p className="muted">The password is the INSTRUCTOR_PASSWORD environment variable set on the server.</p>
      </div>
    );
  }
  return (
    <>
      {!configured && <div className="alert warn">INSTRUCTOR_PASSWORD is not set — anyone can use this page. This is only allowed in local development.</div>}
      {children}
    </>
  );
}
