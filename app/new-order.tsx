import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { store, useAppStore, type Priority } from "@/lib/app-store";
import { useRequireAuth } from "@/hooks/use-require-auth";

const priorities: Priority[] = ["Alta", "Média", "Baixa"];

const PRIORITY_META: Record<Priority, { color: string; icon: string }> = {
  Alta: { color: "#EF4444", icon: "exclamationmark.triangle.fill" },
  Média: { color: "#F59E0B", icon: "minus.circle.fill" },
  Baixa: { color: "#10B981", icon: "arrow.down.circle.fill" },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function InteractiveButton({ onPress, disabled, children, style }: any) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.96, { damping: 12 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: any) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71717A"
        multiline={multiline}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.input, multiline && styles.multiline, isFocused && styles.inputFocused]}
      />
    </View>
  );
}

export default function NewOrderScreen() {
  const { loading } = useRequireAuth();
  const state = useAppStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [clientId, setClientId] = useState(state.clients[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("Média");
  const [value, setValue] = useState("");

  // Calendar & time state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState("09:00");

  const canSubmit = title.trim().length > 2 && clientId && employeeId;

  const formattedDate = selectedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "short",
  });

  function createOrder() {
    if (!canSubmit) return;
    store.addOrder({
      title: title.trim(),
      description: description.trim() || "Descrição a definir no atendimento.",
      clientId,
      employeeId,
      status: "Pendente",
      priority,
      date: formattedDate,
      time,
      value: Number(value.replace(",", ".")) || 0,
      address:
        state.clients.find((client) => client.id === clientId)?.city ??
        "Endereço a confirmar",
      notes: "",
    });
    router.back();
  }

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      style={{ backgroundColor: "#09090B" }}
    >
      {loading && (
        <View style={styles.loading}>
          <Text style={{ color: "#A1A1AA" }}>Carregando...</Text>
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).springify()}
            style={styles.header}
          >
            <InteractiveButton onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="arrow.left" size={20} color="#FAFAFA" />
            </InteractiveButton>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>NOVA OS</Text>
              <Text style={styles.title}>Criar ordem</Text>
            </View>
            <View style={{ width: 44 }} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.duration(500).delay(100).springify()}
            style={styles.helper}
          >
            Preencha os dados e escolha a data de agendamento.
          </Animated.Text>

          {/* Serviço & Descrição */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(150).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>📋 Serviço</Text>
            {state.catalog.some((item) => item.active) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {state.catalog.filter((item) => item.active).map((item) => (
                  <InteractiveButton
                    key={item.id}
                    onPress={() => {
                      setCatalogId(item.id);
                      setTitle(item.name);
                      setDescription(item.description);
                      setValue(String(item.suggestedValue).replace(".", ","));
                    }}
                    style={[styles.chip, catalogId === item.id ? styles.chipActive : styles.chipInactive]}
                  >
                    <Text style={[styles.chipText, { color: catalogId === item.id ? "#09090B" : "#A1A1AA" }]}>{item.name}</Text>
                  </InteractiveButton>
                ))}
              </ScrollView>
            )}
            <Field
              label="Título"
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Revisão do quadro elétrico"
            />
            <Field
              label="Descrição"
              value={description}
              onChangeText={setDescription}
              placeholder="O que precisa ser feito?"
              multiline
            />
          </Animated.View>

          {/* Cliente */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>🏢 Cliente</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {state.clients.map((client) => {
                const isActive = clientId === client.id;
                return (
                  <InteractiveButton
                    key={client.id}
                    onPress={() => setClientId(client.id)}
                    style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
                  >
                    <IconSymbol
                      name="building.2.fill"
                      size={14}
                      color={isActive ? "#09090B" : "#A1A1AA"}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.chipText, { color: isActive ? "#09090B" : "#A1A1AA" }]}
                    >
                      {client.name}
                    </Text>
                  </InteractiveButton>
                );
              })}
              {state.clients.length === 0 && (
                <Text style={{ color: "#71717A", fontWeight: "700", alignSelf: "center" }}>
                  Nenhum cliente. Cadastre um na aba Cadastros.
                </Text>
              )}
            </ScrollView>
          </Animated.View>

          {/* Técnico */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(250).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>👷 Técnico responsável</Text>
            <View style={styles.employeeGrid}>
              {state.employees.map((employee) => {
                const isActive = employeeId === employee.id;
                return (
                  <InteractiveButton
                    key={employee.id}
                    onPress={() => setEmployeeId(employee.id)}
                    style={[
                      styles.employee,
                      isActive ? styles.employeeActive : styles.employeeInactive,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: isActive ? "#D9FF3F" : "#27272A" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.initials,
                          { color: isActive ? "#09090B" : "#FAFAFA" },
                        ]}
                      >
                        {employee.initials}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.employeeName,
                        { color: isActive ? "#D9FF3F" : "#FAFAFA" },
                      ]}
                    >
                      {employee.name.split(" ")[0]}
                    </Text>
                  </InteractiveButton>
                );
              })}
              {state.employees.length === 0 && (
                <Text style={{ color: "#71717A", fontWeight: "700" }}>
                  Nenhum técnico. Cadastre um na aba Cadastros.
                </Text>
              )}
            </View>
          </Animated.View>

          {/* 📅 Calendário */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>📅 Agendamento</Text>

            {/* Trigger botão para abrir/fechar calendário */}
            <InteractiveButton
              onPress={() => setShowCalendar((v) => !v)}
              style={styles.dateTrigger}
            >
              <View style={styles.dateTriggerLeft}>
                <View style={styles.dateIconBox}>
                  <IconSymbol name="calendar" size={18} color="#D9FF3F" />
                </View>
                <View>
                  <Text style={styles.dateTriggerLabel}>Data selecionada</Text>
                  <Text style={styles.dateTriggerValue}>{formattedDate}</Text>
                </View>
              </View>
              <IconSymbol
                name={showCalendar ? "chevron.up" : "chevron.down"}
                size={18}
                color="#71717A"
              />
            </InteractiveButton>

            {/* Calendário inline */}
            {showCalendar && (
              <Animated.View entering={FadeInRight.duration(400).springify()}>
                <CalendarPicker
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }}
                />
              </Animated.View>
            )}

            {/* Horário */}
            <Field
              label="Horário"
              value={time}
              onChangeText={setTime}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />
          </Animated.View>

          {/* Prioridade & Valor */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(350).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>⚡ Prioridade & Valor</Text>
            <View style={styles.row}>
              <View style={{ flex: 1.4, gap: 8 }}>
                <Text style={styles.label}>Prioridade</Text>
                <View style={styles.priorityRow}>
                  {priorities.map((item) => {
                    const isActive = priority === item;
                    const meta = PRIORITY_META[item];
                    return (
                      <InteractiveButton
                        key={item}
                        onPress={() => setPriority(item)}
                        style={[
                          styles.priority,
                          isActive
                            ? { backgroundColor: meta.color, borderColor: meta.color }
                            : styles.priorityInactive,
                        ]}
                      >
                        <IconSymbol
                          name={meta.icon as any}
                          size={14}
                          color={isActive ? "#FFFFFF" : "#71717A"}
                        />
                        <Text
                          style={[
                            styles.priorityText,
                            { color: isActive ? "#FFFFFF" : "#A1A1AA" },
                          ]}
                        >
                          {item}
                        </Text>
                      </InteractiveButton>
                    );
                  })}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Valor (R$)"
                  value={value}
                  onChangeText={setValue}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Animated.View>

          {/* Botão Final */}
          <Animated.View entering={FadeInDown.duration(500).delay(400).springify()}>
            <InteractiveButton
              disabled={!canSubmit}
              onPress={createOrder}
              style={[styles.submit, !canSubmit && styles.submitDisabled]}
            >
              <IconSymbol
                name="checkmark.circle.fill"
                size={22}
                color={canSubmit ? "#09090B" : "#71717A"}
              />
              <Text
                style={[styles.submitText, { color: canSubmit ? "#09090B" : "#71717A" }]}
              >
                Lançar Ordem de Serviço
              </Text>
            </InteractiveButton>
            {!canSubmit && (
              <Text style={styles.hint}>
                Preencha o título e selecione cliente e técnico para continuar.
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 24,
    gap: 28,
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { alignItems: "center" },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 2, color: "#D9FF3F" },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FAFAFA",
    letterSpacing: -0.5,
  },
  helper: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#A1A1AA",
  },
  section: {
    gap: 12,
    backgroundColor: "#18181B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FAFAFA",
    marginBottom: 4,
  },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "800", color: "#FAFAFA" },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#FAFAFA",
    backgroundColor: "#09090B",
    borderColor: "#27272A",
  },
  inputFocused: {
    borderColor: "#D9FF3F",
    backgroundColor: "rgba(6, 182, 212, 0.05)",
  },
  multiline: { height: 90, paddingTop: 14, textAlignVertical: "top" },
  chips: { gap: 10, paddingRight: 16, paddingVertical: 4 },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipActive: { backgroundColor: "#D9FF3F", borderColor: "#D9FF3F" },
  chipInactive: { backgroundColor: "#27272A", borderColor: "#27272A" },
  chipText: { fontSize: 13, fontWeight: "800" },
  employeeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  employee: {
    minWidth: 80,
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
  },
  employeeActive: {
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderColor: "#D9FF3F",
  },
  employeeInactive: { backgroundColor: "#09090B", borderColor: "#27272A" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 13, fontWeight: "900" },
  employeeName: { fontSize: 13, fontWeight: "800" },

  // Calendar date trigger
  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#09090B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272A",
    padding: 14,
  },
  dateTriggerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateTriggerLabel: { fontSize: 11, color: "#71717A", fontWeight: "700", marginBottom: 2 },
  dateTriggerValue: { fontSize: 15, fontWeight: "900", color: "#FAFAFA" },

  row: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  priorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priority: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityInactive: { backgroundColor: "#09090B", borderColor: "#27272A" },
  priorityText: { fontSize: 12, fontWeight: "800" },
  submit: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: "#D9FF3F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#D9FF3F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitDisabled: { backgroundColor: "#27272A", shadowOpacity: 0 },
  submitText: { fontSize: 16, fontWeight: "900" },
  hint: { textAlign: "center", marginTop: 10, color: "#71717A", fontSize: 13 },
  loading: { paddingVertical: 20, alignItems: "center" },
});
