import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runImportStep } from "@/lib/importer";

// Vercel allows up to 300s with Fluid compute (the default). We stop starting
// new work after ~50s so each call returns progress promptly.
export const maxDuration = 300;

export async function POST() {
  if (!(await getSession())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  try {
    return NextResponse.json(await runImportStep(Date.now() + 50_000));
  } catch (e) {
    console.error("Import step failed:", e instanceof Error ? e.message : "unknown error");
    return NextResponse.json({ error: "Import failed. Check Settings for details." }, { status: 500 });
  }
}
