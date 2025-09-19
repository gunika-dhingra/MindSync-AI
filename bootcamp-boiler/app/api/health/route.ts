// app/api/health/route.ts - Health check endpoint

export async function GET() {
  return Response.json({
    ok: true,
    time: new Date().toISOString()
  });
}