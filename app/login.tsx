import { Stack, useRouter } from "expo-router";
import { useState, useEffect } from "react";
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
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GestorLogo } from "@/components/gestor-logo";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { store } from "@/lib/app-store";
import * as SupabaseService from "@/lib/supabase-service";
import { sendEmailVerification, verifyEmailCode } from "@/lib/email-verification";
import { onlyDigits } from "@/lib/validation";

type Tab = "login" | "cadastro";

// ─── Botão animado ────────────────────────────────────────────────────────────
function AnimatedButton({
  onPress,
  disabled,
  loading: btnLoading,
  label,
  style,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  style?: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || btnLoading}
        onPressIn={() => (scale.value = withSpring(0.96, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
        style={[styles.button, style, (disabled || btnLoading) && styles.buttonDisabled]}
      >
        {btnLoading ? (
          <ActivityIndicator color="#09090B" size="small" />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Campo de texto ───────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  errorText,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  errorText?: string;
}) {
  const [visible, setVisible] = useState(false);
  const borderOpacity = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(6, 182, 212, ${borderOpacity.value})`,
  }));

  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View
        style={[
          styles.inputWrapper,
          borderStyle,
          errorText ? styles.inputWrapperError : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#52525B"
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
          onFocus={() => { borderOpacity.value = withTiming(1, { duration: 200 }); }}
          onBlur={() => { borderOpacity.value = withTiming(0, { duration: 200 }); }}
          style={[styles.input, Platform.OS === "web" ? ({ outlineStyle: "none", outlineWidth: 0 } as any) : null]}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setVisible((v) => !v)} style={styles.eyeButton}>
            <IconSymbol
              name={visible ? "eye.slash.fill" : "eye.fill"}
              size={18}
              color="#52525B"
            />
          </Pressable>
        )}
      </Animated.View>
      {errorText ? <Text style={styles.fieldError}>{errorText}</Text> : null}
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { user, loading, loginWithEmail, register, refresh } = useSupabaseAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("login");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Cadastro
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);

  // Tab indicator
  const tabIndicatorStyle = useAnimatedStyle(() => ({
    left: withTiming(tab === "login" ? "0%" : "50%", {
      duration: 250,
      easing: Easing.out(Easing.quad),
    }),
  }));

  // Redireciona ao autenticar
  const [checkingCompany, setCheckingCompany] = useState(false);
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    setCheckingCompany(true);
    async function check() {
      if (!user) return;
      try {
        const company = await SupabaseService.getCompanyByUserId(user.id);
        if (cancelled) return;
        if (company) {
          await store.bootstrap();
          router.replace("/(tabs)" as any);
          return;
        }
        const employee = await SupabaseService.getEmployeeByUserId(user.id);
        if (cancelled) return;
        if (employee) {
          await store.bootstrap();
          router.replace("/(tabs)" as any);
          return;
        }
        router.replace("/choose-profile" as any);
      } catch {
        if (!cancelled) router.replace("/choose-profile" as any);
      } finally {
        if (!cancelled) setCheckingCompany(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [user, loading, router]);

  if (loading || (user && checkingCompany)) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#D9FF3F" />
        <Text style={styles.loadingText}>Verificando sessão...</Text>
      </View>
    );
  }

  // ── Validações ────────────────────────────────────────────────────────────
  const loginValid = loginEmail.includes("@") && loginPassword.length >= 6;
  const regPasswordsMatch = regPassword === regConfirm;
  const regValid =
    regName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(regEmail.trim()) &&
    regPassword.length >= 6 &&
    regPasswordsMatch &&
    emailVerified;

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!loginValid) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithEmail(loginEmail.trim(), loginPassword);
      await refresh();
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("Invalid login credentials")) {
        setErrorMsg("Email ou senha incorretos.");
      } else {
        setErrorMsg(msg || "Erro ao entrar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    if (!regValid) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await register(regName.trim(), regEmail.trim(), regPassword);
      await refresh();
      router.replace("/register-company" as any);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("already registered") || msg.includes("User already registered")) {
        setEmailVerified(false);
        setEmailCodeSent(false);
        setEmailCode("");
        setErrorMsg("Este email já está cadastrado. Tente fazer login.");
      } else if (msg.includes("Password should be at least")) {
        setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      } else {
        setErrorMsg(msg || "Erro ao cadastrar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendEmailCode() {
    if (!/^\S+@\S+\.\S+$/.test(regEmail.trim())) {
      setErrorMsg("Informe um email válido.");
      return;
    }
    setErrorMsg(null);
    setEmailVerificationLoading(true);
    try {
      await sendEmailVerification(regEmail.trim());
      setEmailCodeSent(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Não foi possível enviar o código.");
    } finally {
      setEmailVerificationLoading(false);
    }
  }

  function handleRegistrationEmailChange(value: string) {
    setRegEmail(value);
    setEmailVerified(false);
    setEmailCodeSent(false);
    setEmailCode("");
  }

  async function handleVerifyEmailCode() {
    if (emailCode.length !== 6) {
      setErrorMsg("Código deve ter 6 dígitos.");
      return;
    }
    setErrorMsg(null);
    setEmailVerificationLoading(true);
    try {
      await verifyEmailCode(regEmail.trim(), emailCode);
      setEmailVerified(true);
      setEmailCodeSent(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setEmailVerificationLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Marca */}
          <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.brand}>
            <GestorLogo subtitle />
          </Animated.View>

          {/* Card */}
          <Animated.View entering={FadeInUp.duration(700).delay(100).springify()} style={styles.card}>

            {/* Tab switcher */}
            <View style={styles.tabBar}>
              <View style={styles.tabIndicatorTrack}>
                <Animated.View style={[styles.tabIndicatorThumb, tabIndicatorStyle, tab === "cadastro" && styles.registerAccent]} />
              </View>
              <Pressable
                style={styles.tabItem}
                onPress={() => { setTab("login"); setErrorMsg(null); }}
              >
                <Text style={[styles.tabLabel, tab === "login" && styles.tabLabelActive]}>
                  Entrar
                </Text>
              </Pressable>
              <Pressable
                style={styles.tabItem}
                onPress={() => { setTab("cadastro"); setErrorMsg(null); }}
              >
                <Text style={[styles.tabLabel, tab === "cadastro" && styles.tabLabelActive]}>
                  Cadastrar
                </Text>
              </Pressable>
            </View>

            {/* Login */}
            {tab === "login" && (
              <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.form}>
                <Field
                  label="Email"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                />
                <Field
                  label="Senha"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                />
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#F87171" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}
                <AnimatedButton
                  onPress={handleLogin}
                  disabled={!loginValid}
                  loading={submitting}
                  label="Entrar"
                  style={styles.primaryButton}
                />
                <Pressable onPress={() => router.push("/")} style={styles.backButtonBottom}>
                  <IconSymbol name="arrow.left" size={14} color="#D9FF3F" />
                  <Text style={styles.backButtonTextBottom}>Voltar para a página inicial</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Cadastro (apenas gestor) */}
            {tab === "cadastro" && (
              <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.form}>
                <Text style={styles.gestorHint}>
                  Cadastro exclusivo do gestor. Profissionais entram em “Acesso do profissional”.
                </Text>
                <Field
                  label="Nome completo"
                  value={regName}
                  onChangeText={setRegName}
                  placeholder="João da Silva"
                  autoCapitalize="words"
                />
                <Field
                  label="Email"
                  value={regEmail}
                  onChangeText={handleRegistrationEmailChange}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                />
                <Pressable
                  disabled={emailVerificationLoading || !/^\S+@\S+\.\S+$/.test(regEmail.trim())}
                  onPress={handleSendEmailCode}
                  style={{ padding: 12, backgroundColor: emailVerified ? "rgba(34, 197, 94, 0.1)" : "rgba(217, 255, 63, 0.1)", borderRadius: 12, borderWidth: 1, borderColor: emailVerified ? "#22C55E" : "#D9FF3F" }}
                >
                  <Text style={{ textAlign: "center", color: emailVerified ? "#22C55E" : "#D9FF3F", fontWeight: "700", fontSize: 12 }}>
                    {emailVerified ? "✓ Email confirmado" : emailVerificationLoading ? "Enviando código..." : "Enviar código por email"}
                  </Text>
                </Pressable>
                {emailCodeSent && !emailVerified && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput value={emailCode} onChangeText={(value) => setEmailCode(onlyDigits(value, 6))} placeholder="000000" placeholderTextColor="#52525B" keyboardType="numeric" maxLength={6} style={{ flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12, color: "#FAFAFA", borderColor: "#27272A", borderWidth: 1, backgroundColor: "#09090B", fontSize: 14 }} />
                    <Pressable onPress={handleVerifyEmailCode} style={{ paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#D9FF3F", justifyContent: "center", opacity: emailCode.length === 6 ? 1 : 0.5 }}>
                      <Text style={{ color: "#09090B", fontWeight: "800", fontSize: 12 }}>OK</Text>
                    </Pressable>
                  </View>
                )}
                {emailVerified && (
                  <>
                    <Field
                      label="Senha"
                      value={regPassword}
                      onChangeText={setRegPassword}
                      placeholder="Mínimo 6 caracteres"
                      secureTextEntry
                    />
                    <Field
                      label="Confirmar senha"
                      value={regConfirm}
                      onChangeText={setRegConfirm}
                      placeholder="Repita a senha"
                      secureTextEntry
                      errorText={
                        regConfirm.length > 0 && !regPasswordsMatch
                          ? "As senhas não coincidem"
                          : undefined
                      }
                    />
                  </>
                )}
                {!emailVerified && (
                  <Text style={{ textAlign: "center", color: "#71717A", fontSize: 12, fontWeight: "600" }}>Confirme seu email para continuar</Text>
                )}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#F87171" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}
                <AnimatedButton
                  onPress={handleRegister}
                  disabled={!regValid}
                  loading={submitting}
                  label="Criar conta de gestor"
                  style={[styles.primaryButton, styles.registerPrimaryButton]}
                />
              </Animated.View>
            )}
          </Animated.View>

          <Pressable onPress={() => router.push("/login-profissional" as any)}>
            <Text style={styles.professionalLink}>Sou profissional — entrar com ID da empresa</Text>
          </Pressable>

          <Text style={styles.terms}>
            Ao entrar, você concorda com os{" "}
            <Text style={{ color: "#D9FF3F" }}>Termos de Uso</Text>
            {" "}e a{" "}
            <Text style={{ color: "#D9FF3F" }}>Política de Privacidade</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#09090B" },
  loadingScreen: { flex: 1, backgroundColor: "#09090B", alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: "#71717A", fontSize: 14, fontWeight: "600" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 60, gap: 32 },
  // Marca
  brand: { alignItems: "center", gap: 12 },
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
  appName: { fontSize: 32, fontWeight: "900", letterSpacing: -1, color: "#FAFAFA" },
  appTagline: { fontSize: 14, fontWeight: "500", color: "#71717A", letterSpacing: 0.3 },
  // Card
  card: { width: "100%", maxWidth: 420, borderRadius: 24, backgroundColor: "#18181B", borderWidth: 1, borderColor: "#27272A", overflow: "hidden" },
  // Tabs
  tabBar: { flexDirection: "row", position: "relative", borderBottomWidth: 1, borderBottomColor: "#27272A", backgroundColor: "#09090B" },
  tabIndicatorTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2 },
  tabIndicatorThumb: { position: "absolute", bottom: 0, width: "50%", height: 2, backgroundColor: "#D9FF3F", borderRadius: 2 },
  registerAccent: { backgroundColor: "#D9FF3F" },
  tabItem: { flex: 1, paddingVertical: 18, alignItems: "center" },
  tabLabel: { fontSize: 14, fontWeight: "700", color: "#52525B" },
  tabLabelActive: { color: "#FAFAFA", fontWeight: "900" },
  // Form
  form: { padding: 28, gap: 20 },
  gestorHint: { fontSize: 12, fontWeight: "600", color: "#71717A", lineHeight: 18 },
  // Field
  fieldWrapper: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "800", color: "#A1A1AA", letterSpacing: 0.3 },
  inputWrapper: { flexDirection: "row", alignItems: "center", height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: "#27272A", backgroundColor: "#09090B", paddingHorizontal: 16 },
  inputWrapperError: { borderColor: "rgba(248, 113, 113, 0.6)" },
  input: { flex: 1, fontSize: 15, color: "#FAFAFA", fontWeight: "500" },
  eyeButton: { padding: 4 },
  fieldError: { fontSize: 12, fontWeight: "700", color: "#F87171", marginTop: 2 },
  // Botão
  button: { minHeight: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 15, fontWeight: "900", color: "#09090B" },
  primaryButton: { backgroundColor: "#D9FF3F" },
  registerPrimaryButton: { backgroundColor: "#D9FF3F" },
  // Erro
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(248, 113, 113, 0.08)", borderWidth: 1, borderColor: "rgba(248, 113, 113, 0.2)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  errorText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#F87171", lineHeight: 18 },
  // Termos
  terms: { fontSize: 12, textAlign: "center", color: "#52525B", maxWidth: 320, lineHeight: 18 },
  professionalLink: { fontSize: 13, fontWeight: "800", color: "#D9FF3F", textAlign: "center" },
  backButtonBottom: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  backButtonTextBottom: { fontSize: 13, fontWeight: "600", color: "#D9FF3F" },
});
