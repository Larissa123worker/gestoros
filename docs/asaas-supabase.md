# Asaas via Supabase

O fluxo financeiro usa somente Supabase Edge Functions. O Express não participa de billing, webhook ou Resend.

## Functions

- `billing`: lista planos, consulta conta, cria assinatura recorrente e recupera QR Code PIX.
- `asaas-webhook`: recebe eventos do Asaas, valida `asaas-access-token`, aplica idempotência e atualiza assinaturas/pagamentos.
- `send-email`: envia emails pelo Resend usando secrets do Supabase.

## Secrets

```bash
supabase secrets set \
  ASAAS_API_KEY="sua_api_key" \
  ASAAS_BASE_URL="https://api-sandbox.asaas.com" \
  ASAAS_WEBHOOK_TOKEN="token_do_webhook" \
  RESEND_API_KEY="sua_resend_key" \
  RESEND_FROM="Gestor OS <noreply@seudominio.com>"
```

A API Key do Asaas e a chave do Resend nunca devem usar o prefixo `EXPO_PUBLIC_`.

## Deploy

```bash
supabase db push
supabase functions deploy billing
supabase functions deploy asaas-webhook --no-verify-jwt
supabase functions deploy send-email
```

Configure no Asaas somente:

- URL: `https://<project-ref>.supabase.co/functions/v1/asaas-webhook`
- Header `asaas-access-token`: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`

O email não é necessário na configuração do webhook.

## Recorrência

- PIX: o Asaas gera uma cobrança PIX a cada ciclo; o usuário paga cada cobrança.
- Cartão: o Asaas tenta cobrar o cartão a cada ciclo.
- Mensal: `MONTHLY`.
- Anual: `YEARLY`.
- A contratação fica `pending` até `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`.
- `PAYMENT_OVERDUE` muda a empresa para `past_due`.
