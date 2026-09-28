import { NextResponse } from "next/server";
import { isInstructor } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isInstructor(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, configured: Boolean(process.env.INSTRUCTOR_PASSWORD) });
}
