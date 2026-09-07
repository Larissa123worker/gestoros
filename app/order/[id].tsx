import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { SignaturePad } from "@/components/signature-pad";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { store, useAppStore } from "@/lib/app-store";
import { useRequireAuth } from "@/hooks/use-require-auth";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "Pendente":     { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   label: "Pendente" },
  "Em andamento": { color: "#D9FF3F", bg: "rgba(217,255,63,0.1)",    label: "Em andamento" },
  "Concluída":    { color: "#10B981", bg: "rgba(16,185,129,0.1)",   label: "Concluída" },
  "Cancelada":    { color: "#EF4444", bg: "rgba(239,68,68,0.1)",    label: "Cancelada" },
};

const PRIORITY_COLOR: Record<string, string> = {
  Alta: "#EF4444",
  Média: "#F59E0B",
  Baixa: "#10B981",
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PressableCard({ onPress, children, style }: any) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 12 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

function Section({
  icon,
  title,
  children,
  delay = 0,
  action,
  locked = false,
  completed = false,
  lockReason,
}: {
  icon: IconSymbolName;
  title: string;
  children: React.ReactNode;
  delay?: number;
  action?: React.ReactNode;
  locked?: boolean;
  completed?: boolean;
  lockReason?: string;
}) {
  const iconColor = locked ? "#52525B" : completed ? "#10B981" : "#D9FF3F";
  const iconBg = locked ? "rgba(82,82,91,0.12)" : completed ? "rgba(16,185,129,0.12)" : "rgba(6,182,212,0.1)";
  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(delay).springify()}
      style={[styles.card, locked && styles.cardLocked, completed && styles.cardCompleted]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
            <IconSymbol name={locked ? "lock.fill" : icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.cardTitle, locked && { color: "#52525B" }]}>{title}</Text>
        </View>
        {!locked && action}
        {completed && (
          <View style={styles.completedBadge}>
            <IconSymbol name="checkmark" size={10} color="#10B981" />
          </View>
        )}
      </View>
      {locked ? (
        <View style={styles.lockOverlay}>
          <IconSymbol name="lock.fill" size={20} color="#3F3F46" />
          <Text style={styles.lockText}>{lockReason ?? "Complete a etapa anterior para desbloquear."}</Text>
        </View>
      ) : children}
    </Animated.View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading } = useRequireAuth();
  const state = useAppStore();
  const [isLocating, setIsLocating] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [signature, setSignature] = useState("");

  // Absent client modal
  const [showAbsent, setShowAbsent] = useState(false);
  const [absenceReason, setAbsenceReason] = useState("");
  const [isSavingAbsence, setIsSavingAbsence] = useState(false);

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const MIN_EVIDENCES = 1;

  const order = state.orders.find((item) => item.id === id);
  const client = state.clients.find((item) => item.id === order?.clientId);
  const employee = state.employees.find((item) => item.id === order?.employeeId);

  if (!order)
    return (
      <ScreenContainer
        style={{ backgroundColor: "#09090B", alignItems: "center", justifyContent: "center" }}
        edges={["top", "bottom", "left", "right"]}
      >
        <IconSymbol name="tray.fill" size={48} color="#27272A" />
        <Text style={{ color: "#A1A1AA", fontWeight: "700", marginTop: 12, marginBottom: 24 }}>
          Ordem não encontrada.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.goBack}>
          <Text style={{ color: "#09090B", fontWeight: "900" }}>Voltar</Text>
        </Pressable>
      </ScreenContainer>
    );

  const clientName = client?.name ?? "Cliente não identificado";
  const clientContact = client?.contact ?? "";
  
  const employeeName = employee?.name ?? state.professionalName ?? "Técnico responsável";
  const employeeInitials = employee?.initials ?? (employeeName ? employeeName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "TR");

  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["Pendente"];

  const openRoute = () => {
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`
    );
  };

  const registerArrival = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS === "web" && !navigator.geolocation)
        throw new Error("Navegador sem suporte a geolocalização.");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error("Permissão de localização não concedida.");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      // Distance warning: compare with order coords if available
      let distanceMsg = "";
      if (order.arrival === undefined) {
        // If order has lat/long stored, calculate distance
        const orderLat = (order as any).latitude ? Number((order as any).latitude) : null;
        const orderLng = (order as any).longitude ? Number((order as any).longitude) : null;
        if (orderLat && orderLng) {
          const R = 6371000;
          const dLat = (latitude - orderLat) * Math.PI / 180;
          const dLon = (longitude - orderLng) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(orderLat*Math.PI/180)*Math.cos(latitude*Math.PI/180)*Math.sin(dLon/2)**2;
          const distMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
          if (distMeters > 500) {
            distanceMsg = `\n\n⚠️ Você está a ${distMeters}m do endereço da OS. Confirme que chegou no local correto.`;
          }
        }
      }

      store.registerArrival(order.id, latitude, longitude);
      Alert.alert("Chegada registrada ✓", `A localização foi vinculada a esta OS.${distanceMsg}`);
    } catch (error) {
      Alert.alert(
        "Erro ao registrar",
        error instanceof Error ? error.message : "Verifique a permissão e tente novamente."
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleAbsence = async () => {
    if (!absenceReason.trim()) {
      Alert.alert("Justificativa obrigatória", "Descreva o motivo da ausência do cliente.");
      return;
    }
    setIsSavingAbsence(true);
    try {
      await store.recordAbsence(order.id, absenceReason.trim());
      setShowAbsent(false);
      setAbsenceReason("");
      Alert.alert("Ausência registrada ✓", "A OS foi encerrada com registro de cliente ausente.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível registrar a ausência.");
    } finally {
      setIsSavingAbsence(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Motivo obrigatório", "Informe o motivo do cancelamento.");
      return;
    }
    setIsCancelling(true);
    try {
      await store.cancelOrder(order.id, cancelReason.trim());
      setShowCancel(false);
      setCancelReason("");
      Alert.alert("OS cancelada", "O motivo foi registrado.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível cancelar a OS.");
    } finally {
      setIsCancelling(false);
    }
  };

  const completeWithApproval = () => {
    if (!customerName.trim() || !signature.trim()) {
      Alert.alert("Dados incompletos", "Informe o nome e colete a assinatura.");
      return;
    }
    store.completeOrder(order.id, customerName.trim(), signature);
    setShowApproval(false);
    Alert.alert("Serviço concluído ✓", "O aceite do cliente foi registrado.");
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: "#09090B" }}>
      {loading && (
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#A1A1AA" }}>Carregando...</Text>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Top bar */}
        <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.topbar}>
          <PressableCard onPress={() => router.back()} style={styles.roundButton}>
            <IconSymbol name="arrow.left" size={20} color="#FAFAFA" />
          </PressableCard>
          <Text style={styles.orderId}>{order.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color }]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </Animated.View>

        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(500).delay(80).springify()} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>ORDEM DE SERVIÇO</Text>
            </View>
            <View style={[styles.priorityBadge, { borderColor: PRIORITY_COLOR[order.priority] }]}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[order.priority] }]} />
              <Text style={[styles.priorityText, { color: PRIORITY_COLOR[order.priority] }]}>
                {order.priority}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{order.title}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <IconSymbol name="calendar" size={14} color="#A1A1AA" />
              <Text style={styles.heroMetaText}>{order.date}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <IconSymbol name="clock.fill" size={14} color="#A1A1AA" />
              <Text style={styles.heroMetaText}>{order.time}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <IconSymbol name="brazilianrealsign.circle.fill" size={14} color="#10B981" />
              <Text style={[styles.heroMetaText, { color: "#10B981" }]}>
                {order.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Cliente */}
        <Section icon="building.2.fill" title="Cliente e local" delay={160}>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.bodyText}>{order.address}</Text>
          <View style={styles.inlineActions}>
            {clientContact ? (
              <PressableCard
                onPress={() => void Linking.openURL(`tel:${clientContact.replace(/\D/g, "")}`)}
                style={styles.actionChip}
              >
                <IconSymbol name="phone.fill" size={15} color="#D9FF3F" />
                <Text style={styles.actionChipText}>Ligar</Text>
              </PressableCard>
            ) : null}
            <PressableCard onPress={openRoute} style={styles.actionChip}>
                <IconSymbol name="location.north.fill" size={15} color="#D9FF3F" />
              <Text style={styles.actionChipText}>Abrir rota</Text>
            </PressableCard>
          </View>
        </Section>

        {/* Escopo */}
        <Section icon="note.text" title="Escopo do serviço" delay={220}>
          <Text style={styles.bodyText}>{order.description}</Text>
          {order.notes ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>OBSERVAÇÃO</Text>
              <Text style={styles.noteText}>{order.notes}</Text>
            </View>
          ) : null}
          <View style={styles.assigneeRow}>
            <View style={styles.assigneeAvatar}>
              <Text style={styles.assigneeInitials}>{employeeInitials}</Text>
            </View>
            <View>
              <Text style={styles.assigneeLabel}>Técnico responsável</Text>
              <Text style={styles.assigneeName}>{employeeName}</Text>
            </View>
          </View>
        </Section>

        {/* Deslocamento */}
        {(() => {
          const isPending = order.status === "Pendente";
          const isArrivalDone = !!order.arrival;
          return (
            <Section
              icon="map.fill"
              title="Deslocamento"
              delay={280}
              locked={isPending}
              completed={isArrivalDone}
              lockReason="Inicie o atendimento para registrar sua chegada."
            >
              {isArrivalDone ? (
                <View style={styles.arrivalDone}>
                  <IconSymbol name="checkmark.circle.fill" size={22} color="#10B981" />
                  <Text style={styles.arrivalDoneText}>
                    Chegada registrada em {order.arrival!.registeredAt}
                  </Text>
                </View>
              ) : (
                <Text style={styles.bodyText}>
                  Registre sua chegada ao local para criar um comprovante de atendimento.
                </Text>
              )}
              <PressableCard
                onPress={registerArrival}
                disabled={isLocating || isArrivalDone}
                style={[styles.fullButton, isArrivalDone && styles.fullButtonDone]}
              >
                <IconSymbol
                  name="location.fill"
                  size={18}
                  color={isArrivalDone ? "#10B981" : "#09090B"}
                />
                <Text style={[styles.fullButtonText, isArrivalDone && { color: "#10B981" }]}>
                  {isLocating ? "Registrando..." : isArrivalDone ? "Chegada confirmada" : "Registrar chegada"}
                </Text>
              </PressableCard>
            </Section>
          );
        })()}

        {/* Evidências */}
        {(() => {
          const isLocked = !order.arrival;
          const hasEvidences = (order.evidences?.length ?? 0) > 0;
          return (
            <Section
              icon="photo.on.rectangle"
              title="Evidências"
              delay={340}
              locked={isLocked}
              completed={hasEvidences}
              lockReason="Registre sua chegada ao local para adicionar evidências."
              action={
                <PressableCard
                  onPress={() => router.push({ pathname: "/camera", params: { orderId: order.id } } as never)}
                  style={styles.addPhoto}
                >
                  <IconSymbol name="camera.fill" size={16} color="#D9FF3F" />
                  <Text style={styles.addPhotoText}>Adicionar</Text>
                </PressableCard>
              }
            >
              {hasEvidences ? (
                <Animated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                  entering={FadeInRight.duration(400)}
                >
                  {order.evidences!.map((evidence) => (
                    <Image
                      key={evidence.id}
                      source={{ uri: evidence.uri }}
                      style={styles.evidenceImage}
                    />
                  ))}
                </Animated.ScrollView>
              ) : (
                <View style={styles.emptyEvidence}>
                  <IconSymbol name="camera.fill" size={30} color="#27272A" />
                  <Text style={styles.emptyEvidenceText}>
                    Nenhuma foto ainda. Use o botão acima para registrar.
                  </Text>
                </View>
              )}
            </Section>
          );
        })()}

        {/* Aceite */}
        {(() => {
          const evidenceCount = order.evidences?.length ?? 0;
          const hasEnoughEvidences = evidenceCount >= MIN_EVIDENCES;
          const isLocked = !order.arrival || !hasEnoughEvidences;
          const isApproved = !!order.approval;
          const isAbsent = !!order.absentClient;
          const lockReason = !order.arrival
            ? "Registre sua chegada ao local para coletar o aceite do cliente."
            : `Adicione pelo menos ${MIN_EVIDENCES} foto(s) como evidência antes de coletar o aceite.`;
          return (
            <Section
              icon="signature"
              title="Aceite do cliente"
              delay={400}
              locked={isLocked}
              completed={isApproved || isAbsent}
              lockReason={lockReason}
            >
              {isApproved ? (
                <View style={styles.approvalDone}>
                  <IconSymbol name="checkmark.seal.fill" size={32} color="#10B981" />
                  <View>
                    <Text style={styles.approvalDoneTitle}>Serviço aprovado</Text>
                    <Text style={styles.approvalDoneSub}>
                      {order.approval!.name} · {order.approval!.acceptedAt}
                    </Text>
                  </View>
                </View>
              ) : isAbsent ? (
                <View style={styles.approvalDone}>
                  <IconSymbol name="person.fill.xmark" size={28} color="#F59E0B" />
                  <View>
                    <Text style={[styles.approvalDoneTitle, { color: "#F59E0B" }]}>Cliente ausente</Text>
                    <Text style={styles.approvalDoneSub}>{order.absentClient!.reason}</Text>
                    <Text style={[styles.approvalDoneSub, { marginTop: 2 }]}>{order.absentClient!.registeredAt}</Text>
                  </View>
                </View>
              ) : showApproval ? (
                <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 12 }}>
                  <TextInput
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Nome do responsável pelo aceite"
                    placeholderTextColor="#71717A"
                    style={styles.nameInput}
                  />
                  <View style={styles.signatureWrapper}>
                    <SignaturePad onChange={setSignature} />
                  </View>
                  <PressableCard onPress={completeWithApproval} style={styles.fullButton}>
                    <IconSymbol name="checkmark.circle.fill" size={18} color="#09090B" />
                    <Text style={styles.fullButtonText}>Concluir e registrar aceite</Text>
                  </PressableCard>
                  <PressableCard onPress={() => setShowApproval(false)} style={styles.outlineButton}>
                    <Text style={styles.outlineButtonText}>Cancelar</Text>
                  </PressableCard>
                </Animated.View>
              ) : (
                <>
                  <Text style={styles.bodyText}>
                    Peça a assinatura do responsável para confirmar a execução do serviço.
                  </Text>
                  <PressableCard onPress={() => setShowApproval(true)} style={styles.fullButton}>
                    <IconSymbol name="signature" size={18} color="#09090B" />
                    <Text style={styles.fullButtonText}>Coletar assinatura</Text>
                  </PressableCard>
                  <PressableCard onPress={() => { setShowAbsent(true); setShowApproval(false); }} style={styles.absentButton}>
                    <IconSymbol name="person.fill.xmark" size={16} color="#F59E0B" />
                    <Text style={styles.absentButtonText}>Cliente ausente</Text>
                  </PressableCard>
                </>
              )}
            </Section>
          );
        })()}

        {/* Ausência modal inline */}
        {showAbsent && !order.absentClient && (
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <IconSymbol name="person.fill.xmark" size={20} color="#F59E0B" />
              <Text style={styles.modalCardTitle}>Registrar ausência</Text>
            </View>
            <Text style={styles.bodyText}>
              Descreva o motivo da ausência. Isso será registrado na OS como comprovante.
            </Text>
            <TextInput
              value={absenceReason}
              onChangeText={setAbsenceReason}
              placeholder="Ex: Cliente não atendeu, endereço fechado..."
              placeholderTextColor="#71717A"
              multiline
              numberOfLines={3}
              style={[styles.nameInput, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
            />
            <PressableCard
              onPress={handleAbsence}
              disabled={isSavingAbsence}
              style={[styles.fullButton, { backgroundColor: "#F59E0B" }]}
            >
              <IconSymbol name="checkmark.circle.fill" size={18} color="#09090B" />
              <Text style={styles.fullButtonText}>{isSavingAbsence ? "Salvando..." : "Confirmar ausência"}</Text>
            </PressableCard>
            <PressableCard onPress={() => setShowAbsent(false)} style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Cancelar</Text>
            </PressableCard>
          </Animated.View>
        )}

        {/* Cancelar OS */}
        {order.status === "Em andamento" && !order.approval && !order.absentClient && (
          <Animated.View entering={FadeInDown.duration(500).delay(480).springify()}>
            {showCancel ? (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.modalCard}>
                <View style={styles.modalCardHeader}>
                  <IconSymbol name="xmark.circle.fill" size={20} color="#EF4444" />
                  <Text style={[styles.modalCardTitle, { color: "#EF4444" }]}>Motivo do cancelamento</Text>
                </View>
                <Text style={styles.bodyText}>
                  Informe o que impediu a execução. Isso ficará registrado na OS.
                </Text>
                <TextInput
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="Ex: Cliente cancelou, endereço incorreto..."
                  placeholderTextColor="#71717A"
                  multiline
                  numberOfLines={3}
                  style={[styles.nameInput, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                />
                <PressableCard
                  onPress={handleCancel}
                  disabled={isCancelling}
                  style={[styles.fullButton, { backgroundColor: "#EF4444" }]}
                >
                  <IconSymbol name="xmark.circle.fill" size={18} color="#FAFAFA" />
                  <Text style={[styles.fullButtonText, { color: "#FAFAFA" }]}>{isCancelling ? "Cancelando..." : "Cancelar OS"}</Text>
                </PressableCard>
                <PressableCard onPress={() => setShowCancel(false)} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>Voltar</Text>
                </PressableCard>
              </Animated.View>
            ) : (
              <PressableCard onPress={() => setShowCancel(true)} style={styles.cancelButton}>
                <IconSymbol name="xmark.circle" size={18} color="#71717A" />
                <Text style={styles.cancelButtonText}>Não foi possível executar</Text>
              </PressableCard>
            )}
          </Animated.View>
        )}

        {/* Iniciar atendimento */}
        {order.status === "Pendente" && (
          <Animated.View entering={FadeInDown.duration(500).delay(460).springify()}>
            <PressableCard
              onPress={() => store.updateOrderStatus(order.id, "Em andamento")}
              style={styles.startButton}
            >
              <IconSymbol name="wrench.and.screwdriver.fill" size={20} color="#09090B" />
              <Text style={styles.startButtonText}>Iniciar atendimento</Text>
            </PressableCard>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 24,
    gap: 16,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  goBack: {
    backgroundColor: "#D9FF3F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  orderId: { fontSize: 14, fontWeight: "900", color: "#FAFAFA" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "900" },

  // Hero
  hero: {
    backgroundColor: "#18181B",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#27272A",
    gap: 12,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroBadge: {
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: { color: "#D9FF3F", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityText: { fontSize: 11, fontWeight: "900" },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMetaText: { color: "#A1A1AA", fontSize: 13, fontWeight: "700" },

  // Card section
  card: {
    backgroundColor: "#18181B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 20,
    gap: 14,
  },
  cardLocked: {
    opacity: 0.5,
    borderColor: "#27272A",
    borderStyle: "dashed",
  },
  cardCompleted: {
    borderColor: "rgba(16,185,129,0.3)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#FAFAFA" },
  completedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  lockText: { fontSize: 13, color: "#52525B", fontWeight: "600", flex: 1 },

  // Client section
  clientName: { fontSize: 18, fontWeight: "900", color: "#FAFAFA" },
  bodyText: { fontSize: 14, lineHeight: 21, color: "#A1A1AA", fontWeight: "500" },
  inlineActions: { flexDirection: "row", gap: 10 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.3)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(6,182,212,0.07)",
  },
  actionChipText: { fontSize: 13, fontWeight: "800", color: "#D9FF3F" },

  // Notes
  noteBox: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  noteLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, color: "#D9FF3F" },
  noteText: { fontSize: 13, lineHeight: 19, color: "#FAFAFA" },

  // Assignee
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#09090B",
    borderRadius: 14,
    padding: 12,
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitials: { fontSize: 14, fontWeight: "900", color: "#FAFAFA" },
  assigneeLabel: { fontSize: 11, color: "#71717A", fontWeight: "700" },
  assigneeName: { fontSize: 15, fontWeight: "900", color: "#FAFAFA" },

  // Arrival
  arrivalDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  arrivalDoneText: { fontSize: 14, fontWeight: "700", color: "#10B981" },

  // Buttons
  fullButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#D9FF3F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  fullButtonDone: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  fullButtonText: { fontSize: 15, fontWeight: "900", color: "#09090B" },
  outlineButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.4)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(6,182,212,0.06)",
  },
  outlineButtonText: { fontSize: 15, fontWeight: "900", color: "#D9FF3F" },
  startButton: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#FAFAFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonText: { fontSize: 16, fontWeight: "900", color: "#09090B" },

  // Evidence
  evidenceImage: { width: 160, height: 120, borderRadius: 14 },
  emptyEvidence: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    backgroundColor: "#09090B",
    borderRadius: 14,
  },
  emptyEvidenceText: { fontSize: 13, color: "#71717A", textAlign: "center", fontWeight: "600" },
  addPhoto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.1)",
  },
  addPhotoText: { fontSize: 12, fontWeight: "800", color: "#D9FF3F" },

  // Approval
  approvalDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 16,
    padding: 16,
  },
  approvalDoneTitle: { fontSize: 16, fontWeight: "900", color: "#10B981" },
  approvalDoneSub: { fontSize: 13, color: "#A1A1AA", marginTop: 4, fontWeight: "600" },
  nameInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#FAFAFA",
    backgroundColor: "#09090B",
    borderColor: "#27272A",
  },
  signatureWrapper: { borderRadius: 14, overflow: "hidden" },

  // Absent / Cancel
  absentButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.06)",
  },
  absentButtonText: { fontSize: 14, fontWeight: "800", color: "#F59E0B" },
  cancelButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  cancelButtonText: { fontSize: 14, fontWeight: "700", color: "#71717A" },
  modalCard: {
    backgroundColor: "#18181B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 20,
    gap: 14,
  },
  modalCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalCardTitle: { fontSize: 16, fontWeight: "900", color: "#FAFAFA" },
});
