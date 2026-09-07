import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeInUp, FadeInRight } from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { store, useAppStore, type Role } from "@/lib/app-store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { CompanyIdBadge } from "@/components/company-id-badge";
import { GestorLogo } from "@/components/gestor-logo";

const statusColors: Record<string, string> = {
  "Pendente": "#F59E0B",
  "Em andamento": "#D9FF3F",
  "Concluída": "#10B981",
  "Cancelada": "#EF4444",
};

export default function HomeScreen() {
  const colors = useColors();
  const { user, loading, isProfessional } = useRequireAuth();
  const { logout: supabaseLogout } = useSupabaseAuth();
  const state = useAppStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleOrders = useMemo(
    () =>
      state.membership === "employee" || state.role === "funcionario"
        ? state.orders.filter((order) => order.employeeId === state.currentEmployeeId)
        : state.orders,
    [state]
  );
  
  const metrics = {
    total: visibleOrders.length,
    pending: visibleOrders.filter((order) => order.status === "Pendente").length,
    progress: visibleOrders.filter((order) => order.status === "Em andamento").length,
    done: visibleOrders.filter((order) => order.status === "Concluída").length,
  };
  
  const employee = state.employees.find((item) => item.id === state.currentEmployeeId);
  const displayName =
    state.professionalName?.split(" ")[0] ??
    employee?.name.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "usuário";
  const setRole = (role: Role) => store.setRole(role);

  async function handleLogout() {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      if (state.membership === "employee") {
        await store.logoutProfessional();
        router.replace("/login-profissional" as any);
        return;
      }
      // Admin logout: encerra sessão Supabase e redireciona para início
      await supabaseLogout();
      router.replace("/login" as any);
    } catch {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center px-6" edges={["top", "bottom", "left", "right"]}>
        <Text style={{ color: colors.muted }}>Carregando...</Text>
      </ScreenContainer>
    );
  }

  // Modern imagery
  const heroImage = require("@/assets/images/pexels-gustavo-fring-6699404.jpeg");

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: "#09090B" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
        
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
          <GestorLogo subtitle />
          <View style={styles.headerRight}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Ao vivo</Text>
            </View>
            <Pressable accessibilityLabel="Notificações" style={styles.iconButton}>
              <IconSymbol name="bell.fill" size={20} color="#FAFAFA" />
            </Pressable>
            {!isProfessional && !!user ? (
              <Pressable
                id="admin-logout-btn"
                accessibilityLabel="Sair da conta"
                onPress={handleLogout}
                disabled={loggingOut}
                style={[styles.iconButton, styles.logoutIconButton]}
              >
                {loggingOut
                  ? <ActivityIndicator size="small" color="#F87171" />
                  : <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#F87171" />}
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {state.companyId ? (
          <Animated.View entering={FadeInDown.duration(600).delay(50).springify()} style={{ marginBottom: 8 }}>
            <CompanyIdBadge
              companyId={state.companyId}
              label={state.role === "empresa" ? "ID da sua empresa" : "ID da empresa vinculada"}
            />
          </Animated.View>
        ) : null}

        {/* Greeting & Role Switch */}
        <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.greetingContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Bem-vindo, {displayName}.</Text>
            <Text style={styles.subtitle}>
              {isProfessional || state.role === "funcionario"
                ? "Suas ordens de serviço atribuídas."
                : "Visão estratégica da sua operação em campo."}
            </Text>
          </View>

          {state.membership === "owner" ? (
            <View style={styles.roleSwitch}>
              {(["empresa", "funcionario"] as Role[]).map((role) => (
                <Pressable key={role} onPress={() => setRole(role)} style={[styles.roleOption, state.role === role && styles.roleOptionActive]}>
                  <IconSymbol name={role === "empresa" ? "building.2.fill" : "person.fill"} size={14} color={state.role === role ? "#000" : "#A1A1AA"} />
                  <Text style={[styles.roleLabel, { color: state.role === role ? "#000" : "#A1A1AA" }]}>
                    {role === "empresa" ? "Gestor" : "Técnico"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : isProfessional ? (
            <Pressable
              id="professional-logout-btn"
              onPress={handleLogout}
              disabled={loggingOut}
              style={[styles.logoutChip, loggingOut && { opacity: 0.6 }]}
            >
              <Text style={styles.logoutText}>{loggingOut ? "Saindo..." : "Sair"}</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* Desktop Layout Wrapper */}
        <View style={isDesktop ? styles.desktopGrid : styles.mobileStack}>
          
          {/* Main Column */}
          <View style={isDesktop && styles.mainColumn}>
            
            {/* Hero Image Card */}
            <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.heroCard}>
              <Image source={heroImage} style={styles.heroBgImage} resizeMode="cover" />
              <View style={styles.heroGradient} />
              <View style={styles.heroContent}>
                <View style={styles.heroTag}>
                  <Text style={styles.heroTagText}>{state.role === "empresa" ? "PAINEL DE CONTROLE" : "PRÓXIMO SERVIÇO"}</Text>
                </View>
                <Text style={styles.heroTitle}>{state.role === "empresa" ? "Acompanhe e escale sua equipe." : "Você tem novas ordens."}</Text>
                <Text style={styles.heroDescription}>
                  {state.role === "empresa" 
                    ? "Toda a operação em tempo real. Identifique gargalos e otimize o atendimento." 
                    : "Toque em ver ordens para iniciar o deslocamento e atualizar o painel."}
                </Text>
                <Pressable onPress={() => router.push("/orders")} style={styles.heroButton}>
                  <Text style={styles.heroButtonText}>Acessar Ordens</Text>
                  <IconSymbol name="arrow.right" size={16} color="#09090B" />
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Métricas do Dia</Text>
              <Text style={styles.sectionMeta}>Hoje, 14 Ago</Text>
            </Animated.View>

            <View style={styles.metricsGrid}>
              <MetricCard label="Total de OS" value={metrics.total} color="#D9FF3F" icon="briefcase.fill" delay={300} />
              <MetricCard label="Pendentes" value={metrics.pending} color="#F59E0B" icon="clock.fill" delay={350} />
              <MetricCard label="Em andamento" value={metrics.progress} color="#D9FF3F" icon="wrench.and.screwdriver.fill" delay={400} />
              <MetricCard label="Concluídas" value={metrics.done} color="#10B981" icon="checkmark.circle.fill" delay={450} />
            </View>
          </View>

          {/* Side Column (Recent Orders) */}
          <View style={isDesktop && styles.sideColumn}>
            
            <Animated.View entering={FadeInDown.duration(600).delay(500).springify()} style={[styles.sectionHeading, isDesktop && { marginTop: 0 }]}>
              <Text style={styles.sectionTitle}>Atividade Recente</Text>
              <Pressable onPress={() => router.push("/orders")}>
                <Text style={styles.link}>Ver todas</Text>
              </Pressable>
            </Animated.View>
            
            <View style={styles.orderList}>
              {visibleOrders.slice(0, isDesktop ? 6 : 3).map((order, index) => {
                const client = state.clients.find((item) => item.id === order.clientId);
                return (
                  <Animated.View key={order.id} entering={FadeInRight.duration(500).delay(500 + index * 100).springify()}>
                    <Pressable
                      onPress={() => router.push((`/order/${order.id}`) as never)}
                      style={[styles.orderRow, index < (isDesktop ? Math.min(5, visibleOrders.length - 1) : 2) && styles.orderRowBorder]}
                    >
                      <View style={[styles.orderIcon, { backgroundColor: `${statusColors[order.status] || "#71717A"}22` }]}>
                        <IconSymbol name="wrench.and.screwdriver.fill" size={18} color={statusColors[order.status] || "#71717A"} />
                      </View>
                      <View style={styles.orderInfo}>
                        <Text numberOfLines={1} style={styles.orderTitle}>{order.title}</Text>
                        <Text style={styles.orderClient}>ID: {order.id} · {client?.name}</Text>
                      </View>
                      <View style={styles.orderStatus}>
                        <View style={[styles.statusDot, { backgroundColor: statusColors[order.status] || "#71717A" }]} />
                        <Text style={styles.statusText}>{order.status}</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
              {visibleOrders.length === 0 && (
                <View style={styles.emptyState}>
                  <IconSymbol name="tray.fill" size={40} color="#27272A" />
                  <Text style={styles.emptyStateText}>Sua lista está limpa.</Text>
                </View>
              )}
            </View>

            <Animated.View entering={FadeInDown.duration(600).delay(800).springify()}>
              {!isProfessional ? (
                <Pressable onPress={() => router.push("/new-order")} style={styles.primaryButton}>
                  <IconSymbol name="plus" size={20} color="#000" />
                  <Text style={styles.primaryButtonText}>Nova Ordem</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </View>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricCard({ label, value, color, icon, delay }: { label: string; value: number; color: string; icon: IconSymbolName; delay: number }) {
  return (
    <Animated.View entering={FadeInUp.duration(600).delay(delay).springify()} style={styles.metricCardWrapper}>
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
            <IconSymbol name={icon} size={20} color={color} />
          </View>
          <Text style={styles.metricValue}>{value}</Text>
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60, gap: 32, maxWidth: 1200, alignSelf: "center", width: "100%" },
  scrollContentDesktop: { paddingTop: 40, gap: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#D9FF3F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217, 255, 63, 0.7)",
  },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: "#A1A1AA", marginTop: 2 },
  company: { fontSize: 18, fontWeight: "900", color: "#FAFAFA", letterSpacing: -0.5 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A", alignItems: "center", justifyContent: "center" },
  greetingContainer: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20 },
  greeting: { fontSize: 36, lineHeight: 40, fontWeight: "900", letterSpacing: -1, color: "#FFFFFF" },
  subtitle: { fontSize: 16, marginTop: 8, color: "#A1A1AA", fontWeight: "500" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(16, 185, 129, 0.1)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.2)" },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { color: "#34D399", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  roleSwitch: { flexDirection: "row", borderRadius: 14, backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A", padding: 6, minWidth: 220 },
  roleOption: { flex: 1, borderRadius: 10, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  roleOptionActive: { backgroundColor: "#FAFAFA" },
  roleLabel: { fontSize: 13, fontWeight: "800" },
  logoutChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  logoutText: { color: "#F87171", fontSize: 13, fontWeight: "900" },
  logoutIconButton: {
    borderColor: "rgba(248, 113, 113, 0.25)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  },
  desktopGrid: { flexDirection: "row", gap: 40, alignItems: "flex-start" },
  mobileStack: { gap: 32 },
  mainColumn: { flex: 1.8 },
  sideColumn: { flex: 1, minWidth: 340, gap: 24 },
  sectionHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: "#FAFAFA" },
  sectionMeta: { fontSize: 14, fontWeight: "600", color: "#71717A" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metricCardWrapper: { width: "47.5%", minWidth: 140 },
  metricCard: { borderRadius: 20, padding: 20, backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A" },
  metricHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  metricIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 32, fontWeight: "900", letterSpacing: -1, color: "#FAFAFA" },
  metricLabel: { fontSize: 14, fontWeight: "700", color: "#A1A1AA" },
  heroCard: { borderRadius: 28, height: 280, overflow: "hidden", marginBottom: 40, backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A" },
  heroBgImage: { width: "100%", height: "100%", position: "absolute" },
  heroGradient: { width: "100%", height: "100%", position: "absolute", backgroundColor: "rgba(9, 9, 11, 0.65)" },
  heroContent: { flex: 1, padding: 32, justifyContent: "space-between" },
  heroTag: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(250, 250, 250, 0.1)", borderWidth: 1, borderColor: "rgba(250, 250, 250, 0.2)" },
  heroTagText: { color: "#FAFAFA", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  heroTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 36, fontWeight: "900", marginTop: "auto", maxWidth: 400, letterSpacing: -1 },
  heroDescription: { color: "#A1A1AA", fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 450, fontWeight: "500" },
  heroButton: { marginTop: 24, backgroundColor: "#D9FF3F", alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  heroButtonText: { fontSize: 14, fontWeight: "900", color: "#09090B" },
  link: { fontSize: 14, fontWeight: "800", color: "#D9FF3F" },
  orderList: { borderRadius: 20, overflow: "hidden", backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A" },
  orderRow: { minHeight: 84, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16 },
  orderRowBorder: { borderBottomColor: "#27272A", borderBottomWidth: 1 },
  orderIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  orderInfo: { flex: 1, minWidth: 0 },
  orderTitle: { fontSize: 15, fontWeight: "800", marginBottom: 6, color: "#FAFAFA" },
  orderClient: { fontSize: 13, color: "#71717A", fontWeight: "600" },
  orderStatus: { alignItems: "flex-end", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "800", color: "#A1A1AA" },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyStateText: { fontSize: 15, fontWeight: "700", color: "#71717A" },
  primaryButton: { minHeight: 56, borderRadius: 16, backgroundColor: "#FAFAFA", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 8 },
  primaryButtonText: { color: "#09090B", fontSize: 15, fontWeight: "900" },
});
