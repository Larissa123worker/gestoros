import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { store, useAppStore, type ServiceOrder } from "@/lib/app-store";

export default function CrmScreen() {
  const { loading, isProfessional } = useRequireAuth();
  const state = useAppStore();
  const [section, setSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [city, setCity] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [importType, setImportType] = useState<"clients" | "employees" | null>(
    null,
  );
  const [preview, setPreview] = useState<
    { values: Record<string, string>; error?: string }[]
  >([]);
  const [fileName, setFileName] = useState("");
  const [temporaryPasswords, setTemporaryPasswords] = useState<string[]>([]);
  const [catalogForm, setCatalogForm] = useState({
    name: "",
    description: "",
    value: "",
    duration: "",
  });
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);

  if (loading) return null;
  if (isProfessional || state.membership !== "owner")
    return <Redirect href="/(tabs)" />;

  const clientName = (order: ServiceOrder) =>
    state.clients.find((client) => client.id === order.clientId)?.name ??
    "Cliente não identificado";
  const orders = state.orders.filter(
    (order) =>
      `${order.title} ${clientName(order)}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "Todos" || order.status === status) &&
      (!employeeFilter ||
        (
          state.employees.find((employee) => employee.id === order.employeeId)
            ?.name || ""
        )
          .toLowerCase()
          .includes(employeeFilter.toLowerCase())) &&
      (!minValue || order.value >= Number(minValue.replace(",", "."))) &&
      (!priorityFilter ||
        order.priority.toLowerCase().includes(priorityFilter.toLowerCase())) &&
      (!dateFilter ||
        order.date.toLowerCase().includes(dateFilter.toLowerCase())),
  );
  const total = orders.reduce((sum, order) => sum + order.value, 0);
  const done = orders.filter((order) => order.status === "Concluída").length;
  const clients = state.clients.filter(
    (client) =>
      `${client.name} ${client.city} ${client.neighborhood ?? ""} ${client.contact}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!city || client.city.toLowerCase().includes(city.toLowerCase())),
  );
  const employees = state.employees.filter((employee) =>
    `${employee.name} ${employee.email} ${employee.role}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const cancelled = state.orders.filter(
    (order) => order.status === "Cancelada",
  );
  const absent = state.orders.filter((order) => order.absentClient);
  const reasons = [
    ...cancelled.map(
      (order) =>
        order.cancellationReason || order.notes.replace("[CANCELAMENTO] ", ""),
    ),
    ...absent.map((order) => order.absentClient?.reason || "Cliente ausente"),
  ].filter(Boolean) as string[];
  const ranking = Object.entries(
    reasons.reduce<Record<string, number>>(
      (all, reason) => ({ ...all, [reason]: (all[reason] ?? 0) + 1 }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const delayed = state.orders.filter(
    (order) =>
      order.createdAt &&
      order.arrival &&
      new Date(order.arrival.registeredAt).getTime() >
        new Date(order.createdAt).getTime(),
  );

  async function importFile(type: "clients" | "employees") {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const response = await fetch(result.assets[0].uri);
      const workbook = XLSX.read(await response.arrayBuffer(), {
        type: "array",
      });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[workbook.SheetNames[0]],
        { defval: "" },
      );
      const required =
        type === "clients" ? ["nome", "contato", "cidade"] : ["nome", "email"];
      setPreview(
        rows.map((row) => {
          const values = Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key.trim().toLowerCase(),
              String(value ?? "").trim(),
            ]),
          );
          const missing = required.filter((key) => !values[key]);
          return {
            values,
            error: missing.length
              ? `Ausente: ${missing.join(", ")}`
              : undefined,
          };
        }),
      );
      setImportType(type);
      setFileName(result.assets[0].name);
    } catch {
      Alert.alert("Importação", "Não foi possível ler a planilha.");
    }
  }

  async function confirmImport() {
    const valid = preview.filter((row) => !row.error);
    if (importType === "clients")
      await Promise.all(
        valid.map((row) =>
          store.addClient({
            name: row.values.nome,
            document: row.values.documento,
            contact: row.values.contato,
            city: row.values.cidade,
            street: row.values.rua,
            number: row.values.numero,
            neighborhood: row.values.bairro,
            state: row.values.estado,
            address: row.values.endereco,
            observation: row.values.observacoes,
            referencePoint: "",
          }),
        ),
      );
    if (importType === "employees") {
      const passwords = valid.map(
        () => `OS${Math.random().toString(36).slice(2, 8)}!`,
      );
      setTemporaryPasswords(passwords);
      await Promise.all(
        valid.map((row, index) =>
          store.addEmployee({
            name: row.values.nome,
            email: row.values.email,
            role: row.values.cargo || row.values["cargo/função"] || "Técnico",
            phone: row.values.telefone,
            password: passwords[index],
          }),
        ),
      );
    }
    Alert.alert(
      "Importação concluída",
      `${valid.length} importados. ${preview.length - valid.length} com erro.`,
    );
    setPreview([]);
    setImportType(null);
  }

  async function saveCatalog() {
    if (!catalogForm.name.trim()) return;
    const item = {
      name: catalogForm.name.trim(),
      description: catalogForm.description.trim(),
      suggestedValue: Number(catalogForm.value.replace(",", ".")) || 0,
      estimatedDuration: catalogForm.duration.trim(),
    };
    if (editingCatalogId)
      await store.updateCatalogItem({
        ...state.catalog.find((entry) => entry.id === editingCatalogId)!,
        ...item,
      });
    else await store.addCatalogItem(item);
    setCatalogForm({ name: "", description: "", value: "", duration: "" });
    setEditingCatalogId(null);
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Pressable onPress={() => router.back()} style={styles.back}>
              <IconSymbol name="arrow.left" size={18} color="#FAFAFA" />
              <Text style={styles.backText}>Início</Text>
            </Pressable>
            <Text style={styles.kicker}>GESTÃO OPERACIONAL</Text>
            <Text style={styles.title}>CRM</Text>
            <Text style={styles.subtitle}>
              Visão analítica da operação de{" "}
              {state.companyName || "sua empresa"}.
            </Text>
          </View>
          <Pressable onPress={() => store.refresh()} style={styles.refresh}>
            <IconSymbol name="arrow.clockwise" size={19} color="#D9FF3F" />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nav}
        >
          {[
            "overview",
            "problems",
            "clients",
            "employees",
            "catalog",
            "account",
          ].map((item) => (
            <Pressable
              key={item}
              onPress={() =>
                item === "account"
                  ? router.push("/(tabs)/account" as any)
                  : (() => {
                      setSection(item);
                      setSearch("");
                    })()
              }
              style={[
                styles.navItem,
                item === "account" && styles.accountNavItem,
                section === item && styles.navItemActive,
              ]}
            >
              <Text
                style={[
                  styles.navText,
                  item === "account" && styles.accountNavText,
                  section === item && styles.navTextActive,
                ]}
              >
                {
                  (
                    {
                      overview: "Visão geral",
                      problems: "Problemas",
                      clients: "Clientes",
                      employees: "Profissionais",
                      catalog: "Catálogo",
                      account: "Conta e assinatura",
                    } as Record<string, string>
                  )[item]
                }
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {(section === "overview" || section === "problems") && (
          <View style={styles.filters}>
            <View style={styles.toolbar}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Cliente ou título"
                placeholderTextColor="#71717A"
                style={styles.input}
              />
              <TextInput
                value={employeeFilter}
                onChangeText={setEmployeeFilter}
                placeholder="Profissional"
                placeholderTextColor="#71717A"
                style={styles.input}
              />
              <TextInput
                value={priorityFilter}
                onChangeText={setPriorityFilter}
                placeholder="Prioridade"
                placeholderTextColor="#71717A"
                style={styles.input}
              />
              <TextInput
                value={dateFilter}
                onChangeText={setDateFilter}
                placeholder="Data"
                placeholderTextColor="#71717A"
                style={styles.input}
              />
              <TextInput
                value={minValue}
                onChangeText={setMinValue}
                placeholder="Valor mínimo"
                placeholderTextColor="#71717A"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {[
                "Todos",
                "Pendente",
                "Em andamento",
                "Concluída",
                "Cancelada",
              ].map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setStatus(item)}
                  style={[styles.chip, status === item && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      status === item && styles.chipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {section === "overview" && (
          <>
            <View style={styles.stats}>
              <Stat
                label="OS no período"
                value={String(orders.length)}
                color="#D9FF3F"
              />
              <Stat label="Valor total" value={money(total)} color="#34D399" />
              <Stat
                label="Ticket médio"
                value={money(orders.length ? total / orders.length : 0)}
                color="#FBBF24"
              />
              <Stat
                label="Taxa de conclusão"
                value={`${orders.length ? Math.round((done / orders.length) * 100) : 0}%`}
                color="#A78BFA"
              />
            </View>
            <Panel title="Ordens de serviço">
              {orders.length ? (
                orders.map((order) => (
                  <View key={order.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{order.title}</Text>
                      <Text style={styles.rowMeta}>
                        {clientName(order)} ·{" "}
                        {state.employees.find(
                          (employee) => employee.id === order.employeeId,
                        )?.name || "Sem profissional"}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text style={styles.value}>{money(order.value)}</Text>
                      <Text style={styles.status}>{order.status}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>Nenhuma OS encontrada.</Text>
              )}
            </Panel>
          </>
        )}
        {section === "problems" && (
          <>
            <View style={styles.stats}>
              <Stat
                label="Canceladas"
                value={String(cancelled.length)}
                color="#FB7185"
              />
              <Stat
                label="Clientes ausentes"
                value={String(absent.length)}
                color="#FBBF24"
              />
              <Stat
                label="Atrasos registrados"
                value={String(delayed.length)}
                color="#F97316"
              />
            </View>
            <View style={styles.columns}>
              <Panel title="Motivos recorrentes">
                {ranking.length ? (
                  ranking.map(([reason, count]) => (
                    <View key={reason} style={styles.rank}>
                      <Text style={styles.rowTitle}>{reason}</Text>
                      <Text style={styles.rankCount}>{count}x</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.empty}>Nenhum problema registrado.</Text>
                )}
              </Panel>
              <Panel title="Ranking por profissional">
                {state.employees.map((employee) => {
                  const count = state.orders.filter(
                    (order) =>
                      order.employeeId === employee.id &&
                      (order.status === "Cancelada" || !!order.absentClient),
                  ).length;
                  return (
                    <View key={employee.id} style={styles.rank}>
                      <Text style={styles.rowTitle}>{employee.name}</Text>
                      <Text style={styles.rankCount}>
                        {count} ocorrência(s)
                      </Text>
                    </View>
                  );
                })}
              </Panel>
              <Panel title="Atrasos entre criação e chegada">
                {delayed.map((order) => (
                  <View key={order.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{order.title}</Text>
                      <Text style={styles.rowMeta}>{clientName(order)}</Text>
                    </View>
                    <Text style={styles.status}>
                      {Math.round(
                        (new Date(order.arrival!.registeredAt).getTime() -
                          new Date(order.createdAt!).getTime()) /
                          60000,
                      )}{" "}
                      min
                    </Text>
                  </View>
                ))}
              </Panel>
              <Panel title="OS com ocorrência">
                {[...cancelled, ...absent].map((order) => (
                  <View key={`${order.id}-${order.status}`} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{order.title}</Text>
                      <Text style={styles.rowMeta}>
                        {clientName(order)} ·{" "}
                        {order.absentClient?.photoUri
                          ? "Foto anexada"
                          : "Sem foto"}
                      </Text>
                    </View>
                    <Text style={styles.status}>
                      {order.cancellationReason ||
                        order.absentClient?.reason ||
                        "Registrada"}
                    </Text>
                  </View>
                ))}
              </Panel>
            </View>
          </>
        )}
        {section === "clients" && (
          <>
            <View style={styles.toolbar}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar cliente"
                placeholderTextColor="#71717A"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Cidade ou bairro"
                placeholderTextColor="#71717A"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable
                onPress={() => importFile("clients")}
                style={styles.action}
              >
                <Text style={styles.actionText}>Importar</Text>
              </Pressable>
            </View>
            <Panel title="Clientes">
              {clients.map((client) => {
                const clientOrders = state.orders.filter(
                  (order) => order.clientId === client.id,
                );
                const clientTotal = clientOrders.reduce(
                  (sum, order) => sum + order.value,
                  0,
                );
                return (
                  <View key={client.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{client.name}</Text>
                      <Text style={styles.rowMeta}>
                        {client.city}
                        {client.neighborhood
                          ? ` · ${client.neighborhood}`
                          : ""}{" "}
                        · {client.contact}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {clientOrders.length} OS ·{" "}
                        {
                          clientOrders.filter(
                            (order) => order.status === "Concluída",
                          ).length
                        }{" "}
                        concluídas ·{" "}
                        {
                          clientOrders.filter(
                            (order) =>
                              order.status === "Pendente" ||
                              order.status === "Em andamento",
                          ).length
                        }{" "}
                        abertas
                      </Text>
                    </View>
                    <Text style={styles.value}>{money(clientTotal)}</Text>
                  </View>
                );
              })}
              {!clients.length && (
                <Text style={styles.empty}>Nenhum cliente encontrado.</Text>
              )}
            </Panel>
          </>
        )}
        {section === "employees" && (
          <>
            <View style={styles.toolbar}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar profissional"
                placeholderTextColor="#71717A"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable
                onPress={() => importFile("employees")}
                style={styles.action}
              >
                <Text style={styles.actionText}>Importar</Text>
              </Pressable>
            </View>
            <Panel title="Profissionais">
              {employees.map((employee) => {
                const employeeOrders = state.orders.filter(
                  (order) => order.employeeId === employee.id,
                );
                return (
                  <View key={employee.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{employee.name}</Text>
                      <Text style={styles.rowMeta}>
                        {employee.role} · {employee.email}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text style={styles.value}>
                        {employeeOrders.length} atribuídas ·{" "}
                        {
                          employeeOrders.filter(
                            (order) => order.status === "Concluída",
                          ).length
                        }{" "}
                        concluídas ·{" "}
                        {
                          employeeOrders.filter(
                            (order) => order.status === "Cancelada",
                          ).length
                        }{" "}
                        canceladas
                      </Text>
                      <Text style={styles.rowMeta}>
                        Tempo médio: {averageDuration(employeeOrders)}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {!employees.length && (
                <Text style={styles.empty}>
                  Nenhum profissional encontrado.
                </Text>
              )}
            </Panel>
            {temporaryPasswords.length > 0 && (
              <View style={styles.preview}>
                <Text style={styles.panelTitle}>
                  Senhas temporárias geradas
                </Text>
                {temporaryPasswords.map((password, index) => (
                  <Text key={password} style={styles.rowMeta}>
                    Profissional {index + 1}:{" "}
                    <Text style={styles.value}>{password}</Text>
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
        {section === "catalog" && (
          <>
            <View style={styles.form}>
              <Text style={styles.panelTitle}>
                {editingCatalogId ? "Editar serviço" : "Novo serviço"}
              </Text>
              <Field
                label="Nome"
                value={catalogForm.name}
                onChange={(value) =>
                  setCatalogForm({ ...catalogForm, name: value })
                }
              />
              <Field
                label="Descrição padrão"
                value={catalogForm.description}
                onChange={(value) =>
                  setCatalogForm({ ...catalogForm, description: value })
                }
              />
              <View style={styles.toolbar}>
                <Field
                  label="Valor sugerido"
                  value={catalogForm.value}
                  onChange={(value) =>
                    setCatalogForm({ ...catalogForm, value })
                  }
                />
                <Field
                  label="Duração média"
                  value={catalogForm.duration}
                  onChange={(value) =>
                    setCatalogForm({ ...catalogForm, duration: value })
                  }
                />
              </View>
              <Pressable onPress={saveCatalog} style={styles.action}>
                <Text style={styles.actionText}>
                  {editingCatalogId ? "Salvar alterações" : "Adicionar serviço"}
                </Text>
              </Pressable>
            </View>
            <Panel title="Serviços cadastrados">
              {state.catalog.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {item.name}{" "}
                      {!item.active && (
                        <Text style={styles.rowMeta}>· Inativo</Text>
                      )}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {item.description || "Sem descrição"} ·{" "}
                      {item.estimatedDuration || "Duração não informada"}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.value}>
                      {money(item.suggestedValue)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setEditingCatalogId(item.id);
                        setCatalogForm({
                          name: item.name,
                          description: item.description,
                          value: String(item.suggestedValue),
                          duration: item.estimatedDuration,
                        });
                      }}
                    >
                      <Text style={styles.link}>Editar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        store.updateCatalogItem({
                          ...item,
                          active: !item.active,
                        })
                      }
                    >
                      <Text style={styles.link}>
                        {item.active ? "Desativar" : "Ativar"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              {!state.catalog.length && (
                <Text style={styles.empty}>Nenhum serviço no catálogo.</Text>
              )}
            </Panel>
          </>
        )}
        {preview.length > 0 && (
          <View style={styles.preview}>
            <Text style={styles.panelTitle}>Prévia: {fileName}</Text>
            <Text style={styles.rowMeta}>
              {preview.filter((row) => !row.error).length} válidos ·{" "}
              {preview.filter((row) => row.error).length} com erro
            </Text>
            {preview.slice(0, 8).map((row, index) => (
              <View key={index} style={styles.previewRow}>
                <Text style={styles.rowMeta}>
                  {row.values.nome || `Linha ${index + 2}`}
                </Text>
                <Text style={row.error ? styles.error : styles.valid}>
                  {row.error || "Pronto"}
                </Text>
              </View>
            ))}
            <View style={styles.toolbar}>
              <Pressable
                onPress={() => {
                  setPreview([]);
                  setImportType(null);
                }}
              >
                <Text style={styles.cancel}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmImport} style={styles.action}>
                <Text style={styles.actionText}>Confirmar importação</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor="#71717A"
        style={styles.input}
      />
    </View>
  );
}

function averageDuration(orders: ServiceOrder[]) {
  const durations = orders
    .filter((order) => order.startedAt && order.completedAt)
    .map(
      (order) =>
        new Date(order.completedAt!).getTime() -
        new Date(order.startedAt!).getTime(),
    )
    .filter((duration) => duration >= 0);
  if (!durations.length) return "Sem dados";
  const minutes = Math.round(
    durations.reduce((sum, duration) => sum + duration, 0) /
      durations.length /
      60000,
  );
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#09090B" },
  content: {
    padding: 24,
    paddingBottom: 64,
    gap: 20,
    maxWidth: 1240,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  headerCopy: { flex: 1 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  backText: { color: "#A1A1AA", fontWeight: "800" },
  kicker: {
    color: "#D9FF3F",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: { color: "#FAFAFA", fontSize: 36, fontWeight: "900", marginTop: 6 },
  subtitle: { color: "#A1A1AA", marginTop: 6 },
  refresh: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: { gap: 8 },
  navItem: {
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  accountNavItem: { borderColor: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.12)" },
  navItemActive: { backgroundColor: "#D9FF3F", borderColor: "#D9FF3F" },
  navText: { color: "#A1A1AA", fontWeight: "800" },
  accountNavText: { color: "#FBBF24" },
  navTextActive: { color: "#06151A" },
  filters: { gap: 10 },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: "#D9FF3F", borderColor: "#D9FF3F" },
  chipText: { color: "#A1A1AA", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#06151A" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#151517",
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 16,
    padding: 17,
    minHeight: 112,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 14 },
  statLabel: { color: "#A1A1AA", fontSize: 12, fontWeight: "700" },
  statValue: {
    color: "#FAFAFA",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },
  panel: {
    backgroundColor: "#111113",
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 16,
    padding: 18,
  },
  panelTitle: {
    color: "#FAFAFA",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#27272A",
    paddingVertical: 14,
  },
  rowTitle: { color: "#FAFAFA", fontWeight: "800", fontSize: 14 },
  rowMeta: { color: "#71717A", fontSize: 12, marginTop: 4 },
  right: { alignItems: "flex-end", gap: 4 },
  value: { color: "#E4E4E7", fontWeight: "800", fontSize: 13 },
  status: { color: "#A1A1AA", fontSize: 11, maxWidth: 180, textAlign: "right" },
  empty: { color: "#71717A", paddingVertical: 20 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  rank: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#27272A",
    paddingVertical: 14,
  },
  rankCount: { color: "#FBBF24", fontWeight: "900" },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  input: {
    minHeight: 48,
    minWidth: 160,
    flex: 1,
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 12,
    color: "#FAFAFA",
    backgroundColor: "#111113",
    paddingHorizontal: 14,
  },
  action: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#D9FF3F",
  },
  actionText: { color: "#06151A", fontWeight: "900" },
  form: {
    backgroundColor: "#151517",
    borderWidth: 1,
    borderColor: "#27272A",
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  field: { flex: 1, gap: 7 },
  label: { color: "#A1A1AA", fontSize: 12, fontWeight: "800" },
  link: { color: "#D9FF3F", fontWeight: "800", fontSize: 12 },
  preview: {
    backgroundColor: "#1C1C1F",
    borderWidth: 1,
    borderColor: "#D9FF3F",
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#27272A",
    paddingVertical: 9,
  },
  error: { color: "#FB7185", fontSize: 12 },
  valid: { color: "#34D399", fontSize: 12 },
  cancel: { color: "#A1A1AA", fontWeight: "800", padding: 14 },
});
