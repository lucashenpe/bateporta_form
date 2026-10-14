import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };
const validToken = (token: string) => /^[A-Za-z0-9_-]{16,64}$/.test(token);

function apiUrl(token: string) {
  const base = process.env.API_URL?.replace(/\/$/, "");
  return base && validToken(token) ? `${base}/api/v1/publico/vouchers/cadastro/${encodeURIComponent(token)}` : null;
}

async function relay(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  if (data === null) return NextResponse.json({ message: "Resposta inválida da API. Tente novamente." }, { status: 502 });
  return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: NextRequest, { params }: Context) {
  const { token } = await params;
  const url = apiUrl(token);
  if (!url) return NextResponse.json({ message: "Link inválido ou API não configurada." }, { status: 400 });
  try {
    return relay(await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" }));
  } catch {
    return NextResponse.json({ message: "Não foi possível consultar a campanha. Tente novamente." }, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { token } = await params;
  const url = apiUrl(token);
  if (!url) return NextResponse.json({ message: "Link inválido ou API não configurada." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
    const fields = body as Record<string, unknown>;
    const nome = typeof fields.nome === "string" ? fields.nome.trim() : "";
    const whatsapp = typeof fields.whatsapp === "string" ? fields.whatsapp.replace(/\D/g, "") : "";
    const cep = typeof fields.cep === "string" ? fields.cep.replace(/\D/g, "") : "";
    const animal = typeof fields.animal === "string" ? fields.animal.trim() : "";
    const raca = typeof fields.raca === "string" ? fields.raca.trim() : "";
    if (!nome || nome.length > 160 || !/^\d{10,13}$/.test(whatsapp) || !/^\d{8}$/.test(cep) || !animal || animal.length > 80 || !raca || raca.length > 100) {
      return NextResponse.json({ message: "Informe nome, WhatsApp, CEP, animal e raça válidos." }, { status: 400 });
    }
    return relay(await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ nome, whatsapp, cep, animal, raca }), cache: "no-store" }));
  } catch {
    return NextResponse.json({ message: "Não foi possível concluir o cadastro. Tente novamente." }, { status: 502 });
  }
}
