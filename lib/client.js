export function getPw() {
  try { return sessionStorage.getItem("instructorPw") || ""; } catch { return ""; }
}
export function setPw(v) {
  try { sessionStorage.setItem("instructorPw", v); } catch {}
}
export function authHeaders(extra = {}) {
  return { "x-instructor-password": getPw(), ...extra };
}
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
