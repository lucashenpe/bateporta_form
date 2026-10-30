import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };
const validToken = (token: string) => /^[A-Za-z0-9_-]{16,64}$/.test(token);

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  const base = process.env.API_URL?.replace(/\/$/, "");
  if (!base || !validToken(token)) return NextResponse.json({ message: "Link inválido ou API não configurada." }, { status: 400 });
  try {
    const response = await fetch(`${base}/api/v1/publico/cupons/${encodeURIComponent(token)}`, { cache: "no-store" });
    const data: unknown = await response.json().catch(() => null);
    if (data === null) return NextResponse.json({ message: "Resposta inválida da API." }, { status: 502 });
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Não foi possível consultar o cupom." }, { status: 502 });
  }
}
