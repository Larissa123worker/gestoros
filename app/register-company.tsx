import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { CompanyIdBadge } from "@/components/company-id-badge";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useColors } from "@/hooks/use-colors";
import { ensureUniqueCompanyId } from "@/lib/company-id-generator";
import { store } from "@/lib/app-store";
import * as SupabaseService from "@/lib/supabase-service";
import { isValidCep, isValidCpfCnpj, isValidPhone, lookupCep, onlyDigits } from "@/lib/validation";

export default function RegisterCompanyScreen() {
  const colors = useColors();
  const { user, loading, logout } = useSupabaseAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ company?: string }>();
  const { width } = useWindowDimensions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");

  const [name, setName] = useState(() => params.company ?? "");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const canSave = name.trim().length >= 2;

  const handleLogout = async () => {
    try {
      setSaving(true);
      await logout();
      router.replace("/login" as any);
    } catch {
      setError("Erro ao sair da conta");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || !user) return;
    try {
      setSaving(true);
      setError(null);

      const companyName = name.trim();
      if (!isValidCpfCnpj(document)) {
        setError("CPF/CNPJ inválido. Informe um documento válido.");
        return;
      }
      if (!isValidPhone(phone)) {
        setError("Celular/telefone inválido. Use apenas 10 ou 11 números.");
        return;
      }
      if (!isValidCep(postalCode)) {
        setError("CEP inválido. Informe 8 números.");
        return;
      }

      // 1. Garante que o perfil do usuário exista na tabela "users" ANTES de criar a empresa (evita erro de FK 409)
      await SupabaseService.ensureProfile(user.id, user.email ?? null, "company");

      // 2. Verifica se já existe empresa para este usuário
      const existingCompany = await SupabaseService.getCompanyByUserId(user.id);
      const id = existingCompany?.id ?? (await ensureUniqueCompanyId());

      await SupabaseService.createCompany({
        id,
        userId: user.id,
        name: companyName,
        document: document.trim() || undefined,
        phone: onlyDigits(phone) || undefined,
        postalCode: onlyDigits(postalCode) || undefined,
        city: city.trim() || undefined,
        state: stateUf.trim() || undefined,
        address: address.trim() || undefined,
        addressNumber: onlyDigits(addressNumber) || undefined,
        addressComplement: addressComplement.trim() || undefined,
      });

      // 3. Atualiza o papel na tabela "users" como "company"
      await SupabaseService.ensureProfile(user.id, user.email ?? null, "company");

      store.setCompanyContext(id, companyName, "empresa");
      await store.bootstrap();
      setCreatedName(companyName);
      setCreatedId(id);
    } catch (err: any) {
      console.error("Erro no cadastro da empresa:", err);
      const rawMsg = err?.message ?? err?.details ?? (typeof err === "string" ? err : "");
      
      const isDuplicate = 
        rawMsg.toLowerCase().includes("duplicate") || 
        rawMsg.toLowerCase().includes("conflict") || 
        String(err?.code ?? "").includes("23505") ||
        String(err?.status ?? "").includes("409");

      if (isDuplicate) {
        setError("Você já possui uma empresa cadastrada. Recarregue a tela para editar os dados.");
        return;
      }
      setError(rawMsg || "Erro ao cadastrar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleCepBlur = async () => {
    if (!isValidCep(postalCode)) return;
    try {
      setCepLoading(true);
      setError(null);
      const result = await lookupCep(postalCode);
      if (!result) return;
      setAddress(result.logradouro ?? "");
      setCity(result.localidade ?? "");
      setStateUf(result.uf ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  if (createdId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={[styles.successLayout, { borderColor: colors.border }, width < 760 && styles.layoutMobile]}>
            <ImageBackground
              source={require("@/assets/images/pexels-gustavo-fring-6699404-card.jpeg")}
              style={[styles.intro, width < 760 ? styles.introMobile : styles.introDesktop]}
              imageStyle={[styles.introImage, width >= 760 && styles.introImageDesktop]}
              resizeMode="cover"
            >
              <View style={styles.introOverlay} />
              <View style={[styles.introContent, width < 760 ? styles.introContentMobile : styles.introContentDesktop]}>
                <Text style={styles.introEyebrow}>TUDO PRONTO</Text>
                <Text style={styles.introTitle}>A operação já pode começar.</Text>
                <Text style={styles.introText}>Sua empresa foi criada. Agora compartilhe o código com os profissionais da equipe.</Text>
              </View>
            </ImageBackground>

            <View style={[styles.successPanel, width < 760 && styles.formPanelMobile]}>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, letterSpacing: -0.5 }}>Empresa cadastrada</Text>
                <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>{createdName} já está pronta para operar.</Text>
              </View>
              <CompanyIdBadge companyId={createdId} />
              <Pressable onPress={() => router.replace("/(tabs)")} style={{ minHeight: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>Ir para o painel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.scroll, width < 760 && styles.scrollMobile]} keyboardShouldPersistTaps="handled">
        <View style={[styles.layout, { borderColor: colors.border }, width < 760 && styles.layoutMobile]}>
          <ImageBackground
            source={require("@/assets/images/pexels-gustavo-fring-6699404-card.jpeg")}
            style={[styles.intro, width < 760 ? styles.introMobile : styles.introDesktop]}
            imageStyle={[styles.introImage, width >= 760 && styles.introImageDesktop]}
            resizeMode="cover"
          >
            <View style={styles.introOverlay} />
            <View style={[styles.introContent, width < 760 ? styles.introContentMobile : styles.introContentDesktop]}>
              <Text style={styles.introEyebrow}>PAINEL DE CONTROLE</Text>
              <Text style={styles.introTitle}>Acompanhe e escale sua equipe.</Text>
              <Text style={styles.introText}>Toda a operação em tempo real. Identifique gargalos e otimize o atendimento.</Text>
              <Pressable onPress={() => {}} style={styles.introButton}>
                <Text style={styles.introButtonText}>Começar cadastro</Text>
              </Pressable>
            </View>
          </ImageBackground>

          <View style={[styles.formPanel, width < 760 && styles.formPanelMobile]}>
            <View style={styles.heading}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground, letterSpacing: -0.5 }}>Cadastrar empresa</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 }}>
                Preencha os dados básicos para criar seu espaço de trabalho.
              </Text>
            </View>

        <View style={{ gap: 14 }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>Nome da empresa</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Horizonte Serviços"
              placeholderTextColor={colors.muted}
              style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>CPF / CNPJ</Text>
            <TextInput
              value={document}
              onChangeText={(value) => setDocument(onlyDigits(value, 14))}
              keyboardType="numeric"
              maxLength={14}
              placeholder="CPF ou CNPJ (somente números)"
              placeholderTextColor={colors.muted}
              style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>Telefone</Text>
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(onlyDigits(value, 11))}
              keyboardType="numeric"
              maxLength={11}
              placeholder="(00) 00000-0000"
              placeholderTextColor={colors.muted}
              style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>CEP</Text>
            <TextInput
              value={postalCode}
              onChangeText={(value) => setPostalCode(onlyDigits(value, 8))}
              onBlur={handleCepBlur}
              placeholder={cepLoading ? "Consultando..." : "00000000"}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              maxLength={8}
              style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>Cidade</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="São Paulo"
                placeholderTextColor={colors.muted}
                style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }}
              />
            </View>
            <View style={{ width: 80 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>UF</Text>
              <TextInput
                value={stateUf}
                onChangeText={setStateUf}
                placeholder="SP"
                placeholderTextColor={colors.muted}
                maxLength={2}
                style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border, textTransform: "uppercase" }}
              />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>Endereço</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Rua, número, complemento"
              placeholderTextColor={colors.muted}
              style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 120 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>Número</Text>
              <TextInput value={addressNumber} onChangeText={(value) => setAddressNumber(onlyDigits(value, 8))} placeholder="123" placeholderTextColor={colors.muted} keyboardType="numeric" maxLength={8} style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.foreground, marginBottom: 8 }}>Complemento</Text>
              <TextInput value={addressComplement} onChangeText={setAddressComplement} placeholder="Apto, bloco..." placeholderTextColor={colors.muted} style={{ height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }} />
            </View>
          </View>
        </View>

        {error && <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "700" }}>{error}</Text>}

        <Pressable
          disabled={!canSave || saving}
          onPress={handleSave}
          style={{ minHeight: 56, borderRadius: 14, backgroundColor: canSave ? colors.primary : colors.border, alignItems: "center", justifyContent: "center", marginTop: 8, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>Cadastrar empresa</Text>
          )}
        </Pressable>

        <Pressable
          id="register-logout-btn"
          accessibilityLabel="Sair da conta"
          onPress={handleLogout}
          style={{ 
            minHeight: 56, 
            borderRadius: 14, 
            borderWidth: 1.5, 
            borderColor: "rgba(248, 113, 113, 0.2)", 
            backgroundColor: "rgba(248, 113, 113, 0.05)", 
            alignItems: "center", 
            justifyContent: "center", 
            marginTop: 12 
          }}
        >
          <Text style={{ color: "#F87171", fontSize: 15, fontWeight: "800" }}>Sair da conta</Text>
        </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
  scrollMobile: { justifyContent: "flex-start", padding: 16, paddingBottom: 48 },
  successScroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
  layout: { width: "100%", maxWidth: 1080, alignSelf: "center", flexDirection: "row", borderWidth: 1, borderRadius: 24, overflow: "hidden" },
  successLayout: { width: "100%", maxWidth: 900, alignSelf: "center", flexDirection: "row", borderWidth: 1, borderRadius: 24, overflow: "hidden" },
  layoutMobile: { width: "100%", flexDirection: "column", overflow: "visible" },
  intro: {
    flex: 0.8,
    alignSelf: "stretch",
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  introImage: {
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  introDesktop: { minHeight: "100%" },
  introImageDesktop: { width: "100%", height: "100%" },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 11, 15, 0.7)",
  },
  introContent: {
    flex: 1,
    position: "relative",
    zIndex: 1,
    padding: 36,
    justifyContent: "flex-end",
  },
  introMobile: { flex: 0, minHeight: 320, height: 320, padding: 0, justifyContent: "flex-start" },
  introContentMobile: { flex: 1, padding: 20, justifyContent: "flex-start" },
  introContentDesktop: { justifyContent: "flex-end" },
  introEyebrow: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 18,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  introTitle: { color: "#FFFFFF", fontSize: 36, lineHeight: 42, fontWeight: "900", letterSpacing: -1, maxWidth: 360 },
  introText: { color: "rgba(255,255,255,0.86)", fontSize: 15, lineHeight: 23, marginTop: 16, maxWidth: 360 },
  introButton: {
    marginTop: 24,
    alignSelf: "flex-start",
    backgroundColor: "#D9FF3F",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  introButtonText: { color: "#09090B", fontSize: 16, fontWeight: "900" },
  successIntro: { flex: 0.8, minHeight: 430, padding: 36, justifyContent: "flex-end" },
  successIntroTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 38, fontWeight: "900", letterSpacing: -0.8 },
  successPanel: { flex: 1.2, padding: 36, gap: 28, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  formPanel: { flex: 1.2, padding: 36, backgroundColor: "rgba(255,255,255,0.02)" },
  formPanelMobile: { width: "100%", flex: 0, padding: 20 },
  heading: { marginBottom: 24 },
});
