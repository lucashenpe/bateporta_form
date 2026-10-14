# Bate Porta Fidelidade

Página pública para cadastro de fidelidade, cashback e cupom. Aceita `/fidelidade/:token`, `/fidelidade?token=...` e `/?token=...`.

## Executar

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Defina `API_URL` em `.env.local` com a origem da API, por exemplo `https://api.exemplo.com`, sem `/api/v1` no final. Em produção, configure a mesma variável no serviço de hospedagem.

O navegador acessa a rota local `/api/publico/fidelidade/:token`; o servidor Next encaminha GET e POST para a API. A hospedagem precisa executar Next.js com rotas de servidor.

Configure `FIDELIDADE_CADASTRO_URL` no backend e `NEXT_PUBLIC_FIDELIDADE_URL` no CRM com a origem pública deste projeto. Para publicar em um repositório próprio, execute `git remote add origin <URL_DO_REPOSITORIO>` e `git push -u origin main` dentro desta pasta.
