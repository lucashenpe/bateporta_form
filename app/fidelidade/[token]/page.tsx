import type { Metadata } from "next";
import FidelidadeCadastroForm from "@/components/fidelidade/fidelidade-cadastro-form";

export const metadata: Metadata = {
  title: "Cadastro de voucher | Bate Porta",
  description: "Cadastre-se e receba seu código de benefício pelo WhatsApp.",
};

export default async function FidelidadePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <FidelidadeCadastroForm token={token} />;
}
