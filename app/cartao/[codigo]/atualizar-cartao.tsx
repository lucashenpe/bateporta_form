"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function AtualizarCartao({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" className={className} disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Atualizando…" : "Atualizar marcações"}</button>;
}
