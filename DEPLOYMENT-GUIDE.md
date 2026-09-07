# 📋 Guia de Deployment - Verificação de Email

## Status Atual ✅
- ✅ Código frontend implementado em `app/login.tsx`
- ✅ Email verification removido de `register-company.tsx`
- ✅ Função Supabase Edge criada em `supabase/functions/email-verification/`
- ✅ Schema SQL preparado
- ✅ Token Supabase configurado no `.env`
- ⏳ **Pendente:** Deploy da função e criação da tabela no banco

## Passo 1: Criar Tabela no Supabase

1. Acesse: https://supabase.com/dashboard/project/qfjrzoijtikutafhtuqy
2. Abra **SQL Editor** no menu esquerdo
3. Crie nova query e execute:

```sql
-- Criar tabela de verificações de email
CREATE TABLE IF NOT EXISTS email_verifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  attempts NUMERIC(2, 0) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_verified_at ON email_verifications(verified_at);
```

✅ Você verá uma confirmação de sucesso

## Passo 2: Deploy da Função Edge

### Opção A: Via CLI (linha de comando)

```bash
cd "/home/npc/Desktop/Kito Expert - Ecossistema/Apps ou Saas/Em Andamento/Ordem de Serviço"
SUPABASE_ACCESS_TOKEN=<your-supabase-access-token> npx supabase functions deploy email-verification --project-ref <your-project-ref>
```

### Opção B: Via Dashboard Supabase (mais simples)

1. Acesse: https://supabase.com/dashboard/project/qfjrzoijtikutafhtuqy
2. Clique em **Edge Functions** no menu esquerdo
3. Clique em **email-verification** (ou crie uma nova se não aparecer)
4. Copie o conteúdo do arquivo `supabase/functions/email-verification/index.ts`
5. Cole no editor de código do Supabase
6. Clique **Deploy**

## Passo 3: Configurar Variáveis de Ambiente

No painel Supabase:
1. Vá para **Project Settings** → **Secrets**
2. Adicione:
   - `RESEND_API_KEY`: sua chave Resend API
   - `RESEND_FROM`: e-mail de envio (ex: noreply@example.com)

## Passo 4: Testar Integração

1. Abra seu app em desenvolvimento (`http://localhost:8081/login` ou via Expo)
2. Na aba **"Cadastro"**:
   - Digite seu nome
   - Digite seu email
   - Clique **"Enviar código por email"**
   - Verifique a bandeja de entrada (Resend enviará o código)
   - Digite o código recebido
   - Clique **"Confirmar"**
   - Campos de senha devem aparecer
   - Complete o registro

## Arquivos Modificados ✅

### `/app/login.tsx`
- Adicionado estado: `emailCodeSent`, `emailVerified`, `emailCode`, `emailVerificationLoading`
- Adicionado fluxo de verificação de email na aba "Cadastro"
- Campos de senha só aparecem após `emailVerified === true`

### `/app/register-company.tsx`
- Removido: código de verificação de email
- Removido: importações desnecessárias
- Apenas dados da empresa (CNPJ, telefone, endereço, etc.)

### `/supabase/functions/email-verification/index.ts`
- Ação "send": Gera código 6-dígitos, envia via Resend, armazena em DB (10 min expiração)
- Ação "verify": Valida código, incrementa tentativas (máx 5), marca como verificado

### `/.env`
- `SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>` ✅

## Troubleshooting

### "Erro: Código expirado"
- O código válido por 10 minutos
- Solicite um novo código clicando novamente em "Enviar código por email"

### "Erro: Limite de tentativas excedido"
- Máximo 5 tentativas erradas por código
- Solicite um novo código

### "Erro: Email não chegou"
- Verifique spam/lixo
- Confirme `RESEND_API_KEY` e `RESEND_FROM` estão configurados
- Teste a integração Resend separadamente

### Deploy CLI travando
- Use a Opção B (Dashboard manual)
- Ou tente: `npx supabase functions deploy email-verification --project-ref qfjrzoijtikutafhtuqy` com o token no .env

## Próximos Passos

Após completar este deployment:
1. ✅ Teste o fluxo completo de verificação
2. ✅ Configure notificações/emails de boas-vindas pós-registro
3. ✅ Implemente lógica de verificação de telefone (similar a email)
4. ✅ Deploy da aplicação para produção
