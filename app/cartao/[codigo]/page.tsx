import type { Metadata } from "next";
import Image from "next/image";
import styles from "./cartao.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Meu cartão digital | Bate Porta",
  description: "Consulte seu benefício e apresente o cartão na loja.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Card = {
  nome: string;
  codigo: string;
  campanha: string;
  descricao: string;
  loja: string;
  tipo: "FIDELIDADE" | "CASHBACK" | "CUPOM_DESCONTO";
  tipo_label: string;
  beneficio: string;
  compras: number;
  compras_necessarias: number;
  imagem_url: string;
  utilizado: boolean;
  qr_code_base64: string;
};

function validCard(value: unknown): value is Card {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const card = value as Record<string, unknown>;
  return ["nome", "codigo", "campanha", "descricao", "loja", "tipo_label", "beneficio", "imagem_url"].every(key => typeof card[key] === "string")
    && ["FIDELIDADE", "CASHBACK", "CUPOM_DESCONTO"].includes(String(card.tipo))
    && typeof card.compras === "number" && typeof card.compras_necessarias === "number" && typeof card.utilizado === "boolean"
    && typeof card.qr_code_base64 === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(card.qr_code_base64);
}

async function loadCard(code: string): Promise<Card | "SERVICE_UNAVAILABLE" | null> {
  if (!/^(FI|CB|CD)-[A-Z0-9-]{8,28}$/.test(code)) return null;
  const base = process.env.API_URL?.replace(/\/$/, "") || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8080" : "");
  if (!base) return "SERVICE_UNAVAILABLE";
  try {
    const response = await fetch(`${base}/api/v1/publico/vouchers/cartao/${encodeURIComponent(code)}`, { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) return "SERVICE_UNAVAILABLE";
    const data: unknown = await response.json();
    return validCard(data) ? data : "SERVICE_UNAVAILABLE";
  } catch { return "SERVICE_UNAVAILABLE"; }
}

export default async function CartaoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const card = await loadCard(codigo.toUpperCase());
  if (card === "SERVICE_UNAVAILABLE") return <main className={styles.missing}><span className={styles.eyebrow}>Bate Porta · Benefícios</span><h1>Não foi possível carregar o cartão</h1><p>Tente atualizar a página em alguns instantes.</p></main>;
  if (!card) return <main className={styles.missing}><span className={styles.eyebrow}>Bate Porta · Benefícios</span><h1>Cartão não encontrado</h1><p>Confira o link recebido pelo WhatsApp e tente novamente.</p></main>;

  const loyalty = card.tipo === "FIDELIDADE";
  const target = Math.max(0, card.compras_necessarias);
  const purchases = Math.max(0, card.compras);
  const benefit = loyalty && target > 0 ? `${Math.min(purchases, target)} de ${target} compras` : card.beneficio;
  const guidance = card.utilizado
    ? loyalty || card.tipo === "CASHBACK" ? "Limite de uso atingido. Este cartão não aceita novas compras." : "Este cupom já foi utilizado ou enviado para revisão."
    : `Apresente este cartão na loja ${card.loja}.`;

  return <main className={styles.main}>
    <section className={styles.intro} aria-labelledby="page-title">
      <span className={styles.eyebrow}>Bate Porta · Benefícios</span>
      <h1 id="page-title">Seu benefício,<br /><em>sempre com você.</em></h1>
    </section>
    <div>
      <div className={styles.scene}>
        <article className={`${styles.card} ${card.tipo === "CASHBACK" ? styles.cashbackCard : card.tipo === "CUPOM_DESCONTO" ? styles.discountCard : ""}`} aria-label={`${card.tipo_label} de ${card.nome}`}>
          <div className={styles.cardInner}>
            <div className={styles.top}><div className={styles.brand}><span className={styles.brandicon} aria-hidden="true">✦</span>Bate Porta</div><span className={styles.type}>{card.tipo_label}</span></div>
            <div className={styles.middle}><span className={styles.kicker}><span className={card.utilizado ? styles.dotUsed : styles.dot} aria-hidden="true" />{card.utilizado ? "Benefício indisponível" : "Seu cartão digital"}</span><h2>{card.campanha}</h2><div className={styles.benefit}>{benefit}</div></div>
            <div className={styles.divider} />
            <div className={styles.benefitQrShell}><Image unoptimized src={card.qr_code_base64} alt={`QR code do cartão ${card.codigo} para o atendente ler`} width={512} height={512} className={styles.benefitQrImage} /></div>
            <p className={styles.benefitScanLabel}>ATENDENTE: LEIA O QR CODE</p>
            <div className={styles.bottom}><div><span className={styles.label}>Titular</span><span className={styles.value}>{card.nome}</span></div><div><span className={styles.label}>Código</span><span className={styles.code}>{card.codigo}</span></div></div>
          </div>
        </article>
      </div>
      <p className={styles.foot}><strong>Como usar:</strong> {guidance}</p>
    </div>
  </main>;
}
