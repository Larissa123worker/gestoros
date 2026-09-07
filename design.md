# Planejamento de Interface e Experiência - Gestor de Ordens de Serviço

Este documento detalha o design de interface, telas, fluxos e personas do aplicativo **Gestor de Ordens de Serviço** (focado em mobile portrait 9:16 e uso com uma mão).

## 1. Visão Geral e Personas

O aplicativo atende a dois perfis principais de usuários (com seletor rápido na barra superior ou perfil):
1. **Perfil Empresa (Gestor / Administrador)**: Focado em visão macro, relatórios, atribuição de ordens de serviço, cadastro de clientes, funcionários e acompanhamento do faturamento e status das OSs.
2. **Perfil Funcionário (Técnico / Prestador de Campo)**: Focado em acompanhar suas ordens de serviço atribuídas, atualizar status (Em Andamento, Concluída), adicionar observações, fotos e coletar assinatura ou confirmação do cliente.

---

## 2. Lista de Telas

- **Seleção de Perfil / Início**: Tela inicial para alternar entre visão "Empresa" e visão "Funcionário", exibindo atalhos rápidos.
- **Dashboard (Empresa)**: Indicadores-chave (OSs Abertas, Em Andamento, Concluídas, Faturamento), atalhos para criar OS e lista recente.
- **Dashboard (Funcionário)**: OSs pendentes atribuídas ao usuário, métricas do dia e botão de check-in/atualização rápida.
- **Lista de Ordens de Serviço**: Listagem completa com filtros por status (Pendente, Em Andamento, Concluída, Cancelada) e busca.
- **Detalhe / Edição de OS**: Informações completas da OS (Cliente, Funcionário responsável, Descrição, Valor, Histórico e Botões de Ação de Status).
- **Nova OS**: Formulário intuitivo para cadastrar cliente, funcionário, descrição, prioridade e valor.
- **Gestão de Cadastros (Empresa)**: Listas de Clientes e Funcionários vinculados à empresa.
- **Perfil & Configurações**: Ajustes de tema (Claro/Escuro), dados da empresa e simulação de notificações.

---

## 3. Fluxos Principais de Usuário

1. **Criação e Atribuição de OS (Empresa)**:
   - Gestor acessa a aba de OS -> Clica no botão "+" -> Preenche dados do Cliente, Descrição do Serviço, Valor e seleciona o Funcionário responsável -> Salva -> OS aparece imediatamente no dashboard da empresa e na lista do funcionário.
2. **Execução de Serviço (Funcionário)**:
   - Técnico abre o app no perfil Funcionário -> Vê suas OSs pendentes -> Toca em uma OS -> Altera o status para "Em Andamento" -> Realiza o trabalho -> Altera o status para "Concluída", adiciona notas finais e salva.

---

## 4. Diretrizes de Cores e Estética

- **Cor Primária**: Azul Corporativo (`#0a7ea4` / `#0284c7`), transmitindo confiança e profissionalismo técnico.
- **Superfícies**: Fundo limpo (`#ffffff` em claro, `#151718` em escuro) com cards elevados (`#f5f5f5` / `#1e2022`).
- **Estados (Badges)**:
  - Pendente: Amarelo/Laranja (`#F59E0B`)
  - Em Andamento: Azul (`#0284c7`)
  - Concluída: Verde (`#22C55E`)
- **Tipografia e Ícones**: Fontes legíveis com espaçamento adequado e ícones intuitivos (MaterialIcons / SF Symbols).
