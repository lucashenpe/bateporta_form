import type { Metadata } from "next";
import Image from "next/image";
import styles from "./cartao.module.css";
import AtualizarCartao from "./atualizar-cartao";

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
  const progress = target > 0 ? Math.min(100, Math.round(purchases / target * 100)) : 0;
  const remaining = Math.max(0, target - purchases);
  const image = card.imagem_url.startsWith("https://") ? card.imagem_url : "";
  if (loyalty) {
    const visible = Math.min(target, 20);
    const firstStamp = target > 20 ? Math.max(1, Math.min(target - 19, Math.floor(Math.max(0, Math.min(purchases, target) - 1) / 20) * 20 + 1)) : 1;
    const stamps = Array.from({ length: visible }, (_, index) => firstStamp + index);
    return <main className={styles.walletPage}>
      <header className={styles.walletHeader}>
        <Image className={styles.walletBrandLogo} src="/logo-bate-porta.png" alt="Bate Porta" width={844} height={348} priority />
        <span className={styles.walletHeaderTag}>Seu cartão digital</span>
      </header>
      <section className={styles.walletContent} aria-labelledby="walletTitle">
        <div className={styles.walletIntro}>
          <span className={styles.walletEyebrow}>CLUBE DE FIDELIDADE</span>
          <h1 id="walletTitle">Cada compra conta.</h1>
          <p>Apresente este cartão na loja e acompanhe suas marcações.</p>
        </div>
        <div className={styles.walletStack}>
          <div className={styles.stackBackOne} aria-hidden="true" />
          <div className={styles.stackBackTwo} aria-hidden="true" />
          <article className={styles.loyaltyCard} aria-label={`Cartão de fidelidade de ${card.nome}`}>
            <div className={styles.loyaltyTop}>
              <div className={styles.loyaltyStore}><span className={styles.loyaltyStoreIcon} aria-hidden="true">✦</span><div><span className={styles.loyaltySmallLabel}>CARTÃO FIDELIDADE</span><strong>{card.loja || card.campanha}</strong></div></div>
              <div className={styles.loyaltyCount}><span>COMPRAS</span><strong>{purchases}<i> / </i>{target || "—"}</strong></div>
            </div>
            <div className={styles.stampArea}>
              {image && <Image unoptimized className={styles.stampImage} src={image} alt="" width={540} height={280} />}
              <div className={styles.stampShade} />
              <div className={styles.stampContent}>
                <div className={styles.campaignLine}><span>{card.campanha}</span></div>
                {target > 0 ? <>
                  {target > 20 && <p className={styles.stampRange}>Marcações {firstStamp}–{firstStamp + visible - 1} de {target}</p>}
                  <ol className={styles.stamps} aria-label="Marcações de compras">
                    {stamps.map(number => <li key={number} className={number <= purchases ? styles.stampDone : styles.stampPending} aria-label={`Compra ${number} ${number <= purchases ? "registrada" : "pendente"}`}><span aria-hidden="true">{number <= purchases ? "✓" : number}</span></li>)}
                  </ol>
                </> : <p className={styles.noGoal}>Suas compras registradas aparecem aqui.</p>}
              </div>
            </div>
            <div className={styles.loyaltyLower}>
              <div className={styles.loyaltyProgress}><div><span>PROGRESSO</span><strong>{target > 0 ? `${Math.min(purchases, target)} de ${target}` : `${purchases} compras`}</strong></div><div><span>TITULAR</span><strong>{card.nome}</strong></div></div>
              {target > 0 && <div className={styles.loyaltyTrack} role="progressbar" aria-valuenow={Math.min(purchases, target)} aria-valuemin={0} aria-valuemax={target} aria-label="Compras registradas"><span style={{ width: `${progress}%` }} /></div>}
              <div className={styles.qrShell}><Image unoptimized src={card.qr_code_base64} alt={`QR code do cartão ${card.codigo} para o atendente ler`} width={512} height={512} className={styles.qrImage} /></div>
              <p className={styles.scanLabel}>ATENDENTE: LEIA O QR CODE</p>
              <strong className={styles.loyaltyCode}>{card.codigo}</strong>
            </div>
          </article>
        </div>
        <div className={styles.walletFooter}>
          <p className={styles.walletStatus}>{card.utilizado ? "Limite de uso atingido. Este cartão não aceita novas compras." : target > 0 ? `Faltam ${remaining} ${remaining === 1 ? "compra" : "compras"} para completar seu cartão.` : "Acompanhe aqui suas compras registradas."}</p>
          <p>{card.utilizado ? "Consulte a loja para saber mais sobre o benefício." : "O atendente pode ler o QR code ou digitar o código impresso abaixo dele. As marcações são atualizadas após a confirmação da compra."}</p>
          <AtualizarCartao className={styles.refreshButton} />
          {card.descricao && <p className={styles.walletDescription}>{card.descricao}</p>}
        </div>
      </section>
    </main>;
  }
  return <main className={styles.main}>
    <section className={styles.intro} aria-labelledby="page-title">
      <span className={styles.eyebrow}>Bate Porta · Benefícios</span>
      <h1 id="page-title">Seu benefício,<br /><em>sempre com você.</em></h1>
      <p>Guarde esta página e apresente o QR code ou o código na loja quando for usar seu benefício.</p>
      <div className={styles.storeline}><span className={styles.storemark} aria-hidden="true">✦</span><span>{card.loja}</span></div>
      {card.descricao && <p className={styles.description}>{card.descricao}</p>}
    </section>
    <div>
      <div className={styles.scene}>
        <article className={`${styles.card} ${card.tipo === "CASHBACK" ? styles.cashbackCard : styles.discountCard}`} aria-label={`${card.tipo_label} de ${card.nome}`}>
          <div className={styles.cardInner}>
            <div className={styles.top}><div className={styles.brand}><span className={styles.brandicon} aria-hidden="true">✦</span>Bate Porta</div><span className={styles.type}>{card.tipo_label}</span></div>
            {image && <Image unoptimized className={styles.campaignImage} src={image} alt={`Imagem da campanha ${card.campanha}`} width={350} height={112} />}
            <div className={styles.middle}><span className={styles.kicker}><span className={card.utilizado ? styles.dotUsed : styles.dot} aria-hidden="true" />{card.utilizado ? "Benefício indisponível" : "Seu cartão digital"}</span><h2>{card.campanha}</h2><div className={styles.benefit}>{card.beneficio}</div></div>
            <div className={styles.divider} />
            <div className={styles.benefitQrShell}><Image unoptimized src={card.qr_code_base64} alt={`QR code do cartão ${card.codigo} para o atendente ler`} width={512} height={512} className={styles.benefitQrImage} /></div>
            <p className={styles.benefitScanLabel}>ATENDENTE: LEIA O QR CODE</p>
            <div className={styles.bottom}><div><span className={styles.label}>Titular</span><span className={styles.value}>{card.nome}</span></div><div><span className={styles.label}>Código</span><span className={styles.code}>{card.codigo}</span></div></div>
          </div>
        </article>
      </div>
      {loyalty && target > 0 ? <section className={styles.progress} aria-label="Progresso do cartão de fidelidade"><div className={styles.progressHeading}><strong>{purchases} de {target} compras</strong><span>{remaining === 0 ? "Meta alcançada" : `${remaining} ${remaining === 1 ? "compra restante" : "compras restantes"}`}</span></div><div className={styles.progressTrack} role="progressbar" aria-valuenow={Math.min(purchases, target)} aria-valuemin={0} aria-valuemax={target} aria-label="Compras registradas"><span style={{ width: `${progress}%` }} /></div></section> : null}
      <p className={styles.foot}>{card.utilizado ? card.tipo === "CASHBACK" ? "Limite de uso atingido. Este cartão não aceita novas compras." : "Este cupom já foi utilizado ou enviado para revisão." : <><strong>Como usar:</strong> apresente este cartão na loja {card.loja}.</>}</p>
    </div>
  </main>;
}
