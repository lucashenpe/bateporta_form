"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Cupom = { loja_nome: string; percentual: number; utilizado: boolean };
type Resgate = { autorizado: boolean; valor_compra_centavos: number; desconto_centavos: number; valor_final_centavos: number };
const money = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-700";
function errorMessage(value: unknown, fallback: string) {
  return value && typeof value === "object" && "message" in value && typeof value.message === "string" ? value.message : fallback;
}

export default function CupomResgateForm({ token }: { token: string }) {
  const validToken = /^[A-Za-z0-9_-]{16,64}$/.test(token);
  const [cupom, setCupom] = useState<Cupom>();
  const [loading, setLoading] = useState(validToken);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Resgate>();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [valor, setValor] = useState("");
  const [comprovante, setComprovante] = useState<File>();
  const operation = useRef("");

  useEffect(() => {
    if (!validToken) return;
    const controller = new AbortController();
    fetch(`/api/publico/cupons/${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(errorMessage(data, "Não foi possível consultar o cupom."));
        if (!data || typeof data !== "object" || !("loja_nome" in data) || typeof data.loja_nome !== "string" || !("percentual" in data) || typeof data.percentual !== "number" || !("utilizado" in data) || typeof data.utilizado !== "boolean") throw new Error("Dados do cupom inválidos.");
        setCupom(data as Cupom);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Falha de conexão."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, validToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || result || cupom?.utilizado) return;
    const cents = Math.round(Number(valor.replace(",", ".")) * 100);
    const phone = whatsapp.replace(/\D/g, "");
    if (!nome.trim() || nome.trim().length > 160 || !/^\d{10,11}$/.test(phone) || !Number.isSafeInteger(cents) || cents < 1 || cents > 100000000 || !comprovante || !["image/png", "image/jpeg"].includes(comprovante.type) || comprovante.size === 0 || comprovante.size > 5 * 1024 * 1024) {
      setError("Informe nome, WhatsApp, valor da compra e foto PNG ou JPEG de até 5 MB.");
      return;
    }
    if (!operation.current) operation.current = crypto.randomUUID();
    const form = new FormData();
    form.set("chave", operation.current);
    form.set("nome", nome.trim());
    form.set("whatsapp", phone);
    form.set("valor_compra_centavos", String(cents));
    form.set("comprovante", comprovante);
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/publico/cupons/${encodeURIComponent(token)}/resgate`, { method: "POST", body: form });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if ([400, 409, 413, 422].includes(response.status)) operation.current = "";
        throw new Error(errorMessage(data, "Não foi possível aplicar o desconto."));
      }
      if (!data || typeof data !== "object" || !("autorizado" in data) || data.autorizado !== true || !("valor_final_centavos" in data) || typeof data.valor_final_centavos !== "number") throw new Error("Resposta do resgate inválida. Tente novamente para confirmar.");
      setResult(data as Resgate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão. Tente novamente.");
    } finally { setSending(false); }
  }

  return <main className="min-h-screen bg-emerald-50 px-4 py-10 text-slate-900"><div className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Bate Porta</p>
    <h1 className="mt-2 text-3xl font-bold">Cupom de desconto</h1>
    {loading ? <p className="mt-6">Carregando cupom…</p> : <>
      {cupom && <div className="mt-6 rounded-2xl bg-emerald-50 p-5"><strong className="text-4xl text-emerald-800">{cupom.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</strong><p className="mt-1 text-sm">Loja: {cupom.loja_nome}</p></div>}
      {result ? <div className="mt-6 space-y-2 rounded-2xl bg-emerald-50 p-5"><h2 className="text-xl font-bold text-emerald-800">Desconto autorizado</h2><p>Compra: {money(result.valor_compra_centavos)}</p><p>Desconto: {money(result.desconto_centavos)}</p><p className="font-bold">Total: {money(result.valor_final_centavos)}</p><p className="text-sm">A confirmação será enviada por WhatsApp.</p></div> : cupom?.utilizado ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">Este cupom já foi utilizado.</p> : cupom && <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">Seu nome<input className={input} value={nome} maxLength={160} onChange={e => setNome(e.target.value)} required /></label>
        <label className="block text-sm font-semibold">WhatsApp com DDD<input className={input} type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required /></label>
        <label className="block text-sm font-semibold">Valor da compra (R$)<input className={input} type="number" min="0.01" max="1000000" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required /></label>
        <label className="block text-sm font-semibold">Foto do comprovante<input className={input} type="file" accept="image/png,image/jpeg" onChange={e => setComprovante(e.target.files?.[0])} required /></label>
        <button className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:opacity-50" disabled={sending}>{sending ? "Enviando…" : "Aplicar desconto"}</button>
      </form>}
      {(!validToken || error) && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{validToken ? error : "Link do cupom inválido."}</p>}
    </>}
  </div></main>;
}
