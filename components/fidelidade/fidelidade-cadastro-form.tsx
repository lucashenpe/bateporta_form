"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Heart, LoaderCircle, MapPin, PawPrint, ShieldCheck } from "lucide-react";

type TipoVoucher = "FIDELIDADE" | "CASHBACK" | "CUPOM_DESCONTO";
type Consulta = { tipo: TipoVoucher; campanha: string; descricao: string; loja: string; disponivel: number };

const nomeTipo: Record<TipoVoucher, string> = {
  FIDELIDADE: "Clube de fidelidade",
  CASHBACK: "Cashback",
  CUPOM_DESCONTO: "Cupom de desconto",
};

const racas: Record<string, string[]> = {
  Cachorro: ["Sem raça definida (vira-lata)", "Beagle", "Border Collie", "Bulldog Francês", "Chihuahua", "Dachshund", "Golden Retriever", "Labrador Retriever", "Lhasa Apso", "Maltês", "Pastor Alemão", "Pinscher", "Poodle", "Pug", "Rottweiler", "Shih Tzu", "Spitz Alemão", "Yorkshire Terrier", "Outra raça"],
  Gato: ["Sem raça definida", "Angorá", "Bengal", "Maine Coon", "Persa", "Ragdoll", "Siamês", "Sphynx", "Outra raça"],
  Pássaro: ["Calopsita", "Canário", "Periquito", "Papagaio", "Agapornis", "Outra raça"],
  Coelho: ["Sem raça definida", "Angorá", "Holandês", "Mini Lop", "Rex", "Outra raça"],
  Peixe: ["Betta", "Carpa", "Guppy", "Kinguios", "Tetra", "Outra espécie"],
  Roedor: ["Hamster", "Porquinho-da-índia", "Chinchila", "Gerbil", "Outra espécie"],
  Réptil: ["Jabuti", "Tartaruga", "Iguana", "Gecko", "Outra espécie"],
  Outro: ["Não informada", "Outra raça"],
};

const input = "h-13 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 text-base text-[#172b45] outline-none transition placeholder:text-[#9aabba] focus:border-[#25537d] focus:ring-4 focus:ring-[#25537d]/10";
const endpoint = (token: string) => `/api/publico/fidelidade/${encodeURIComponent(token)}`;
function message(data: unknown, fallback: string) {
  return data && typeof data === "object" && "message" in data && typeof data.message === "string" ? data.message : fallback;
}
function validConsulta(data: unknown): data is Consulta {
  if (!data || typeof data !== "object") return false;
  const value = data as Partial<Consulta>;
  return (value.tipo === "FIDELIDADE" || value.tipo === "CASHBACK" || value.tipo === "CUPOM_DESCONTO") && typeof value.campanha === "string" && typeof value.descricao === "string" && typeof value.loja === "string" && typeof value.disponivel === "number";
}
function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export default function FidelidadeCadastroForm({ token }: { token?: string }) {
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [animal, setAnimal] = useState("");
  const [raca, setRaca] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(endpoint(token), { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(message(data, "Não foi possível consultar esta campanha."));
        if (!validConsulta(data)) throw new Error("A campanha retornou dados incompletos. Tente novamente.");
        setConsulta(data);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Falha de conexão. Tente novamente."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || (consulta && consulta.disponivel <= 0)) return;
    const phone = whatsapp.replace(/\D/g, "");
    const postal = cep.replace(/\D/g, "");
    if (!nome.trim() || (phone.length !== 10 && phone.length !== 11) || postal.length !== 8 || !animal || !raca) {
      setError("Preencha todos os campos com dados válidos.");
      return;
    }
    if (!token) {
      setError("O cadastro será liberado quando esta página estiver vinculada ao QR Code da campanha.");
      return;
    }
    lock.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch(endpoint(token), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim(), whatsapp: phone, cep: postal, animal, raca }) });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(message(data, "Não foi possível concluir o cadastro. Tente novamente."));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão. Tente novamente.");
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return <main className="min-h-screen bg-[#f5f7fa] text-[#172b45]">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
      <section className="relative overflow-hidden bg-[#183659] px-6 pb-12 pt-8 text-white sm:px-10 lg:flex lg:w-[43%] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full border-[50px] border-white/[0.035]" aria-hidden="true" />
        <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full border-[55px] border-white/[0.035]" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[#f6a23d] text-[#183659]"><PawPrint size={23} strokeWidth={2.5} /></span><span className="text-lg font-bold tracking-tight">bate<span className="text-[#f6a23d]">porta</span></span></div>
          <div className="mt-11 max-w-md lg:mt-24"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#ffd49d]"><Heart size={14} /> {consulta ? nomeTipo[consulta.tipo].toUpperCase() : "BENEFÍCIOS PARA SEU PET"}</span><h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">Seu pet merece fazer parte.</h1><p className="mt-4 max-w-sm text-sm leading-7 text-white/70 sm:text-base">Preencha seus dados e receba seu código pelo WhatsApp.</p></div>
        </div>
        <div className="relative mt-10 hidden items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 lg:flex"><ShieldCheck className="mt-0.5 shrink-0 text-[#f6a23d]" size={20} /><p className="text-sm leading-6 text-white/75">Guarde seu código e apresente na loja participante.</p></div>
      </section>

      <section className="relative -mt-5 flex-1 rounded-t-[26px] bg-[#f5f7fa] px-5 pb-10 pt-8 sm:px-10 lg:mt-0 lg:flex lg:items-center lg:rounded-none lg:px-14 lg:py-14"><div className="mx-auto w-full max-w-xl">
        {loading ? <div role="status" className="flex items-center gap-3 text-[#64758a]"><LoaderCircle className="animate-spin" size={22} /> Carregando campanha...</div> : !consulta && token ? <div><div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#e8eff8] text-[#21476c]"><PawPrint size={27} /></div><h2 className="text-2xl font-bold">Cadastro indisponível</h2><p role="alert" className="mt-3 text-sm text-[#64758a]">{error}</p></div> : success && consulta ? <div role="status"><div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#d9eee7] text-[#237957]"><CheckCircle2 size={32} /></div><h2 className="text-3xl font-bold tracking-tight">Cadastro concluído!</h2><p className="mt-3 text-sm leading-7 text-[#64758a]">Seu código será enviado pelo WhatsApp. Guarde-o para apresentar em <strong className="text-[#183659]">{consulta.loja}</strong>.</p></div> : <>
          <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-[#e8eff8] text-[#21476c]"><PawPrint size={27} /></div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#b4742e]">{consulta?.loja || "Cadastro de cliente"}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{consulta?.campanha || "Cadastre-se para receber seu benefício"}</h2>
          {consulta?.descricao && <p className="mt-2 text-sm leading-6 text-[#64758a]">{consulta.descricao}</p>}
          {!token && <p className="mt-3 text-sm leading-6 text-[#64758a]">Preencha seus dados. O envio será habilitado quando o QR Code da campanha estiver conectado.</p>}
          {consulta && consulta.disponivel <= 0 ? <p role="status" className="mt-7 rounded-xl border border-[#e6d7bc] bg-[#fff8eb] p-4 text-sm text-[#785622]">Não há mais vouchers disponíveis nesta loja. Consulte a loja para saber quando haverá novas vagas.</p> : <form onSubmit={submit} className="mt-8 space-y-5">
            <div><label htmlFor="nome" className="mb-2 block text-sm font-semibold">Seu nome</label><input id="nome" name="nome" required maxLength={160} autoComplete="name" value={nome} onChange={e => { setNome(e.target.value); setError(""); }} placeholder="Nome completo" className={input} /></div>
            <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="whatsapp" className="mb-2 block text-sm font-semibold">WhatsApp</label><input id="whatsapp" name="whatsapp" required type="tel" inputMode="tel" autoComplete="tel-national" value={whatsapp} onChange={e => { setWhatsapp(formatWhatsapp(e.target.value)); setError(""); }} placeholder="(00) 00000-0000" maxLength={15} className={input} /></div><div><label htmlFor="cep" className="mb-2 block text-sm font-semibold">CEP</label><input id="cep" name="cep" required inputMode="numeric" autoComplete="postal-code" value={cep} onChange={e => { setCep(formatCep(e.target.value)); setError(""); }} placeholder="00000-000" maxLength={9} className={input} /></div></div>
            <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="animal" className="mb-2 block text-sm font-semibold">Tipo de animal</label><select id="animal" name="animal" required value={animal} onChange={e => { setAnimal(e.target.value); setRaca(""); setError(""); }} className={input}><option value="">Selecione o animal</option>{Object.keys(racas).map(item => <option key={item} value={item}>{item}</option>)}</select></div><div><label htmlFor="raca" className="mb-2 block text-sm font-semibold">Raça</label><select id="raca" name="raca" required disabled={!animal} value={raca} onChange={e => { setRaca(e.target.value); setError(""); }} className={`${input} disabled:bg-[#edf1f5] disabled:text-[#8998a8]`}><option value="">{animal ? "Selecione a raça" : "Escolha o animal primeiro"}</option>{(racas[animal] || []).map(item => <option key={item} value={item}>{item}</option>)}</select></div></div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={sending || !token} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ef9431] px-5 font-bold text-[#183659] shadow-sm transition hover:bg-[#f5a64f] disabled:opacity-60">{sending ? <><LoaderCircle size={20} className="animate-spin" /> Enviando...</> : <>Receber meu código <ArrowRight size={19} /></>}</button>
            <p className="flex items-start gap-2 text-xs leading-5 text-[#77879a]"><MapPin size={15} className="mt-0.5 shrink-0" /> Seu código será enviado por WhatsApp após o cadastro.</p>
          </form>}
        </>}
      </div></section>
    </div>
  </main>;
}
