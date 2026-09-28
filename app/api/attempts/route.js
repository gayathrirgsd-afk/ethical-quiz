import { NextResponse } from "next/server";
import { getAttempts, clearAttempts, persistent } from "../../../lib/store";
import { isInstructor } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isInstructor(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ attempts: await getAttempts(), persistent }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req) {
  if (!isInstructor(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearAttempts();
  return NextResponse.json({ ok: true });
}
