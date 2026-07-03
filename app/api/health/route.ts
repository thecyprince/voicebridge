import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Env vars the app cannot run without. Names must stay in sync with
// scripts/sync-secrets.sh (the Doppler → Vercel key list).
const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GLADIA_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_VECTOR_REST_URL",
  "UPSTASH_VECTOR_REST_TOKEN",
];

// Detects the 2026-06-26 failure mode: Vercel holding empty-string copies of
// secrets after silent Doppler disconnection. Reports names only, never values.
// An empty string and an unset var are both failures at runtime.
export async function GET() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

  return NextResponse.json(
    {
      ok: missing.length === 0,
      ts: new Date().toISOString(),
      missingOrEmpty: missing,
      checked: REQUIRED_ENV.length,
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
