export const runtime = "edge";

export async function GET() {
  const url = process.env.SUPABASE_URL ?? null;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const key = process.env.SUPABASE_ANON_KEY ?? null;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;

  function mask(val: string | null) {
    if (!val) return null;
    return val.slice(0, 12) + "..." + val.slice(-6);
  }

  return Response.json({
    runtime: "edge",
    SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_URL: publicUrl,
    SUPABASE_ANON_KEY_masked: mask(key),
    NEXT_PUBLIC_SUPABASE_ANON_KEY_masked: mask(publicKey),
    all_empty: !url && !publicUrl && !key && !publicKey,
  });
}
