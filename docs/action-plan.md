# Plano de Ação - Gestor de Ordens de Serviço

## Estado atual
- Backend Express + tRPC com auth OAuth (JWT/cookie).
- Banco MySQL via Drizzle ORM, mas **schema mínimo**: só `users`.
- Frontend React Native/Expo com dados locais em `AsyncStorage` (`lib/app-store.ts`).
- Sem persistência real de ordens, clientes, funcionários ou vínculos empresa/profissional/cliente.

---

## Fase 1 — Modelagem de dados e contratos
**Objetivo:** estruturar tabelas, relações e tipos TypeScript que refletem o domínio.

### 1.1 Schema Drizzle
Criar/ajustar tabelas:
- `company_profiles`: dados da empresa (CNPJ, nome fantasia, endereço, telefone, owner_user_id).
- `employee_profiles`: vínculo com `users`, dados profissionais (cargo, matrícula, telefone, ativo).
- `client_profiles`: dados do cliente (nome, contato, cidade, endereço, documento).
- `service_orders`: OS completa (id, company_id, client_id, employee_id, status, prioridade, data, hora, valor, descrição, endereço, notas, latitude, longitude, OfflineDownloadToken).
- `service_evidences`: fotos/vídeos por OS (uri, tipo, timestamp).
- `service_arrivals`: registros de chegada (latitude, longitude, registrado_em, confirmado_por).
- `customer_approvals`: aceites digitais (nome,assinatura_path,aceite_em,status).
- `offline_packages`: pacotes de dados offline para profissionais (employee_id, order_ids, route_data, expires_at, checksum).

Políticas/RLS no backend:
- Toda query de OS valida `company_id` ou `employee_id` conforme perfil.
- Cliente só vê/confirma chegada quando `customer_approval.status = pending` e ordem pertence à empresa.
- Profissional só acessa OS atribuídas à sua `employee_id`.
- Empresa acessa tudo dentro de `company_id`.

### 1.2 Enums e constantes
- `OrderStatus`: Pendente, Em_andamento, Concluída, Cancelada.
- `OrderPriority`: Alta, Media, Baixa.
- `ApprovalStatus`: Pendente, Confirmado, Rejeitado.
- `OfflineStatus`: Sincronizado, Pendente_sincronizacao, Conflito.

---

## Fase 2 — Backend tRPC e serviços
**Objetivo:** expor API tipada para o frontend consumir.

### 2.1 Routers
- `companies.profile`: CRUD perfil empresa.
- `employees.profile`: listar/criar/atualizar funcionários.
- `clients.profile`: listar/criar/atualizar clientes.
- `orders.create`, `orders.list`, `orders.updateStatus`, `orders.detail`.
- `orders.registerArrival`, `orders.addEvidence`, `orders.submitApproval`.
- `offline.generatePackage`, `offline.sync`.

### 2.2 Notificações
- Rota ou procedure `notifications.sendArrivalRequest(orderId, clientContact)`.
- Integração com push notification (expo-notifications) ou e-mail/SMS futuro.

### 2.3 Rotas offline
- `GET /api/orders/offline-package?employeeId=...` retorna JSON compacto com OS, cliente, mapa rota e checksum.
- Frontend salva em AsyncStorage/FileSystem e valida integridade antes de usar.

---

## Fase 3 — Frontend: fluxo empresa
**Objetivo:** permitir que a empresa gerencie tudo.

### 3.1 Telas/abas
- **Empresa > Nova OS:** formulário completo com select de cliente, técnico, prioridade, data/hora, valor, endereço.
- **Empresa > Ordens:** lista com filtros por status, cliente, técnico, data.
- **Empresa > Detalhe OS:** timeline com status, registros de chegada, evidências, aceite. Ações: cancelar, reabrir, atribuir técnico.
- **Empresa > Equipe:** CRUD de funcionários (criar acesso = criar user + employee_profile). Botão “Convidar técnico”.
- **Empresa > Clientes:** CRUD de clientes.
- **Empresa > Configurações:** toggle por OS: “Exigir confirmação de chegada do cliente”, “Permitir download de rota offline”, “Notificar cliente por push/e-mail”.

---

## Fase 4 — Frontend: fluxo profissional
**Objetivo:** profissional executa OS com confirmação de chegada e offline.

### 4.1 Telas/abas
- **Profissional > Minhas OS:** lista filtrada por `employee_id`.
- **Profissional > Detalhe OS:**
  - Botão **“Baixar rota para uso offline”** → salva pacote compacto (rota, endereço, OS) com checksum.
  - Botão **“Registrar chegada”** → usa GPS, salva lat/lng com timestamp.
  - Botão **“Solicitar confirmação do cliente”** → envia notificação para cliente validar presença.
  - Upload de evidências (câmera).
  - Aceite digital do cliente (nome + assinatura).
- **Profissional > Offline:** lista de pacotes baixados, status de sincronização, botão “Sincronizar agora”.

### 4.2 Lógica offline
- Cache por OS com `AsyncStorage`/FileSystem.
- Sincronização diferencial: só envia mudanças pendentes quando online.
- Validação de checksum para detectar corrupção.

---

## Fase 5 — Frontend: fluxo cliente
**Objetivo:** cliente valida presença/aceite sem precisar de login complexo.

### 5.1 Experiência
- Link mágico ou token único por OS (`customer_token`).
- Tela pública (sem auth obrigatória) para:
  - Confirmar chegada (“Sim, estou no local”).
  - Ver evidências.
  - Aceitar serviço com nome + assinatura.
- Opcional: notificação por e-mail/SMS com link.

---

## Fase 6 — Melhorias e sugestões adicionais
- **Tempo real:** WebSocket ou polling para status da OS.
- **Geofence:** validar se profissional está próximo ao endereço da OS ao registrar chegada.
- **Histórico de alterações:** log de mudanças de status, atribuições, valores.
- **Exportar relatórios:** PDF/CSV por período para empresa.
- **Anexos variados:** permitir vídeo/áudio além de foto.
- **Indicadores:** tempo médio por OS, taxa de cancelamento, desempenho por técnico.
- **Dark mode e acessibilidade:** já iniciado; refinar contraste e tamanho de toque.

---

## Ordem de implementação sugerida
1. Fase 1 (schema + tipos)
2. Fase 2 (tRPC + auth policies)
3. Fase 3 (frontend empresa)
4. Fase 4 (frontend profissional + offline)
5. Fase 5 (fluxo cliente)
6. Fase 6 (melhorias)

---

## Arquivos que precisarão ser criados/alterados
- `drizzle/schema.ts` e `drizzle/relations.ts`
- `server/routers.ts` + novos routers em `server/` (companies, employees, clients, orders, offline, notifications)
- `server/db.ts` (+ novas queries)
- `lib/app-store.ts` (tipos expandidos)
- `app/(tabs)/` e novas telas (`app/company/`, `app/professional/`, `app/public/`)
- `hooks/` (novos hooks para offline/sincronização)
- `constants/` (enums, limites, tokens)
- `shared/` (tipos compartilhados, erros)

---

## Critérios de sucesso
- Empresa cria OS e atribui profissional.
- Profissional recebe OS, baixa rota offline, executa, registra chegada.
- Cliente recebe notificação e confirma presença/aceite.
- Todos os dados persistem no banco e não apenas em memória.
- App funciona offline para visualização e captura de evidências, sincronizando depois.
