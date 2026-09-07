# Estratégia de e-mail do trial

## Objetivo

Nutrir o gestor durante o trial de 30 dias, levando-o da criação da conta à primeira OS real e, depois, à decisão de assinatura. O envio deve ser diário, idempotente e baseado em eventos reais da empresa.

## Pré-requisitos

### WhatsApp Cloud API oficial

Para confirmar o celular, publique um template aprovado pela Meta com um parâmetro de código no corpo e configure estes secrets na Edge Function `phone-verification`:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TEMPLATE_NAME`
- `WHATSAPP_VERIFY_TEMPLATE_LANGUAGE` (por exemplo, `pt_BR`)

- Criar e validar a conta do Resend.
- Configurar um domínio próprio de envio, por exemplo `contato@gestoros.com.br`.
- Publicar os registros SPF, DKIM e DMARC fornecidos pelo Resend.
- Adicionar `RESEND_API_KEY`, `RESEND_FROM` e `APP_URL` como secrets da Supabase Edge Function.
- Adicionar `trial_started_at` e `trial_ends_at` em `company_profiles`.
- Criar `trial_email_log` com chave única em `(company_id, email_key)`.

## Cadência

| Chave | Momento | Objetivo | Condição recomendada |
| --- | --- | --- | --- |
| `day_0` | início do trial | Entregar acesso e próximo passo | Sempre |
| `day_7` | dia 7 | Mostrar ativação e incentivar primeira OS real | Enviar apenas se ainda não houver OS concluída |
| `day_14` | dia 14 | Reforçar evidências, GPS e assinatura | Enviar para contas ativas |
| `day_21` | dia 21 | Apresentar resultado e reduzir objeções | Enviar se houver OS criada |
| `day_28` | dia 28 | Avisar encerramento próximo e apresentar planos | Sempre |
| `day_29` | dia 29 | Último lembrete antes do fim | Sempre |

O dia deve ser calculado pela data em `trial_started_at`, no fuso definido para a operação. Não disparar mais de um e-mail da mesma chave para a mesma empresa.

## Controle de idempotência

```sql
create table if not exists public.trial_email_log (
  id uuid primary key default gen_random_uuid(),
  company_id varchar(64) not null references public.company_profiles(id) on delete cascade,
  email_key varchar(32) not null,
  recipient_email varchar(320) not null,
  sent_at timestamptz not null default now(),
  resend_id varchar(128),
  unique (company_id, email_key)
);
```

A Edge Function deve selecionar empresas cujo trial esteja entre 0 e 30 dias, verificar a ausência da chave no log, enviar pelo Resend e inserir o log somente após uma resposta de sucesso. Em caso de retry, a constraint única impede duplicidade.

## Dados usados no conteúdo

- Nome da empresa e do gestor.
- Quantidade de OS criadas.
- Quantidade de OS concluídas.
- Quantidade de técnicos cadastrados.
- Existência de evidência, chegada ou aceite.
- Dias restantes do trial.

Não usar números ilustrativos como se fossem dados da empresa.

## Conteúdo dos e-mails

### Dia 0: acesso liberado

Assunto: `Seu trial do Gestor OS começou`

Entregar o acesso, explicar que não há cartão e indicar a primeira ação: cadastrar equipe e criar uma OS real.

### Dia 7: primeira ativação

Assunto: `Sua equipe já registrou uma OS?`

Mostrar o que falta para ativar. Se não houver OS, oferecer ajuda para criar a primeira. Se houver, destacar o próximo passo do fluxo.

### Dia 14: prova do atendimento

Assunto: `GPS, foto e assinatura no mesmo atendimento`

Explicar o fluxo de execução sem jargão e apontar para uma OS real no app.

### Dia 21: resultado parcial

Assunto: `O que sua operação já registrou`

Mostrar os números reais da empresa e sugerir a revisão das ordens pendentes ou dos problemas recorrentes.

### Dia 28: trial chegando ao fim

Assunto: `Faltam 2 dias para o fim do seu trial`

Mostrar data de término, planos e botão para escolher a continuidade.

### Dia 29: último aviso

Assunto: `Amanhã termina seu trial do Gestor OS`

Ser direto: informar término, explicar o que acontece com os dados conforme a política vigente e oferecer o CTA de assinatura ou contato.

## Edge Function e agendamento

1. A função consulta `company_profiles` com trial ativo.
2. Busca o e-mail do gestor em `users`.
3. Calcula a chave de cadência do dia.
4. Consulta `trial_email_log`.
5. Monta o HTML a partir de um template por chave.
6. Chama `https://api.resend.com/emails`.
7. Registra a resposta no log.
8. Retorna contadores de selecionados, enviados, ignorados e falhos.

Configurar `pg_cron` para chamar a função uma vez por dia em horário fixo. Antes de ativar em produção, testar com empresas artificiais em cada dia do trial e executar a função duas vezes para confirmar que a segunda execução não envia duplicado.

## Métricas

Registrar por e-mail: enviado, falhou, abriu, clicou e converteu. Os eventos de conversão devem ser ligados a `company_id` e ao plano escolhido. Acompanhar especialmente:

- Cadastro para primeira OS.
- Primeira OS para primeira conclusão.
- Clique no plano durante o trial.
- Conversão por origem da landing page.
- Cancelamento e motivo informado.
