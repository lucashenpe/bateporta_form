import type { Metadata } from "next";
import FidelidadeCadastroForm from "@/components/fidelidade/fidelidade-cadastro-form";

export const metadata: Metadata = {
  title: "Cadastro de voucher | Bate Porta",
  description: "Cadastre-se para receber seu código de benefício pelo WhatsApp.",
};

export default async function FidelidadePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <FidelidadeCadastroForm token={token} />;
}
