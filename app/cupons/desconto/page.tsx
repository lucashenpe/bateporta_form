import type { Metadata } from "next";
import CupomResgateForm from "@/components/cupons/cupom-resgate-form";

export const metadata: Metadata = {
  title: "Resgatar cupom | Bate Porta",
  description: "Envie os dados da compra para aplicar seu cupom de desconto.",
};

export default async function CupomDescontoPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <CupomResgateForm token={token || ""} />;
}
