import FidelidadeCadastroForm from "@/components/fidelidade/fidelidade-cadastro-form";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <FidelidadeCadastroForm token={token} />;
}
