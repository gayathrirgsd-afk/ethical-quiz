import crypto from "crypto";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

// Instructor-only routes send the password in the x-instructor-password header.
export function isInstructor(req) {
  const expected = process.env.INSTRUCTOR_PASSWORD;
  if (!expected) return process.env.NODE_ENV !== "production"; // open in local dev only
  const given = req.headers.get("x-instructor-password") || "";
  return crypto.timingSafeEqual(sha(given), sha(expected));
}
