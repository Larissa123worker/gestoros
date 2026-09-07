import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GestorLogo } from "@/components/gestor-logo";
import { isValidCompanyId, normalizeCompanyId } from "@/lib/company-id-generator";
import { store } from "@/lib/app-store";
import { getProfessionalSession } from "@/lib/professional-session";

export default function LoginProfissionalScreen() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const normalizedId = normalizeCompanyId(companyId);
  const canSubmit =
    isValidCompanyId(normalizedId) && email.includes("@") && password.length >= 6;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getProfessionalSession();
      if (!cancelled && session) {
        await store.bootstrap();
        router.replace("/(tabs)" as any);
        return;
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogin() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await store.loginProfessional({
        companyId: normalizedId,
        email: email.trim(),
        password,
      });
      router.replace("/(tabs)" as any);
    } catch (err: any) {
      setErrorMsg(err?.message || "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#D9FF3F" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.brand}>
            <GestorLogo subtitle />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(700).delay(80).springify()} style={styles.card}>
            <View style={styles.form}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>ID da empresa</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={companyId}
                    onChangeText={(text) => setCompanyId(normalizeCompanyId(text))}
                    placeholder="AB-12345"
                    placeholderTextColor="#52525B"
                    autoCapitalize="characters"
                    maxLength={8}
                    style={[styles.input, { letterSpacing: 2, fontWeight: "800" }]}
                  />
                </View>
                {companyId.length > 0 && !isValidCompanyId(normalizedId) ? (
                  <Text style={styles.fieldError}>Formato inválido. Use XX-XXXXX.</Text>
                ) : null}
              </View>

              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seu@email.com"
                    placeholderTextColor="#52525B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Senha</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Senha definida pelo gestor"
                    placeholderTextColor="#52525B"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                    <IconSymbol
                      name={showPassword ? "eye.slash.fill" : "eye.fill"}
                      size={18}
                      color="#52525B"
                    />
                  </Pressable>
                </View>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#F87171" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

                <Pressable
                  disabled={!canSubmit || submitting}
                  onPress={handleLogin}
                  style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#09090B" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => router.push("/")} style={styles.backButtonBottom}>
                  <IconSymbol name="arrow.left" size={14} color="#D9FF3F" />
                  <Text style={styles.backButtonTextBottom}>Voltar para a página inicial</Text>
                </Pressable>
            </View>
          </Animated.View>

          <Pressable onPress={() => router.replace("/login" as any)}>
            <Text style={styles.switchLink}>Sou gestor — ir para login da empresa</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#09090B" },
  loadingScreen: { flex: 1, backgroundColor: "#09090B", alignItems: "center", justifyContent: "center" },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
    gap: 28,
  },
  brand: { alignItems: "center", gap: 12, maxWidth: 360 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#D9FF3F",
    borderWidth: 2,
    borderColor: "rgba(217, 255, 63, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D9FF3F",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  appName: { fontSize: 26, fontWeight: "900", letterSpacing: -0.8, color: "#FAFAFA", textAlign: "center" },
  appTagline: { fontSize: 14, fontWeight: "500", color: "#71717A", textAlign: "center", lineHeight: 20 },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
    overflow: "hidden",
  },
  form: { padding: 28, gap: 18 },
  fieldWrapper: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "800", color: "#A1A1AA", letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#27272A",
    backgroundColor: "#09090B",
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, color: "#FAFAFA", fontWeight: "500" },
  eyeButton: { padding: 4 },
  fieldError: { fontSize: 12, fontWeight: "700", color: "#F87171" },
  button: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D9FF3F",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 15, fontWeight: "900", color: "#09090B" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#F87171", lineHeight: 18 },
  switchLink: { fontSize: 13, fontWeight: "700", color: "#71717A", textAlign: "center" },
  backButtonBottom: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  backButtonTextBottom: { fontSize: 13, fontWeight: "600", color: "#D9FF3F" },
});
