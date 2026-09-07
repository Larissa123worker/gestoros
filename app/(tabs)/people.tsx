import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { store, useAppStore } from "@/lib/app-store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { CompanyIdBadge } from "@/components/company-id-badge";
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function InteractiveButton({ onPress, disabled, children, style }: any) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.95))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function PeopleScreen() {
  const { loading, isProfessional } = useRequireAuth();
  const state = useAppStore();
  const [section, setSection] = useState<"clientes" | "equipe">("clientes");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newState, setNewState] = useState("");
  const [newObservation, setNewObservation] = useState("");
  const [newReferencePoint, setNewReferencePoint] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!loading && isProfessional) {
      router.replace("/(tabs)/orders" as any);
    }
  }, [loading, isProfessional]);

  const canSaveClient = newName.trim().length > 2 && newContact.trim().length > 2;
  const canSaveEmployee =
    newName.trim().length > 2 &&
    newEmail.includes("@") &&
    (!editingId ? newPassword.length >= 6 : newPassword.length === 0 || newPassword.length >= 6);

  function resetForm() {
    setIsAdding(false);
    setEditingId(null);
    setNewName(""); setNewContact(""); setNewCity(""); setNewStreet(""); setNewNumber("");
    setNewNeighborhood(""); setNewState(""); setNewObservation(""); setNewReferencePoint("");
    setNewEmail(""); setNewPassword("");
  }

  function editClient(client: (typeof state.clients)[number]) {
    setSection("clientes"); setEditingId(client.id); setIsAdding(true);
    setNewName(client.name); setNewContact(client.contact); setNewCity(client.city); setNewStreet(client.street ?? "");
    setNewNumber(client.number ?? ""); setNewNeighborhood(client.neighborhood ?? ""); setNewState(client.state ?? "");
    setNewObservation(client.observation ?? ""); setNewReferencePoint(client.referencePoint ?? "");
  }

  function editEmployee(employee: (typeof state.employees)[number]) {
    setSection("equipe"); setEditingId(employee.id); setIsAdding(true);
    setNewName(employee.name); setNewContact(employee.role); setNewEmail(employee.email ?? ""); setNewPassword("");
  }

  async function handleSave() {
    setErrorMsg(null);
    try {
      setSaving(true);
      if (section === "clientes" && canSaveClient) {
        if (editingId) {
          await store.updateClient({ id: editingId, name: newName.trim(), contact: newContact.trim(), city: newCity || "Não informado", street: newStreet || undefined, number: newNumber || undefined, neighborhood: newNeighborhood || undefined, state: newState || undefined, observation: newObservation || undefined, referencePoint: newReferencePoint || undefined });
        } else {
        await store.addClient({
          name: newName,
          contact: newContact,
          city: newCity || "Não informado",
          street: newStreet || undefined,
          number: newNumber || undefined,
          neighborhood: newNeighborhood || undefined,
          state: newState || undefined,
          observation: newObservation || undefined,
          referencePoint: newReferencePoint || undefined,
        });
        }
      } else if (section === "equipe" && canSaveEmployee) {
        if (editingId) {
          const current = state.employees.find((item) => item.id === editingId);
          await store.updateEmployee({ id: editingId, name: newName.trim(), email: newEmail.trim(), role: newContact.trim() || "Técnico", initials: current?.initials ?? "", activeOrders: current?.activeOrders ?? 0, password: newPassword || undefined });
        } else await store.addEmployee({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newContact.trim() || "Técnico",
        });
        Alert.alert(
          "Profissional cadastrado",
          `Passe o ID da empresa ${state.companyId ?? ""}, o email e a senha para o profissional fazer login.`
        );
      }
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (isProfessional) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: "#09090B" }}>
        <View style={styles.loading}><Text style={{ color: "#A1A1AA" }}>Redirecionando...</Text></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: "#09090B" }}>
      {loading && <View style={styles.loading}><Text style={{ color: "#A1A1AA" }}>Carregando...</Text></View>}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(600).springify()}>
            <Text style={styles.kicker}>RELACIONAMENTO</Text>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Cadastros</Text>
                <Text style={styles.subtitle}>Clientes e equipe em um único lugar.</Text>
              </View>
              <InteractiveButton onPress={() => setIsAdding(!isAdding)} style={styles.addButton}>
                <IconSymbol name={isAdding ? "xmark" : "plus"} size={20} color="#09090B" />
              </InteractiveButton>
            </View>
            {state.companyId ? (
              <View style={{ marginTop: 16 }}>
                <CompanyIdBadge companyId={state.companyId} label="ID para o login do profissional" />
              </View>
            ) : null}
          </Animated.View>

          {!isAdding && (
            <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.segment}>
              {(["clientes", "equipe"] as const).map((item) => {
                const isActive = section === item;
                return (
                  <InteractiveButton
                    key={item}
                    onPress={() => setSection(item)}
                    style={[styles.segmentItem, isActive && styles.segmentItemActive]}
                  >
                    <IconSymbol name={item === "clientes" ? "building.2.fill" : "person.2.fill"} size={16} color={isActive ? "#09090B" : "#A1A1AA"} />
                    <Text style={[styles.segmentText, { color: isActive ? "#09090B" : "#A1A1AA" }]}>
                      {item === "clientes" ? "Clientes" : "Equipe"}
                    </Text>
                  </InteractiveButton>
                );
              })}
            </Animated.View>
          )}

          {isAdding ? (
            <Animated.View entering={FadeInRight.duration(500).springify()} style={styles.formCard}>
              <Text style={styles.formTitle}>{editingId ? "Editar" : "Adicionar"} {section === "clientes" ? "Cliente" : "Profissional"}</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput value={newName} onChangeText={setNewName} placeholder="Ex: Maria Souza" placeholderTextColor="#71717A" style={styles.input} />
              </View>

              {section === "clientes" ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Contato (Telefone/Email)</Text>
                    <TextInput value={newContact} onChangeText={setNewContact} placeholder="Ex: (11) 9999-9999" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Cidade</Text>
                    <TextInput value={newCity} onChangeText={setNewCity} placeholder="Ex: São Paulo" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Rua</Text>
                    <TextInput value={newStreet} onChangeText={setNewStreet} placeholder="Ex: Av. Paulista" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Número</Text>
                      <TextInput value={newNumber} onChangeText={setNewNumber} placeholder="Ex: 1000" placeholderTextColor="#71717A" style={styles.input} />
                    </View>
                    <View style={[styles.field, { flex: 2 }]}>
                      <Text style={styles.label}>Bairro</Text>
                      <TextInput value={newNeighborhood} onChangeText={setNewNeighborhood} placeholder="Ex: Centro" placeholderTextColor="#71717A" style={styles.input} />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Estado</Text>
                    <TextInput value={newState} onChangeText={setNewState} placeholder="Ex: SP" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Observação</Text>
                    <TextInput value={newObservation} onChangeText={setNewObservation} placeholder="Informações adicionais" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Ponto de Referência</Text>
                    <TextInput value={newReferencePoint} onChangeText={setNewReferencePoint} placeholder="Ex: Próximo ao shopping" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Cargo</Text>
                    <TextInput value={newContact} onChangeText={setNewContact} placeholder="Ex: Instalador Sênior" placeholderTextColor="#71717A" style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Email de acesso</Text>
                    <TextInput
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="profissional@email.com"
                      placeholderTextColor="#71717A"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Senha de acesso</Text>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#71717A"
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                  <Text style={styles.helper}>
                    O profissional entra em “Acesso do profissional” com o ID da empresa, este email e esta senha. Sem verificação de email.
                  </Text>
                </>
              )}

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

              <InteractiveButton
                disabled={saving || (section === "clientes" ? !canSaveClient : !canSaveEmployee)}
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  (saving || (section === "clientes" ? !canSaveClient : !canSaveEmployee)) && styles.saveButtonDisabled,
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Salvando..." : section === "clientes" ? "Salvar Cliente" : "Cadastrar Profissional"}
                </Text>
              </InteractiveButton>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(600).delay(200).springify()}>
              {section === "clientes" ? (
                <View style={styles.list}>
                  {state.clients.map((client, index) => (
                    <Animated.View key={client.id} entering={FadeInRight.duration(400).delay(index * 100).springify()}>
                      <View style={styles.card}>
                        <View style={[styles.avatar, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                          <IconSymbol name="building.2.fill" size={20} color="#D9FF3F" />
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.name}>{client.name}</Text>
                          <Text style={styles.meta}>{client.city}</Text>
                          <Text style={styles.contact}>{client.contact}</Text>
                        </View>
                        <Pressable accessibilityLabel={`Editar cliente ${client.name}`} onPress={() => editClient(client)} style={styles.editButton}>
                          <IconSymbol name="pencil" size={18} color="#09090B" />
                        </Pressable>
                      </View>
                    </Animated.View>
                  ))}
                  {state.clients.length === 0 && <EmptyState text="Nenhum cliente cadastrado." />}
                </View>
              ) : (
                <View style={styles.list}>
                  {state.employees.map((employee, index) => (
                    <Animated.View key={employee.id} entering={FadeInRight.duration(400).delay(index * 100).springify()}>
                      <View style={styles.card}>
                        <View style={[styles.avatar, { backgroundColor: "#27272A" }]}>
                          <Text style={[styles.initials, { color: "#FAFAFA" }]}>{employee.initials}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.name}>{employee.name}</Text>
                          <Text style={styles.meta}>{employee.role}</Text>
                          <Text style={styles.contactBlue}>{employee.email || "Sem email"}</Text>
                        </View>
                        <Pressable accessibilityLabel={`Editar profissional ${employee.name}`} onPress={() => editEmployee(employee)} style={styles.editButton}>
                          <IconSymbol name="pencil" size={18} color="#09090B" />
                        </Pressable>
                      </View>
                    </Animated.View>
                  ))}
                  {state.employees.length === 0 && <EmptyState text="Nenhum profissional cadastrado." />}
                </View>
              )}
            </Animated.View>
          )}

          {!isAdding && section === "equipe" && (
            <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.tip}>
              <IconSymbol name="info.circle.fill" size={20} color="#D9FF3F" />
              <Text style={styles.tipText}>
                Ao cadastrar, informe ao profissional o ID da empresa, o email e a senha para o login em campo.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ padding: 40, alignItems: "center" }}>
      <IconSymbol name="tray.fill" size={40} color="#27272A" />
      <Text style={{ marginTop: 12, color: "#71717A", fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 60, paddingHorizontal: 24, gap: 24, maxWidth: 800, alignSelf: "center", width: "100%" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 2, color: "#D9FF3F" },
  title: { fontSize: 32, lineHeight: 36, fontWeight: "900", color: "#FAFAFA", letterSpacing: -1 },
  subtitle: { fontSize: 15, marginTop: 6, color: "#A1A1AA", fontWeight: "500" },
  addButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center" },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 6, backgroundColor: "#18181B", borderColor: "#27272A" },
  segmentItem: { flex: 1, borderRadius: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  segmentItemActive: { backgroundColor: "#FAFAFA" },
  segmentText: { fontSize: 13, fontWeight: "900" },
  list: { gap: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#18181B", borderColor: "#27272A" },
  editButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center" },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 15, fontWeight: "900" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "900", color: "#FAFAFA", marginBottom: 2 },
  meta: { fontSize: 13, color: "#71717A", fontWeight: "600" },
  contact: { fontSize: 13, fontWeight: "800", color: "#D9FF3F", marginTop: 4 },
  contactBlue: { fontSize: 13, fontWeight: "800", color: "#D9FF3F", marginTop: 4 },
  tip: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "rgba(6, 182, 212, 0.1)", borderColor: "rgba(6, 182, 212, 0.2)" },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18, color: "#FAFAFA", fontWeight: "600" },
  formCard: { borderRadius: 20, padding: 24, backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A", gap: 16 },
  formTitle: { fontSize: 20, fontWeight: "900", color: "#FAFAFA", marginBottom: 8 },
  field: { gap: 8 },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, fontWeight: "800", color: "#FAFAFA" },
  input: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: "#FAFAFA", backgroundColor: "#09090B", borderColor: "#27272A" },
  helper: { fontSize: 12, color: "#71717A", lineHeight: 18, fontWeight: "600" },
  error: { color: "#F87171", fontSize: 13, fontWeight: "700" },
  saveButton: { minHeight: 56, borderRadius: 14, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveButtonDisabled: { backgroundColor: "#27272A" },
  saveButtonText: { color: "#09090B", fontSize: 15, fontWeight: "900" },
  loading: { paddingVertical: 20, alignItems: "center" },
});
