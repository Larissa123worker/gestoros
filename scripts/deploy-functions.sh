#!/bin/bash

# Carregar variáveis do .env
set -a
source .env
set +a

# Verificar se o token está configurado
if [ "$SUPABASE_ACCESS_TOKEN" = "YOUR_ACCESS_TOKEN_HERE" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN não configurado!"
  echo ""
  echo "📋 Para obter seu token:"
  echo "1. Acesse: https://supabase.com/dashboard/account/tokens"
  echo "2. Clique em 'Create new token'"
  echo "3. Dê um nome: 'Deploy Functions'"
  echo "4. Copie o token"
  echo "5. Substitua YOUR_ACCESS_TOKEN_HERE no .env"
  echo ""
  exit 1
fi

echo "🚀 Fazendo deploy das Supabase Functions..."
echo "📦 Projeto: $SUPABASE_PROJECT_REF"
echo ""

# Deploy de todas as functions
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deploy concluído com sucesso!"
  echo "🎉 As Supabase Functions foram atualizadas no projeto."
else
  echo ""
  echo "❌ Erro ao fazer deploy das functions."
  exit 1
fi
