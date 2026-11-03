"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Camera, CheckCircle2, ImagePlus, LoaderCircle, ShoppingBag, Ticket } from "lucide-react";

type Cupom = { loja_nome: string; percentual: number; utilizado: boolean };
type Resgate = { autorizado: boolean; valor_compra_centavos: number; desconto_centavos: number; valor_final_centavos: number };

const money = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const input = "h-14 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 text-base text-[#172b45] outline-none focus:border-[#25537d]";
const errorMessage = (value: unknown, fallback: string) => value && typeof value === "object" && "message" in value && typeof value.message === "string" ? value.message : fallback;

function purchaseCents(raw: string): number | null {
  if (!/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(raw)) return null;
  const cents = Number(raw.replace(/\D/g, ""));
  return Number.isSafeInteger(cents) && cents >= 1 && cents <= 100_000_000 ? cents : null;
}

function formatMoneyInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits);
  if (!Number.isSafeInteger(cents) || cents > 100_000_000) return null;
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
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
  const [pinLoja, setPinLoja] = useState("");
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

  function changeReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Escolha uma imagem JPG ou PNG de até 5 MB.");
      event.target.value = "";
      return;
    }
    setComprovante(file); operation.current = ""; setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || result || cupom?.utilizado) return;
    const cents = purchaseCents(valor);
    const phone = whatsapp.replace(/\D/g, "");
    if (!nome.trim() || nome.trim().length > 160 || !/^\d{10,11}$/.test(phone) || !/^\d{12}$/.test(pinLoja) || cents === null || !comprovante) {
      setError("Informe nome, WhatsApp, PIN da loja, valor da compra e comprovante válido.");
      return;
    }
    if (!operation.current) operation.current = createIdempotencyKey();
    const form = new FormData();
    form.set("chave", operation.current);
    form.set("nome", nome.trim());
    form.set("whatsapp", phone);
    form.set("pin_loja", pinLoja);
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

  return <main className="min-h-screen bg-[#f5f7fa] text-[#172b45]"><div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
    <aside className="bg-[#183659] px-6 py-10 text-white sm:px-10 lg:w-[36%] lg:px-12 lg:py-14">
      <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[#f6a23d] text-[#183659]"><ShoppingBag size={21} /></span><strong className="text-xl">bate<span className="text-[#f6a23d]">porta</span></strong></div>
      <div className="mt-10 lg:mt-16"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-[#ffd49d]"><Ticket size={14} /> CUPOM DE DESCONTO</span><h1 className="mt-6 text-3xl font-bold leading-tight">Use seu desconto nesta compra.</h1><p className="mt-4 text-sm leading-7 text-white/70">Informe os dados da compra e envie uma foto do comprovante para aplicar seu cupom.</p></div>
    </aside>
    <section className="flex-1 px-5 py-10 sm:px-10 lg:px-14 lg:py-14"><div className="mx-auto max-w-2xl">
      {loading ? <p role="status" className="flex items-center gap-2 text-sm text-[#64758a]"><LoaderCircle size={20} className="animate-spin" /> Carregando cupom…</p> : <>
        {result ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto text-[#25815d]" size={60} /><h2 className="mt-6 text-3xl font-bold">Desconto autorizado!</h2><p className="mt-3 text-sm text-[#64758a]">A confirmação será enviada por WhatsApp.</p><div className="mt-7 space-y-3 rounded-xl border border-[#e0e6ed] bg-white p-5 text-left"><p className="flex justify-between gap-3"><span>Valor da compra</span><strong>{money(result.valor_compra_centavos)}</strong></p><p className="flex justify-between gap-3"><span>Desconto</span><strong>{money(result.desconto_centavos)}</strong></p><p className="flex justify-between gap-3 border-t border-[#e0e6ed] pt-3 font-bold"><span>Total</span><strong>{money(result.valor_final_centavos)}</strong></p></div></div> : <>
          <h2 className="text-3xl font-bold">Aplicar cupom de desconto</h2>
          <p className="mt-2 text-sm text-[#64758a]">Confira o benefício e preencha os dados da compra.</p>
          {cupom && <div className="mt-7 rounded-2xl border border-[#dbe3ec] bg-white p-5"><strong className="text-2xl text-[#183659]">{cupom.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de desconto</strong><p className="mt-1 text-sm text-[#64758a]">Loja: {cupom.loja_nome}</p></div>}
          {cupom?.utilizado ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Este cupom já foi utilizado.</p> : cupom && <form className="mt-7 space-y-5" onSubmit={submit}>
            <div><label htmlFor="nome" className="mb-2 block text-sm font-semibold">Seu nome</label><input id="nome" className={input} value={nome} maxLength={160} autoComplete="name" onChange={e => { setNome(e.target.value); operation.current = ""; }} required /></div>
            <div><label htmlFor="whatsapp" className="mb-2 block text-sm font-semibold">WhatsApp com DDD</label><input id="whatsapp" className={input} type="tel" inputMode="tel" autoComplete="tel-national" value={whatsapp} onChange={e => { setWhatsapp(e.target.value); operation.current = ""; }} required /></div>
            <div><label htmlFor="pin-loja" className="mb-2 block text-sm font-semibold">PIN da loja</label><input id="pin-loja" className={input} type="text" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} autoComplete="off" value={pinLoja} onChange={e => { setPinLoja(e.target.value.replace(/\D/g, "").slice(0, 12)); operation.current = ""; }} placeholder="12 dígitos" required /><p className="mt-2 text-xs text-[#718195]">Peça o PIN da loja onde o desconto será aplicado.</p></div>
            <div><label htmlFor="valor" className="mb-2 block text-sm font-semibold">Valor da compra</label><div className="flex h-14 items-center rounded-xl border border-[#cbd5e1] bg-white px-4 focus-within:border-[#25537d]"><span className="text-sm font-semibold text-[#64758a]">R$</span><input id="valor" type="text" inputMode="numeric" className="h-full min-w-0 flex-1 bg-transparent pl-2 text-base outline-none" value={valor} onChange={e => { const formatted = formatMoneyInput(e.target.value); if (formatted !== null) { setValor(formatted); operation.current = ""; } }} placeholder="0,00" required /></div></div>
            <div><h3 className="text-base font-bold">Comprovante da compra</h3><p className="mt-1 text-xs text-[#718195]">Escolha uma foto legível da nota ou recibo. JPG ou PNG, até 5 MB.</p><input id="comprovante-galeria" type="file" accept="image/jpeg,image/png" className="sr-only" onChange={changeReceipt} /><input id="comprovante-camera" type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={changeReceipt} /><div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-[#c7d5e2] bg-white"><label htmlFor="comprovante-galeria" className="flex min-h-12 cursor-pointer items-center justify-center gap-2 bg-[#183659] px-3 text-sm font-semibold text-white transition hover:bg-[#25537d]"><ImagePlus size={18} /> Galeria</label><label htmlFor="comprovante-camera" className="flex min-h-12 cursor-pointer items-center justify-center gap-2 px-3 text-sm font-semibold text-[#183659] transition hover:bg-[#eef3f8]"><Camera size={18} /> Câmera</label></div>{comprovante && <p className="mt-3 truncate rounded-lg bg-[#eef3f8] px-3 py-2 text-sm font-medium text-[#21476c]">Arquivo selecionado: {comprovante.name}</p>}</div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={sending || purchaseCents(valor) === null || !/^\d{12}$/.test(pinLoja) || !comprovante} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ef9431] font-bold text-[#183659] disabled:opacity-50">{sending ? <><LoaderCircle size={20} className="animate-spin" /> Enviando…</> : <>Aplicar desconto <ArrowRight size={19} /></>}</button>
          </form>}
        </>}
        {(!validToken || error && (!cupom || !!result)) && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{validToken ? error : "Link do cupom inválido."}</p>}
      </>}
    </div></section>
  </div></main>;
}
