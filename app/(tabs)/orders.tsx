import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAppStore, type OrderStatus } from "@/lib/app-store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { GestorLogo } from "@/components/gestor-logo";

const statuses: Array<OrderStatus | "Todas"> = ["Todas", "Pendente", "Em andamento", "Concluída"];
const statusColors: Record<OrderStatus, string> = { Pendente: "#F59E0B", "Em andamento": "#D9FF3F", Concluída: "#10B981", Cancelada: "#EF4444" };

export default function OrdersScreen() {
  const colors = useColors();
  const { user, loading } = useRequireAuth();
  const state = useAppStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "Todas">("Todas");
  const orders = useMemo(() => state.orders.filter((order) => {
    const client = state.clients.find((item) => item.id === order.clientId);
    const matchesRole =
      state.membership === "employee" || state.role === "funcionario"
        ? order.employeeId === state.currentEmployeeId
        : true;
    const matchesFilter = filter === "Todas" || order.status === filter;
    const text = `${order.id} ${order.title} ${client?.name ?? ""}`.toLowerCase();
    return matchesRole && matchesFilter && text.includes(query.toLowerCase());
  }), [state, filter, query]);

  return <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
    {loading && <View style={styles.loading}><Text style={[{ color: colors.muted }]}>Carregando...</Text></View>}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <GestorLogo subtitle />
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: colors.primary }]}>OPERAÇÃO</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Ordens de serviço</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {orders.length} {orders.length === 1 ? "ordem na sua visualização" : "ordens na sua visualização"}
          </Text>
        </View>
        <View style={[styles.count, { backgroundColor: colors.primary }]}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
          </View>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <IconSymbol name="magnifyingglass" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por OS, cliente ou serviço"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground }]}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {statuses.map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[
              styles.filter,
              {
                backgroundColor: filter === item ? colors.primary : colors.surface,
                borderColor: filter === item ? colors.primary : colors.border,
              },
            ]}
          >
            {item !== "Todas" && (
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: filter === item ? "#09090B" : statusColors[item] },
                ]}
              />
            )}
            <Text style={[styles.filterText, { color: filter === item ? "#09090B" : colors.muted }]}> 
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18` }]}>
            <IconSymbol name="magnifyingglass" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma ordem encontrada</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Ajuste a busca ou o filtro para continuar.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {orders.map((order, index) => {
            const client = state.clients.find((item) => item.id === order.clientId);
            const employee = state.employees.find((item) => item.id === order.employeeId);
            return (
              <Pressable
                key={order.id}
                onPress={() => router.push((`/order/${order.id}`) as never)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.idRow}>
                    <Text style={[styles.orderId, { color: colors.primary }]}>{order.id}</Text>
                    <View
                      style={[
                        styles.priority,
                        {
                          backgroundColor:
                            order.priority === "Alta" ? "#FEE2E2" : order.priority === "Média" ? "#FEF3C7" : "#D1FAE5",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color:
                              order.priority === "Alta"
                                ? "#B91C1C"
                                : order.priority === "Média"
                                  ? "#B45309"
                                  : "#047857",
                          },
                        ]}
                      >
                        {order.priority}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.status}>
                    <View style={[styles.dot, { backgroundColor: statusColors[order.status] }]} />
                    <Text style={[styles.statusText, { color: colors.muted }]}>{order.status}</Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{order.title}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {client?.name} · {order.date} às {order.time}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.assignee}>
                    <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{employee?.initials}</Text>
                    </View>
                    <Text style={[styles.assigneeText, { color: colors.muted }]}>{employee?.name}</Text>
                  </View>
                  <Text style={[styles.actionText, { color: colors.primary }]}>Ver detalhes</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 30, gap: 16 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  logoMark: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center" },
  logoWordmark: { color: "#FAFAFA", fontSize: 20, fontWeight: "900", letterSpacing: 1.2 },
  logoBadge: { minWidth: 38, height: 25, borderRadius: 7, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  logoBadgeText: { color: "#09090B", fontSize: 14, fontWeight: "900" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800", marginTop: 4 },
  subtitle: { fontSize: 13, marginTop: 5 },
  count: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  countText: { color: "#09090B", fontSize: 18, fontWeight: "800" },
  search: { height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, fontSize: 14 },
  clearButton: { padding: 4 },
  filters: { gap: 8, marginVertical: 4 },
  filter: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 12, fontWeight: "800" },
  list: { gap: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  idRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderId: { fontSize: 12, fontWeight: "800" },
  priority: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 10, fontWeight: "800" },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 12 },
  meta: { fontSize: 12, marginTop: 6 },
  cardFooter: { borderTopWidth: 1, marginTop: 13, paddingTop: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  assignee: { flexDirection: "row", alignItems: "center", gap: 7 },
  avatar: { width: 27, height: 27, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 10, fontWeight: "800" },
  assigneeText: { fontSize: 11, fontWeight: "600" },
  actionText: { fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 13, textAlign: "center" },
  loading: { paddingVertical: 20 },
});
