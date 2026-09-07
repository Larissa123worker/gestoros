import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GestorLogo } from "@/components/gestor-logo";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { sendEmailVerification, verifyEmailCode } from "@/lib/email-verification";

const lime = "#C8FF00";
const dark = "#0A0A0A";
const darkCard = "#121212";
const borderSubtle = "#222222";
const grayText = "#A0A0A0";
const lightGrayText = "#E0E0E0";

// High-quality field service & technical maintenance images
const heroPhoto = require("../assets/images/pexels-gustavo-fring-6699404.jpeg");
const problemPhoto = require("../assets/images/homerenovationinnyc-african-american-8849993_1920.jpg");
const appPhoto = require("../assets/images/pexels-gustavo-fring-6699404.jpeg");
const signupPhoto = require("../assets/images/pexels-gustavo-fring-6699404.jpeg");
const faqPhoto = require("../assets/images/pexels-gustavo-fring-6699404.jpeg");
const abstractGridPattern = require("../assets/images/pexels-gustavo-fring-6699404.jpeg");

function ThreeField() {
  const host = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== "web" || !host.current) return;
    let cleanup = () => { };
    void import("three")
      .then(
        ({
          Scene,
          PerspectiveCamera,
          WebGLRenderer,
          BufferGeometry,
          Float32BufferAttribute,
          PointsMaterial,
          Points,
        }) => {
          const element = host.current as unknown as HTMLElement;
          const canvas = document.createElement("canvas");
          canvas.setAttribute("aria-hidden", "true");
          // Transparent canvas so the background photo bleeds through
          canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:transparent;pointer-events:none;";
          element.appendChild(canvas);
          const scene = new Scene();
          scene.background = null; // transparent — photo shows through
          const camera = new PerspectiveCamera(
            55,
            element.clientWidth / Math.max(element.clientHeight, 1),
            0.1,
            100,
          );
          camera.position.z = 6;
          const renderer = new WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          renderer.setSize(element.clientWidth, element.clientHeight, false);
          const geometry = new BufferGeometry();
          const points: number[] = [];
          for (let index = 0; index < 420; index += 1) {
            const angle = (index / 420) * Math.PI * 2;
            const radius = 1.1 + (index % 7) * 0.22;
            points.push(
              Math.cos(angle) * radius,
              ((index % 9) - 4) * 0.13,
              Math.sin(angle) * radius,
            );
          }
          geometry.setAttribute(
            "position",
            new Float32BufferAttribute(points, 3),
          );
          const cloud = new Points(
            geometry,
            new PointsMaterial({
              color: lime,
              size: 0.025,
              transparent: true,
              opacity: 0.8,
            }),
          );
          scene.add(cloud);
          let frame = 0;
          let animationId = 0;

          let mouseX = 0;
          let mouseY = 0;
          const onMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX - window.innerWidth / 2) / 1200;
            mouseY = (event.clientY - window.innerHeight / 2) / 1200;
          };
          window.addEventListener("mousemove", onMouseMove);

          const animate = () => {
            cloud.rotation.y += 0.0015 + (mouseX - cloud.rotation.y) * 0.05;
            cloud.rotation.x = Math.sin(frame / 220) * 0.08 + (mouseY - cloud.rotation.x) * 0.05;
            renderer.render(scene, camera);
            frame += 1;
            animationId = requestAnimationFrame(animate);
          };
          animate();
          cleanup = () => {
            cancelAnimationFrame(animationId);
            geometry.dispose();
            renderer.dispose();
            canvas.remove();
            window.removeEventListener("mousemove", onMouseMove);
          };
        },
      )
      .catch(() => { });
    return () => cleanup();
  }, []);
  return <View ref={host} style={styles.threeField} />;
}

function CheckLine({ children }: { children: string }) {
  return (
    <View style={styles.checkLine}>
      <View style={styles.check}>
        <IconSymbol name="checkmark" size={14} color={dark} />
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </View>
  );
}

function ProductPreview({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={[styles.previewContainer, { minWidth: isMobile ? "100%" : 450 }]}>
      <View style={styles.previewShell}>
        <View style={styles.previewTop}>
          <View style={styles.windowControls}>
            <View style={[styles.controlDot, { backgroundColor: "#FF5F56" }]} />
            <View style={[styles.controlDot, { backgroundColor: "#FFBD2E" }]} />
            <View style={[styles.controlDot, { backgroundColor: "#27C93F" }]} />
          </View>
          <Text style={styles.previewTitle}>GESTOR OS / PAINEL</Text>
        </View>
        <View style={styles.previewBody}>
          {!isMobile && (
            <View style={styles.previewSide}>
              <Text style={styles.sideBrand}>GESTOR OS</Text>
              {["Visão geral", "Ordens", "Clientes", "Equipe"].map(
                (item, index) => (
                  <Text
                    key={item}
                    style={[styles.sideItem, index === 0 && styles.sideItemActive]}
                  >
                    {item}
                  </Text>
                ),
              )}
            </View>
          )}
          <View style={[styles.previewMain, { padding: isMobile ? 16 : 24 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.previewKicker}>VISÃO GERAL</Text>
              <Text style={{ color: lime, fontSize: 10, fontWeight: "800" }}>+ 12% este mês</Text>
            </View>

            <View style={styles.previewMetrics}>
              <View style={styles.previewMetric}>
                <Text style={styles.metricNumber}>248</Text>
                <Text style={styles.metricLabel}>Ordens Ativas</Text>
              </View>
              <View style={styles.previewMetric}>
                <Text style={styles.metricNumber}>73</Text>
                <Text style={styles.metricLabel}>Técnicos Hoje</Text>
              </View>
              <View style={styles.previewMetric}>
                <Text style={styles.metricNumber}>4.9</Text>
                <Text style={styles.metricLabel}>Avaliação</Text>
              </View>
            </View>

            {/* Weekly Frequency Chart - Kito Trainner style */}
            <Text style={[styles.previewKicker, { marginTop: 20, marginBottom: 10 }]}>FREQUÊNCIA SEMANAL</Text>
            <View style={{ gap: 8 }}>
              {[
                { day: "Seg", val: 82 },
                { day: "Ter", val: 87 },
                { day: "Qua", val: 95 },
                { day: "Qui", val: 74 },
                { day: "Sex", val: 88 },
              ].map((d) => (
                <View key={d.day} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ color: grayText, fontSize: 10, width: 26, fontWeight: "700" }}>{d.day}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: "#1A1A1A", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ width: `${d.val}%`, height: "100%", backgroundColor: lime }} />
                  </View>
                  <Text style={{ color: "#FFFFFF", fontSize: 10, width: 26, textAlign: "right", fontWeight: "700" }}>{d.val}%</Text>
                </View>
              ))}
            </View>

            {/* Recent Technicians */}
            <Text style={[styles.previewKicker, { marginTop: 20, marginBottom: 10 }]}>TÉCNICOS RECENTES</Text>
            <View style={{ gap: 8 }}>
              {[
                { name: "Lucas Ferreira", status: "Ativo", color: lime },
                { name: "Carla Souza", status: "Em Campo", color: lime },
                { name: "Rafael Costa", status: "Concluído", color: "#A0A0A0" },
              ].map((t, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "800" }}>{t.name[0]}</Text>
                    </View>
                    <Text style={{ color: lightGrayText, fontSize: 11, fontWeight: "700" }}>{t.name}</Text>
                  </View>
                  <Text style={{ color: t.color, fontSize: 10, fontWeight: "800" }}>{t.status}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View style={styles.dashboardBadge}>
        <IconSymbol name="star.fill" size={11} color="#FFD700" />
        <Text style={styles.dashboardBadgeText}>4.9/5.0 AVALIAÇÃO</Text>
      </View>
      <View style={styles.dashboardBadgeBottom}>
        <View style={styles.badgeIconBg}>
          <IconSymbol name="arrow.up.right" size={11} color={lime} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.badgeBottomSub}>Produtividade da equipe</Text>
          <Text style={styles.badgeBottomTitle}>+38% em 90 dias</Text>
        </View>
      </View>
    </View>
  );
}

function MobileAppPreview({ isMobile }: { isMobile: boolean }) {
  return (
    <View style={styles.mobilePreviewShell}>
      <View style={styles.mobilePreviewScreen}>
        <View style={styles.mobileSpeaker} />
        <View style={styles.mobileStatusBar}>
          <Text style={styles.mobileStatusTime}>14:32</Text>
          <View style={styles.mobileStatusIcons}>
            <IconSymbol name="wifi" size={11} color={grayText} />
            <IconSymbol name="battery.100" size={14} color={grayText} style={{ marginLeft: 4 }} />
          </View>
        </View>
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileHeaderTitle}>Ordem #1849</Text>
          <Text style={styles.mobileHeaderSubtitle}>Instalação de Evaporadora</Text>
        </View>
        <ScrollView style={styles.mobileContent} scrollEnabled={false}>
          <View style={styles.mobileCard}>
            <Text style={styles.mobileCardTitle}>Passos do Atendimento</Text>
            {[
              { text: "Chegada registrada por GPS", checked: true },
              { text: "Foto do local e aparelho", checked: true },
              { text: "Manutenção e higienização", checked: true },
              { text: "Assinatura do cliente", checked: false },
            ].map((step, idx) => (
              <View key={idx} style={styles.mobileStepRow}>
                <View style={[styles.mobileCheckbox, step.checked && styles.mobileCheckboxChecked]}>
                  {step.checked && <IconSymbol name="checkmark" size={9} color={dark} />}
                </View>
                <Text style={[styles.mobileStepText, step.checked && styles.mobileStepTextChecked]}>
                  {step.text}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.mobilePhotoBox}>
            <Image source={{ uri: heroPhoto }} style={styles.mobilePhotoImage} />
            <View style={styles.mobilePhotoLabel}>
              <IconSymbol name="camera.fill" size={10} color={lime} />
              <Text style={styles.mobilePhotoLabelText}>FOTO ANEXADA</Text>
            </View>
          </View>
          <View style={styles.mobileSignBox}>
            <Text style={styles.mobileSignLabel}>Assinatura do Cliente</Text>
            <View style={styles.mobileSignArea}>
              <View style={styles.fakeSignatureLine} />
              <Text style={styles.fakeSignatureText}>Carlos A. Ferreira</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function LandingScreen() {
  const { register } = useSupabaseAuth();
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);

  const stepLabels = ["VERIFICAÇÃO", "SENHA", "DADOS"];
  const stepStatus = [
    emailVerified ? 2 : 1,
    password.length >= 6 ? 2 : 1,
    name.trim() && company.trim() ? 2 : 1,
  ];

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  useEffect(() => {
    if (step !== 1 || !/^\S+@\S+\.\S+$/.test(email.trim()) || emailVerified || emailCodeSent || emailVerificationLoading) {
      return;
    }

    void handleSendEmailCode();
  }, [step, email, emailVerified, emailCodeSent, emailVerificationLoading]);

  async function handleSendEmailCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Informe um email válido.");
      return;
    }
    setError("");
    setEmailVerificationLoading(true);
    try {
      await sendEmailVerification(email.trim());
      setEmailCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o código.");
    } finally {
      setEmailVerificationLoading(false);
    }
  }

  async function handleVerifyEmailCode() {
    if (emailCode.length !== 6) {
      setError("Código deve ter 6 dígitos.");
      return;
    }
    setError("");
    setEmailVerificationLoading(true);
    try {
      await verifyEmailCode(email.trim(), emailCode);
      setEmailVerified(true);
      setEmailCodeSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setEmailVerificationLoading(false);
    }
  }

  const goSignup = () => {
    setError("");

    if (step === 1) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError("Informe um e-mail válido.");
        return;
      }
      if (!emailVerified) {
        setError("Confirme seu email antes de continuar.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (password.length < 6) {
        setError("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }
      setStep(3);
      return;
    }

    if (!name.trim() || !company.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Preencha nome, empresa e um e-mail válido.");
      return;
    }

    submitSignup();
  };

  const submitSignup = async () => {
    if (!emailVerified) {
      setError("Confirme seu email antes de criar a conta.");
      setStep(1);
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(name.trim(), email.trim(), password);
      router.push({
        pathname: "/register-company",
        params: { company: company.trim() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already registered") || message.includes("User already registered")) {
        setEmailVerified(false);
        setEmailCodeSent(false);
        setEmailCode("");
        setStep(1);
        setError("Este email já está cadastrado. Confirme outro email antes de continuar.");
      } else {
        setError(message || "Não foi possível criar sua conta.");
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToSignup = () => {
    if (Platform.OS === "web") {
      const signupElement =
        document.getElementById("cadastro-section") ??
        document.getElementById("cadastro") ??
        document.getElementById("signup");

      if (signupElement) {
        signupElement.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const scrollToId = (id: string, fallbackY: number) => {
    if (Platform.OS === "web") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      scrollRef.current?.scrollTo({ y: fallbackY, animated: true });
    }
  };

  const startTrial = () => {
    setStep(1);
    scrollToSignup();
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.page}
      contentContainerStyle={styles.pageContent}
    >
      {Platform.OS === "web" && (
        <style dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;700;800;900&display=swap');
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Custom scrollbar matching dark/lime theme */
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-track {
            background: #0A0A0A;
          }
          ::-webkit-scrollbar-thumb {
            background: #222222;
            border-radius: 5px;
            border: 2px solid #0A0A0A;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #C8FF00;
          }
        ` }} />
      )}

      <View style={styles.nav}>
        <GestorLogo />
        <View style={[styles.navLinks, { gap: isMobile ? 12 : 18 }]}>
          <Pressable onPress={() => router.push("/login")}>
            <Text style={[styles.navLogin, { fontSize: isMobile ? 12 : 14 }]}>Já uso o Gestor OS</Text>
          </Pressable>
          <Pressable onPress={scrollToSignup} style={styles.navCta}>
            <Text style={styles.navCtaText}>Começar grátis</Text>
          </Pressable>
        </View>
      </View>

      {/* SEÇÃO 1: HERO (Com Imagem de Fundo FULL-WIDTH) */}
      <View style={styles.sectionFullWidthWrapper}>
        <Image
          source={heroPhoto}
          style={styles.heroBgImage as any}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        <View style={[styles.hero, { flexDirection: isMobile ? "column" : "row", paddingTop: isMobile ? 40 : 68, paddingBottom: isMobile ? 40 : 92 }]}>
          <View style={[styles.heroCopy, { minWidth: isMobile ? "100%" : 310, maxWidth: isMobile ? "100%" : 620 }]}>
            <View style={styles.signal}>
              <View style={styles.signalDot} />
              <Text style={styles.signalText}>
                PLATAFORMA PARA EMPRESAS DE SERVIÇO
              </Text>
            </View>
            <Text style={[styles.heroTitle, { fontSize: isMobile ? 36 : 64, lineHeight: isMobile ? 40 : 68 }]}>
              PARE DE PERDER DINHEIRO COM SERVIÇO <Text style={styles.limeText}>SEM PROVA.</Text>
            </Text>
            <Text style={[styles.heroSub, { fontSize: isMobile ? 16 : 18, lineHeight: isMobile ? 24 : 28 }]}>
              O Gestor OS organiza sua equipe em campo e registra o que realmente
              aconteceu: chegada por GPS, fotos detalhadas e assinatura digital do cliente.
            </Text>

            <View style={{ flexDirection: isMobile ? "column" : "row", gap: 14, marginTop: 30 }}>
              <Pressable onPress={startTrial} style={({ pressed }) => [styles.primaryCta, pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 }]}>
                <Text style={styles.primaryCtaText}>
                  Começar Grátis por 30 Dias
                </Text>
                <IconSymbol name="arrow.right" size={18} color={dark} />
              </Pressable>
              <Pressable onPress={startTrial} style={styles.secondaryCta}>
                <IconSymbol name="play.fill" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryCtaText}>
                  Ver demonstração
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 22 }}>
              <Text style={styles.heroBadgeText}>✓ Sem cartão de crédito</Text>
              <Text style={styles.heroBadgeText}>✓ Cancele quando quiser</Text>
              <Text style={styles.heroBadgeText}>✓ Setup em 5 minutos</Text>
            </View>
          </View>

          <View nativeID="demo" style={[styles.heroVisual, { width: isMobile ? "100%" : 480, height: isMobile ? 360 : 540, minWidth: isMobile ? "100%" : 290 }]}>
            <ProductPreview isMobile={isMobile} />
          </View>
        </View>
      </View>

      {/* SEÇÃO 2: PROBLEMA (Com Fundo FULL-WIDTH) */}
      <View style={[styles.sectionFullWidthWrapper, { backgroundColor: dark, borderTopWidth: 1, borderTopColor: borderSubtle, borderBottomWidth: 1, borderBottomColor: borderSubtle }]}>
        <View style={[styles.problemBand, { paddingVertical: isMobile ? 60 : 92 }]}>
          <View style={styles.centeredSectionHeader}>
            <Text style={styles.sectionEyebrow}>A OPERAÇÃO NÃO PODE DEPENDER DA MEMÓRIA</Text>
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 42, lineHeight: isMobile ? 34 : 48 }]}>
              O que acontece no campo não pode ser um mistério.
            </Text>
            <Text style={styles.sectionBody}>
              Muitas empresas perdem faturamento e clientes por discussões desnecessárias. Evite prejuízos blindando sua operação.
            </Text>
          </View>
          <View style={styles.problemListCentered}>
            <CheckLine>“O técnico realmente foi?” O GPS registra o local exato da chegada.</CheckLine>
            <CheckLine>“O que foi feito no local?” Fotos e histórico estruturado provam cada etapa.</CheckLine>
            <CheckLine>“O cliente aceitou o serviço?” A assinatura direto na tela encerra a OS de forma incontestável.</CheckLine>
          </View>
        </View>
      </View>

      {/* SEÇÃO 3: FUNCIONALIDADES (Sem Imagem - Alternância Harmônica) */}
      <View nativeID="funcionalidades" style={[styles.solution, { paddingVertical: isMobile ? 60 : 110 }]}>
        <View style={styles.centeredSectionHeader}>
          <Text style={styles.sectionEyebrow}>DO CHAMADO AO ACEITE</Text>
          <Text style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 42, lineHeight: isMobile ? 34 : 48 }]}>
            Cada atendimento deixa um rastro.
          </Text>
          <Text style={styles.sectionBody}>
            Quatro passos simples para transformar serviço técnico em informação confiável.
          </Text>
          <Pressable onPress={startTrial} style={styles.centerSectionCta}>
            <Text style={styles.centerSectionCtaText}>Testar todas as funcionalidades grátis</Text>
            <IconSymbol name="arrow.right" size={14} color={dark} />
          </Pressable>
        </View>

        <View style={[styles.steps, { gap: isMobile ? 20 : 16 }]}>
          {[
            [
              "01",
              "Crie a OS",
              "Cliente, endereço, valor e profissional em um só lugar de forma rápida.",
            ],
            [
              "02",
              "Registre a chegada",
              "GPS confirma o horário exato em que o técnico iniciou a manutenção.",
            ],
            [
              "03",
              "Documente o serviço",
              "Evidências fotográficas obrigatórias e observações ficam anexadas à OS.",
            ],
            [
              "04",
              "Colete o aceite",
              "O cliente assina digitalmente na tela do celular e a ordem é encerrada.",
            ],
          ].map(([number, title, body]) => (
            <View key={number} style={[styles.step, { width: isMobile ? "100%" : isTablet ? "47%" : "23%" }]}>
              <Text style={styles.stepNumber}>{number}</Text>
              <View style={styles.stepLine} />
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepBody}>{body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* SEÇÃO 4: APP MOBILE (Com Imagem de Fundo FULL-WIDTH) */}
      <View style={[styles.sectionFullWidthWrapper, { borderTopWidth: 1, borderTopColor: borderSubtle, backgroundColor: dark }]}>
        <View style={[styles.appMobileSection, { flexDirection: isMobile ? "column-reverse" : "row", paddingVertical: isMobile ? 60 : 110, gap: isMobile ? 40 : 60 }]}>
          <View style={[styles.appMobileVisual, { width: isMobile ? "100%" : 400, height: isMobile ? 480 : 540, marginTop: isMobile ? 30 : 0, transform: [{ scale: 1 }], shadowColor: lime, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }]}>
            <MobileAppPreview isMobile={isMobile} />
          </View>
          <View style={[styles.appMobileCopy, { flex: 1, minWidth: isMobile ? "100%" : 320, maxWidth: 540 }]}>
            <Text style={styles.sectionEyebrow}>NA MÃO DO TÉCNICO</Text>
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 42, lineHeight: isMobile ? 34 : 48, color: "#FFFFFF" }]}>
              SEUS TÉCNICOS NO CELULAR, <Text style={styles.limeText}>VOCÊ NO CONTROLE</Text>
            </Text>
            <Text style={[styles.sectionBody, { fontSize: 15, lineHeight: 26, marginBottom: 30 }]}>
              Chega de ordens de serviço amassadas ou perdidas. O técnico recebe tudo no celular e conclui o trabalho com comprovação indiscutível em poucos toques.
            </Text>
            <View style={[styles.appFeaturesList, { gap: 14 }]}>
              <CheckLine>Funciona offline e sincroniza quando houver conexão.</CheckLine>
              <CheckLine>Validação de chegada no cliente por geolocalização (GPS).</CheckLine>
              <CheckLine>Fotos obrigatórias para comprovação do antes e depois.</CheckLine>
              <CheckLine>Assinatura digital do cliente na tela do celular.</CheckLine>
            </View>
            <Pressable onPress={startTrial} style={({ pressed }) => [styles.primaryCta, { marginTop: 30 }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 }]}>
              <Text style={styles.primaryCtaText}>Teste grátis por 30 dias</Text>
              <IconSymbol name="arrow.right" size={16} color={dark} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* SEÇÃO 5: DEPOIMENTOS (Sem Imagem - Alternância Harmônica) */}
      <View style={[styles.testimonials, { paddingVertical: isMobile ? 60 : 110 }]}>
        <View style={styles.centeredSectionHeader}>
          <Text style={styles.sectionEyebrow}>DEPOIMENTOS</Text>
          <Text style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 42, lineHeight: isMobile ? 34 : 48 }]}>
            EMPRESAS QUE JÁ UTILIZAM O GESTOR OS
          </Text>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <IconSymbol key={i} name="star.fill" size={16} color={lime} />
            ))}
          </View>
        </View>

        <View style={[styles.testimonialGrid, { gap: 16 }]}>
          {[
            {
              quote: "Depois do Gestor OS, parei de perder 6 horas por semana organizando planilhas e provando visitas. Meus clientes adoraram o novo padrão de profissionalismo.",
              author: "Ricardo Lima",
              company: "Clima Frio Soluções",
            },
            {
              quote: "O app mobile com a nossa marca foi um divisor de águas. Os clientes sentem que estão pagando por um serviço premium de alto padrão.",
              author: "Juliana Santos",
              company: "Ar Sul Climatização",
            },
            {
              quote: "Gerencie 3 equipes em campo com um único login. Consigo comparar horários de chegada, fotos do serviço e assinatura em segundos. Impossível voltar atrás.",
              author: "Carlos Eduardo",
              company: "EletroCampo Elétrica",
            },
            {
              quote: "A assinatura digital na tela me poupa muito tempo. Não preciso mais de papel e o comprovante vai automático por e-mail para o cliente.",
              author: "Felipe Almeida",
              company: "HidroMax Manutenções",
            },
            {
              quote: "O sistema de alertas de GPS nos trouxe total segurança. O suporte responde em minutos e nos ajudou a configurar tudo muito rápido.",
              author: "Aline Costa",
              company: "Alfa Elevadores",
            },
            {
              quote: "A migração dos dados antigos foi muito rápida. Em 2 dias estava tudo rodando perfeitamente. Recomendo de olhos fechados.",
              author: "Eduardo Souza",
              company: "TermoTec Refrigeração",
            },
          ].map((t, idx) => (
            <View key={idx} style={[styles.testimonialCard, { width: isMobile ? "100%" : isTablet ? "47%" : "31%" }, { transform: [{ scale: 1 }], shadowColor: lime, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }]}>
              <View style={styles.quoteIcon}>
                <Text style={styles.quoteText}>“</Text>
              </View>
              <Text style={styles.testimonialQuote}>{t.quote}</Text>
              <View style={styles.testimonialMeta}>
                <Text style={styles.testimonialAuthor}>{t.author}</Text>
                <Text style={styles.testimonialCompany}>{t.company}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* SEÇÃO 6: CADASTRO (Com Imagem de Fundo FULL-WIDTH) */}
      <View id="cadastro-section" style={[styles.sectionFullWidthWrapper, { borderTopWidth: 1, borderTopColor: borderSubtle, backgroundColor: dark }]}>
        <View style={[styles.signup, { flexDirection: isMobile ? "column" : "row", paddingVertical: isMobile ? 60 : 110, gap: isMobile ? 40 : 70 }]}>
          <View style={[styles.signupPitch, { minWidth: isMobile ? "100%" : 290, maxWidth: isMobile ? "100%" : 500 }]}>
            <Text style={styles.sectionEyebrow}>TESTE GRÁTIS</Text>
            <Text style={[styles.signupTitle, { fontSize: isMobile ? 32 : 52, lineHeight: isMobile ? 38 : 58 }]}>
              COMECE <Text style={styles.limeText}>HOJE DE GRAÇA</Text>
            </Text>
            <Text style={styles.sectionBody}>
              Cadastre sua empresa agora e libere todos os recursos por 30 dias. Sem cartão de crédito e sem contratos complicados.
            </Text>
            <View style={{ marginTop: 24, gap: 10 }}>
              <CheckLine>Acesso completo a todos os recursos do plano Pro</CheckLine>
              <CheckLine>App mobile para seus técnicos e equipes</CheckLine>
              <CheckLine>Migração dos seus dados atuais por nossa equipe</CheckLine>
              <CheckLine>Suporte dedicado via WhatsApp durante todo o teste</CheckLine>
            </View>
          </View>

          <View style={[styles.formCard, { minWidth: isMobile ? "100%" : 310, maxWidth: isMobile ? "100%" : 480, padding: isMobile ? 20 : 32 }]}>
            <View style={styles.stepFlow}>
              {["DADOS", "SENHA", "VERIFICAÇÃO"].map((item, index) => {
                const isDone = index < step - 1 || (index === 0 && name && company && email) || (index === 1 && password.length >= 6) || (index === 2 && emailVerified);
                const isCurrent = step === index + 1;
                return (
                  <>
                    <View key={`${item}-dot`} style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                      <Text style={[styles.stepDotText, isDone && styles.stepDotTextDone, isCurrent && styles.stepDotTextCurrent]}>{isDone ? "✓" : index + 1}</Text>
                    </View>
                    {isCurrent && <Text key={`${item}-label`} style={[styles.stepLabel, styles.stepLabelActive]}>{item}</Text>}
                  </>
                );
              })}
            </View>

            {step === 1 ? (
              <>
                <View style={styles.verificationHeaderWrap}>
                  <View style={styles.verificationIconWrap}>
                    <IconSymbol name="person.fill" size={20} color={lime} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verificationTitle}>SUA EMPRESA</Text>
                    <Text style={styles.verificationSubtitle}>Gestão de ordens de serviço</Text>
                  </View>
                </View>

                <View style={[styles.formRow, { flexDirection: isMobile ? "column" : "row", gap: isMobile ? 0 : 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Field label="SEU NOME" placeholder="João Silva" value={name} onChangeText={setName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="EMPRESA" placeholder="Climatech Serviços" value={company} onChangeText={setCompany} />
                  </View>
                </View>

                <Field label="EMAIL" placeholder="seu@email.com" value={email} onChangeText={(next) => { setEmail(next); if (emailVerified) setEmailVerified(false); if (emailCodeSent) setEmailCodeSent(false); if (emailCode) setEmailCode(""); }} keyboardType="email-address" />

                <Pressable onPress={() => setStep(2)} style={({ pressed }) => [styles.formCta, styles.formCtaGreen, (!name || !company || !email) && { opacity: 0.78 }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 }]} disabled={!name || !company || !email}>
                  <Text style={styles.formCtaText}>Quero meu teste grátis de 30 dias</Text>
                  <IconSymbol name="arrow.right" size={17} color={dark} />
                </Pressable>
              </>
            ) : step === 2 ? (
              <>
                <View style={styles.verificationHeaderWrap}>
                  <View style={styles.verificationIconWrap}>
                    <IconSymbol name="lock.fill" size={20} color={lime} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verificationTitle}>DEFINE SUA SENHA</Text>
                    <Text style={styles.verificationSubtitle}>Segurança da sua conta.</Text>
                  </View>
                </View>

                <Field label="SENHA" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} secureTextEntry />
                <Field label="CONFIRMAR SENHA" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} secureTextEntry />

                <Pressable onPress={() => { handleSendEmailCode(); setStep(3); }} style={({ pressed }) => [styles.formCta, styles.formCtaGreen, password.length < 6 && { opacity: 0.78 }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 }]} disabled={password.length < 6}>
                  <Text style={styles.formCtaText}>Próximo passo</Text>
                  <IconSymbol name="arrow.right" size={17} color={dark} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.verificationHeaderWrap}>
                  <View style={styles.verificationIconWrap}>
                    <IconSymbol name="envelope.fill" size={20} color={lime} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verificationTitle}>CONFIRME SEU EMAIL</Text>
                    <Text style={styles.verificationSubtitle}>Enviamos um código de 6 dígitos para:</Text>
                  </View>
                </View>

                <View style={styles.emailDisplayBox}>
                  <Text selectable={false} style={styles.emailDisplayText}>{email || "seu@email.com"}</Text>
                </View>

                <Text style={styles.fieldLabel}>CÓDIGO DE 6 DÍGITOS</Text>
                <View style={styles.verificationInputWrap}>
                  <TextInput
                    value={emailCode}
                    onChangeText={(value) => setEmailCode(value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    maxLength={6}
                    style={styles.verificationInput}
                    textAlign="center"
                  />
                </View>

                <Pressable
                  onPress={goSignup}
                  disabled={emailCode.length !== 6 || emailVerificationLoading}
                  style={({ pressed }) => [styles.formCta, styles.formCtaGreen, emailCode.length !== 6 && { opacity: 0.78 }, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <Text style={styles.formCtaText}>Criar minha conta</Text>
                  <IconSymbol name="arrow.right" size={17} color={dark} />
                </Pressable>

                <View style={styles.secondaryActionsRow}>
                  <Pressable onPress={handleSendEmailCode} style={styles.secondaryActionTextWrap}>
                    <Text style={styles.secondaryActionText}>↻ Reenviar código</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep(1)} style={styles.secondaryActionTextWrap}>
                    <Text style={styles.secondaryActionText}>Voltar ao início</Text>
                  </Pressable>
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.terms}>Ao se cadastrar você concorda com nossos Termos de Uso e Política de Privacidade.</Text>
          </View>
        </View>
      </View>

      {/* SEÇÃO 7: PLANOS (Sem Imagem - Alternância Harmônica) */}
      <View nativeID="planos" style={[styles.plans, { paddingVertical: isMobile ? 60 : 110 }]}>
        <View style={styles.centeredSectionHeader}>
          <Text style={styles.sectionEyebrow}>PLANOS</Text>
          <Text style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 42, lineHeight: isMobile ? 34 : 48 }]}>
            Escolha o plano <Text style={styles.limeText}>ideal</Text> para sua operação
          </Text>
        </View>

        <View style={styles.billing}>
          <Pressable
            onPress={() => setAnnual(false)}
            style={[styles.billingItem, !annual && styles.billingActive]}
          >
            <Text
              style={[styles.billingText, !annual && styles.billingTextActive]}
            >
              Mensal
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setAnnual(true)}
            style={[styles.billingItem, annual && styles.billingActive]}
          >
            <Text
              style={[styles.billingText, annual && styles.billingTextActive]}
            >
              Anual <Text style={[styles.save, annual && styles.saveActive]}>-20%</Text>
            </Text>
          </Pressable>
        </View>

        <View style={[styles.planGrid, { gap: 16 }]}>
          {[
            ["Starter", "79", "2 técnicos", "1 gestor", "Suporte por e-mail"],
            ["Pro", "159", "6 técnicos", "Métricas e relatórios", "Suporte prioritário 24/7"],
            ["Elite", "239", "15 técnicos", "Múltiplos gestores", "Onboarding presencial"],
          ].map(([title, price, capacity, extra, support], index) => {
            const yearly = index === 0 ? "569" : index === 1 ? "1289" : "2513";
            const isFeatured = index === 1;
            return (
              <Pressable
                key={title}
                style={({ hovered }) => [
                  styles.plan,
                  {
                    width: isMobile ? "100%" : isTablet ? "48%" : "31%",
                    flex: undefined,
                    minWidth: undefined,
                  },
                  isFeatured && styles.planFeatured,
                  isFeatured && !isMobile && { transform: [{ scale: 1.08 }], boxShadow: "0 20px 60px rgba(200, 255, 0, 0.3)" },
                  hovered && styles.planHover,
                  hovered && isFeatured && styles.planFeaturedHover,
                ]}
              >
                {isFeatured && (
                  <Text style={styles.popular}>MAIS POPULAR</Text>
                )}
                <Text style={styles.planName}>{title}</Text>
                <Text style={styles.planSub}>
                  {index === 0 ? "Para técnicos começando" : index === 1 ? "Para equipes em crescimento" : "Para grandes operações"}
                </Text>
                <Text style={styles.planPrice}>
                  {annual ? `R$ ${yearly}` : `R$ ${price}`}
                  <Text style={styles.planPeriod}>
                    {annual ? "/ano" : "/mês"}
                  </Text>
                </Text>
                {annual && (
                  <Text style={styles.savings}>Economize no anual</Text>
                )}
                <View style={styles.planFeatures}>
                  <CheckLine>{capacity}</CheckLine>
                  <CheckLine>Ordens de serviço ilimitadas</CheckLine>
                  <CheckLine>Fotos, GPS e assinatura digital</CheckLine>
                  <CheckLine>{extra}</CheckLine>
                  <CheckLine>{support}</CheckLine>
                </View>
                <Pressable
                  onPress={startTrial}
                  style={({ pressed }) => [
                    styles.planCta,
                    isFeatured && styles.planCtaFeatured,
                    pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.planCtaText,
                      isFeatured && styles.planCtaTextFeatured,
                    ]}
                  >
                    {isFeatured ? "Testar Grátis 30 dias" : "Começar Grátis 30 dias"}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.planFoot}>
          Teste Grátis por 30 dias: Não gostou? Cancele quando quiser.
        </Text>
      </View>

      {/* SEÇÃO 8: FAQ (Com Imagem de Fundo FULL-WIDTH) */}
      <View style={[styles.sectionFullWidthWrapper, { borderTopWidth: 1, borderTopColor: borderSubtle, backgroundColor: dark }]}>
        <View style={[styles.faq, { paddingVertical: isMobile ? 60 : 100 }]}>
          <View style={styles.centeredSectionHeader}>
            <Text style={styles.sectionEyebrow}>FAQ</Text>
            <Text style={[styles.sectionTitle, { fontSize: isMobile ? 28 : 42, lineHeight: isMobile ? 34 : 48 }]}>
              PERGUNTAS FREQUENTES
            </Text>
          </View>
          {[
            [
              "O Gestor OS funciona para técnico autônomo?",
              "Sim. O plano Starter é ideal para técnicos individuais organizarem suas chamadas e coletarem assinaturas no celular.",
            ],
            [
              "Como funciona o suporte?",
              "Oferecemos suporte por e-mail e WhatsApp para ajudar a configurar as ordens, importar clientes e cadastrar sua equipe.",
            ],
            [
              "Preciso de internet o tempo todo em campo?",
              "Não. O técnico pode visualizar e documentar o atendimento mesmo offline; a sincronização dos dados com o painel do gestor ocorre de forma automática assim que houver conexão.",
            ],
            [
              "Posso importar meus dados de planilhas?",
              "Sim. Nossa equipe auxilia na migração de clientes, técnicos e contatos anteriores de arquivos CSV ou Excel.",
            ],
          ].map(([question, answer], index) => (
            <Pressable
              key={question}
              onPress={() => setOpenFaq(openFaq === index ? null : index)}
              style={styles.faqRow}
            >
              <View style={styles.faqQuestion}>
                <Text style={styles.faqText}>{question}</Text>
                <View style={styles.faqPlusIcon}>
                  <Text style={styles.faqPlusText}>{openFaq === index ? "−" : "+"}</Text>
                </View>
              </View>
              {openFaq === index && (
                <Text style={styles.faqAnswer}>{answer}</Text>
              )}
            </Pressable>
          ))}

          <View style={{ alignItems: "center", marginTop: 40, zIndex: 2 }}>
            <Text style={{ color: grayText, fontSize: 14 }}>Ainda com dúvidas?</Text>
            <Pressable onPress={startTrial} style={{ marginTop: 10 }}>
              <Text style={{ color: lime, fontWeight: "900", fontSize: 16 }}>Fale com um especialista →</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* SEÇÃO 9: BANNER DE INSCRIÇÃO RÁPIDA & FOOTER (Com 4 Colunas no Rodapé) */}
      <View style={styles.footerSection}>
        <View style={styles.quickStartBanner}>
          <Image
            source={abstractGridPattern}
            style={[styles.absoluteFill, { opacity: 0.05, borderRadius: 14 }]}
          />
          <View style={{ flex: 1, minWidth: 280, zIndex: 2 }}>
            <Text style={styles.quickStartTitle}>PRONTO PARA COMEÇAR?</Text>
            <Text style={styles.quickStartSub}>Teste grátis por 30 dias. Sem cartão de crédito.</Text>
          </View>
          <Pressable onPress={startTrial} style={[styles.quickStartCta, { zIndex: 2 }]}>
            <Text style={styles.quickStartCtaText}>Cadastrar agora →</Text>
          </Pressable>
        </View>

        <View style={[styles.footerColumns, { flexDirection: isMobile ? "column" : "row", flexWrap: isMobile ? "wrap" : "nowrap" }]}>
          <View style={[styles.footerColumn, { width: isMobile ? "100%" : "23%" }]}>
            <Text style={styles.logo}>
              GESTOR <Text style={styles.logoAccent}>OS</Text>
            </Text>
            <Text style={styles.footerDesc}>
              A plataforma completa para gerenciar equipes técnicas, ordens de serviço e comprovações em campo.
            </Text>
          </View>
          <View style={[styles.footerColumn, { width: isMobile ? "45%" : "22%" }]}>
            <Text style={styles.footerColumnTitle}>PRODUTO</Text>
            {[
              { label: "Funcionalidades", action: () => scrollToId("funcionalidades", 1100) },
              { label: "Planos", action: () => scrollToId("planos", 2400) },
              { label: "Demo", action: () => scrollToId("demo", 400) },
            ].map((item) => (
              <Pressable key={item.label} onPress={item.action}>
                <Text style={[styles.footerLink, { cursor: "pointer" } as any]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.footerColumn, { width: isMobile ? "45%" : "22%" }]}>
            <Text style={styles.footerColumnTitle}>EMPRESA</Text>
            {[
              { label: "Sobre nós", action: () => router.push("/sobre") },
              { label: "Contato", action: () => router.push("/contato") },
              { label: "Login do Gestor", action: () => router.push("/login") },
              { label: "Login do Técnico", action: () => router.push("/login-profissional") },
            ].map((item) => (
              <Pressable key={item.label} onPress={item.action}>
                <Text style={[styles.footerLink, { cursor: "pointer" } as any]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.footerColumn, { width: isMobile ? "100%" : "22%" }]}>
            <Text style={styles.footerColumnTitle}>SUPORTE</Text>
            {[
              { label: "Central de ajuda", action: () => router.push("/ajuda") },
              { label: "WhatsApp", action: () => Linking.openURL("https://wa.me/5519990087686").catch(() => {}) },
              { label: "Termos de uso", action: () => router.push("/termos") },
              { label: "Privacidade", action: () => router.push("/privacidade") },
            ].map((item) => (
              <Pressable key={item.label} onPress={item.action}>
                <Text style={[styles.footerLink, { cursor: "pointer" } as any]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.footerCopy}>
          © 2026 Gestor OS Tecnologia Ltda. Feito com foco na eficiência do trabalho em campo.
        </Text>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "email-address";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#555555"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: dark },
  pageContent: { backgroundColor: dark },
  nav: {
    height: 82,
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  logo: {
    color: "#FFFFFF",
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  logoAccent: {
    color: lime,
    backgroundColor: "rgba(217, 255, 63, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  navLinks: { flexDirection: "row", alignItems: "center", gap: 18 },
  navLogin: { color: grayText, fontWeight: "700" },
  navCta: {
    backgroundColor: lime,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navCtaText: { color: dark, fontSize: 14, fontWeight: "900" },

  // FULL-WIDTH WRAPPER: holds the absolute background image bleeding edge-to-edge
  sectionFullWidthWrapper: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
  },

  // COMMON BACKGROUND ELEMENTS FOR SECTIONS
  sectionBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 1,
  },
  sectionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 10, 10, 0.82)",
  },
  heroBgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 10, 10, 0.7)",
  },
  absoluteFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  // HERO SECTION
  hero: {
    minHeight: 720,
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 40,
    zIndex: 1,
  },
  threeField: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.10,
  },
  heroCopy: { flex: 1.2, minWidth: 310, zIndex: 1, paddingVertical: 20 },
  signal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  signalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: lime },
  signalText: {
    color: lime,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: -1.5,
  },
  heroSub: {
    color: grayText,
    maxWidth: 580,
    marginTop: 22,
  },
  primaryCta: {
    alignSelf: "flex-start",
    minHeight: 56,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: lime,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 0 25px rgba(200, 255, 0, 0.4)",
  } as any,
  primaryCtaText: { color: dark, fontSize: 16, fontWeight: "900" },
  secondaryCta: {
    alignSelf: "flex-start",
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "rgba(255,255,255,0.02)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCtaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  heroBadgeText: { color: grayText, fontSize: 13, fontWeight: "700" },

  heroVisual: {
    flex: 1,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // PREVIEW DOCK (matching Kito Trainner dashboard preview)
  previewContainer: {
    position: "relative",
    paddingTop: 18,
    paddingBottom: 25,
  },
  previewShell: {
    borderWidth: 1,
    borderColor: borderSubtle,
    borderRadius: 14,
    backgroundColor: darkCard,
    overflow: "hidden",
    width: "100%",
  },
  previewTop: {
    height: 42,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: borderSubtle,
    flexDirection: "row",
    alignItems: "center",
  },
  windowControls: {
    flexDirection: "row",
    gap: 6,
  },
  controlDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewTitle: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 12,
    letterSpacing: 1,
  },
  previewBody: { flexDirection: "row", minHeight: 330 },
  previewSide: {
    width: 120,
    borderRightWidth: 1,
    borderRightColor: borderSubtle,
    padding: 16,
    gap: 18,
  },
  sideBrand: { color: lime, fontSize: 10, fontWeight: "900", marginBottom: 14 },
  sideItem: { color: "#555555", fontSize: 11, fontWeight: "700" },
  sideItemActive: { color: "#FFFFFF" },
  previewMain: { flex: 1, padding: 24 },
  previewKicker: {
    color: "#555555",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  previewMetrics: { flexDirection: "row", gap: 10, marginTop: 14 },
  previewMetric: {
    flex: 1,
    backgroundColor: dark,
    padding: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: borderSubtle,
  },
  metricNumber: { color: lime, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: grayText, fontSize: 9, marginTop: 4 },

  dashboardBadge: {
    position: "absolute",
    top: 4,
    right: 24,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
  } as any,
  dashboardBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  dashboardBadgeBottom: {
    position: "absolute",
    bottom: 10,
    left: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
  } as any,
  badgeIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(200, 255, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBottomSub: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "700",
  },
  badgeBottomTitle: {
    color: lime,
    fontSize: 11,
    fontWeight: "900",
  },
  dashboardBadgeBottomText: { color: dark, fontSize: 11, fontWeight: "900" },

  // SEÇÕES CENTRALIZADAS
  centeredSectionHeader: {
    maxWidth: 820,
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 54,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  sectionEyebrow: {
    color: lime,
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: "900",
    marginBottom: 14,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: -1,
    textAlign: "center",
  },
  sectionBody: {
    color: grayText,
    fontSize: 17,
    lineHeight: 26,
    marginTop: 18,
    textAlign: "center",
    maxWidth: 680,
  },

  // PROBLEMA
  problemBand: {
    backgroundColor: darkCard,
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: borderSubtle,
    zIndex: 1,
  },
  problemListCentered: {
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    gap: 16,
    paddingHorizontal: 24,
    zIndex: 2,
  },

  // FUNCIONALIDADES
  solution: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  centerSectionCta: {
    backgroundColor: lime,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  centerSectionCtaText: { color: dark, fontSize: 13, fontWeight: "900" },
  steps: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 24 },
  step: {
    backgroundColor: darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: borderSubtle,
    padding: 24,
    marginBottom: 20,
    borderTopWidth: 2,
    borderTopColor: "rgba(200,255,0,0.25)",
    transform: [{ translateY: 0 }],
  },
  stepNumberWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(200,255,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(200,255,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stepNumber: {
    color: lime,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  stepLine: { height: 1, backgroundColor: "rgba(200,255,0,0.16)", marginVertical: 14 },
  stepTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  stepBody: { color: grayText, fontSize: 14, lineHeight: 22, marginTop: 9 },

  // APP MOBILE SECTION
  appMobileSection: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 50,
    zIndex: 1,
  },
  appMobileVisual: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  appMobileCopy: {
    zIndex: 2,
  },
  appFeaturesList: {
    marginTop: 20,
    gap: 6,
  },
  mobilePreviewShell: {
    width: 300,
    height: 480,
    backgroundColor: "#161616",
    borderRadius: 36,
    borderWidth: 8,
    borderColor: "#2B2B2B",
    padding: 10,
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
  } as any,
  mobilePreviewScreen: {
    flex: 1,
    backgroundColor: dark,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  mobileSpeaker: {
    position: "absolute",
    top: 6,
    left: "50%",
    marginLeft: -25,
    width: 50,
    height: 4,
    backgroundColor: "#2B2B2B",
    borderRadius: 2,
    zIndex: 10,
  },
  mobileStatusBar: {
    height: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  mobileStatusTime: {
    color: grayText,
    fontSize: 10,
    fontWeight: "700",
  },
  mobileStatusIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  mobileHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: borderSubtle,
  },
  mobileHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  mobileHeaderSubtitle: {
    color: lime,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  mobileContent: {
    flex: 1,
    padding: 10,
  },
  mobileCard: {
    backgroundColor: darkCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: borderSubtle,
    marginBottom: 10,
  },
  mobileCardTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
  },
  mobileStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  mobileCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: lime,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileCheckboxChecked: {
    backgroundColor: lime,
  },
  mobileStepText: {
    color: grayText,
    fontSize: 9,
    fontWeight: "600",
  },
  mobileStepTextChecked: {
    textDecorationLine: "line-through",
    color: "#555555",
  },
  mobilePhotoBox: {
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    marginBottom: 10,
  },
  mobilePhotoImage: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  mobilePhotoLabel: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,10,10,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    gap: 4,
  },
  mobilePhotoLabelText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
  mobileSignBox: {
    backgroundColor: darkCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: borderSubtle,
    marginBottom: 20,
  },
  mobileSignLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
  },
  mobileSignArea: {
    height: 44,
    backgroundColor: dark,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: borderSubtle,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  fakeSignatureLine: {
    position: "absolute",
    bottom: 12,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "#333333",
  },
  fakeSignatureText: {
    color: lime,
    fontFamily: Platform.OS === "web" ? "cursive" : "normal",
    fontSize: 12,
    transform: [{ rotate: "-2deg" }],
  },

  // DEPOIMENTOS
  testimonials: {
    backgroundColor: dark,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: borderSubtle,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 14,
  },
  testimonialGrid: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  testimonialCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(200,255,0,0.22)",
    marginBottom: 14,
    minHeight: 240,
    justifyContent: "space-between",
    shadowColor: lime,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  quoteIcon: {
    marginBottom: 10,
  },
  quoteText: {
    color: lime,
    fontSize: 40,
    lineHeight: 20,
    fontWeight: "900",
  },
  testimonialQuote: {
    color: "#e5e5e5",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 16,
  },
  testimonialMeta: {
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    paddingTop: 14,
  },
  testimonialAuthor: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  testimonialCompany: {
    color: grayText,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  // SIGNUP
  signup: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 70,
    justifyContent: "space-between",
    zIndex: 1,
  },
  signupPitch: { flex: 1.2, minWidth: 290, maxWidth: 500, justifyContent: "center", zIndex: 2 },
  signupTitle: {
    color: "#FFFFFF",
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: -1.5,
  },
  limeText: {
    color: lime,
    textShadowColor: "rgba(200, 255, 0, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  formCard: {
    flex: 1,
    minWidth: 310,
    maxWidth: 480,
    backgroundColor: darkCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: borderSubtle,
    zIndex: 2,
    padding: 22,
  },
  stepFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2b2b2b",
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotCurrent: {
    backgroundColor: lime,
    borderColor: lime,
    shadowColor: lime,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  stepDotDone: {
    backgroundColor: "#34d399",
    borderColor: "#34d399",
  },
  stepDotText: {
    color: "#f5f5f5",
    fontSize: 12,
    fontWeight: "800",
  },
  stepDotTextCurrent: { color: dark },
  stepDotTextDone: { color: dark },
  signupStepLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#3a3a3a",
    marginHorizontal: 2,
  },
  stepLineDone: { backgroundColor: lime },
  stepLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  stepLabelActive: { color: "#f5f5f5" },
  verificationHeaderWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  verificationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(200, 255, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(200, 255, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  verificationTitle: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", letterSpacing: -0.4, marginBottom: 2 },
  verificationSubtitle: { color: grayText, fontSize: 13 },
  emailDisplayBox: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#2d2d2d",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  emailDisplayText: { color: "#e5e5e5", fontSize: 14, fontWeight: "700", textDecorationLine: "none" },
  formRow: { gap: 12 },
  field: { marginTop: 14 },
  fieldLabel: { color: grayText, fontSize: 11, fontWeight: "800", marginBottom: 7 },
  fieldInput: {
    minHeight: 48,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: borderSubtle,
    backgroundColor: dark,
    color: "#FFFFFF",
    paddingHorizontal: 13,
    fontSize: 14,
  },
  verificationInputWrap: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: lime,
    backgroundColor: "#0f0f0f",
    marginBottom: 16,
    shadowColor: lime,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  verificationInput: {
    flex: 1,
    minHeight: 48,
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    paddingHorizontal: 12,
  },
  formCta: {
    marginTop: 23,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: lime,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  formCtaGreen: {
    backgroundColor: "#9AEF4E",
    shadowColor: "#9AEF4E",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  formCtaText: { color: dark, fontSize: 14, fontWeight: "900" },
  secondaryActionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, gap: 12 },
  secondaryActionTextWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  secondaryActionText: { color: "#d1d5db", fontSize: 11, fontWeight: "700" },
  terms: { color: "#555555", fontSize: 10, lineHeight: 15, marginTop: 17 },
  error: { color: "#FF8A80", fontSize: 12, lineHeight: 18, marginTop: 14 },
  // PLANOS
  plans: {
    backgroundColor: darkCard,
    paddingHorizontal: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: borderSubtle,
  },
  billing: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 10,
    backgroundColor: dark,
    borderWidth: 1,
    borderColor: borderSubtle,
    marginTop: 10,
    marginBottom: 30,
  },
  billingItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 7,
    transitionProperty: "background-color",
    transitionDuration: "0.2s",
    transitionTimingFunction: "ease-out",
  } as any,
  billingActive: { backgroundColor: lime },
  billingText: { color: grayText, fontSize: 12, fontWeight: "900" },
  billingTextActive: { color: dark },
  save: { color: grayText, fontSize: 10 },
  saveActive: { color: dark },
  planGrid: {
    width: "100%",
    maxWidth: 1180,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 20,
  },
  plan: {
    backgroundColor: dark,
    borderWidth: 1,
    borderColor: borderSubtle,
    borderRadius: 14,
    padding: 27,
    minHeight: 460,
    justifyContent: "space-between",
    transitionProperty: "transform, border-color, box-shadow",
    transitionDuration: "0.3s",
    transitionTimingFunction: "ease-out",
  } as any,
  planFeatured: { borderColor: lime, borderWidth: 2 },
  planHover: {
    transform: [{ scale: 1.02 }],
    borderColor: lime,
    boxShadow: "0 8px 30px rgba(200, 255, 0, 0.12)",
  } as any,
  planFeaturedHover: {
    transform: [{ scale: 1.06 }],
    boxShadow: "0 12px 40px rgba(200, 255, 0, 0.25)",
  } as any,
  popular: {
    color: dark,
    backgroundColor: lime,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
    fontSize: 9,
    fontWeight: "900",
    marginBottom: 10,
  },
  planName: {
    color: "#FFFFFF",
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontSize: 22,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  planSub: { color: grayText, fontSize: 12, marginTop: 4 },
  planPrice: { color: lime, fontSize: 31, fontWeight: "900", marginTop: 14 },
  planPeriod: { color: grayText, fontSize: 12, fontWeight: "700" },
  savings: { color: grayText, fontSize: 11, marginTop: 4 },
  planFeatures: {
    marginTop: 20,
    gap: 8,
  },
  planCta: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#444444",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    marginTop: 26,
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  planCtaFeatured: { backgroundColor: lime, borderColor: lime },
  planCtaText: { color: lightGrayText, fontSize: 13, fontWeight: "900" },
  planCtaTextFeatured: { color: dark },
  planFoot: { color: grayText, fontSize: 13, marginTop: 28 },

  // FAQ
  faq: {
    maxWidth: 820,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },
  faqRow: {
    backgroundColor: darkCard,
    borderWidth: 1,
    borderColor: borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 12,
    zIndex: 2,
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  faqText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", flex: 1 },
  faqPlusIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: lime,
    alignItems: "center",
    justifyContent: "center",
  },
  faqPlusText: { color: lime, fontSize: 14, fontWeight: "800" },
  faqAnswer: {
    color: grayText,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 680,
  },

  // FOOTER & QUICK START BANNER
  footerSection: {
    backgroundColor: "#060606",
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  quickStartBanner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    backgroundColor: lime,
    borderRadius: 14,
    padding: 36,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 80,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(200, 255, 0, 0.25)",
  } as any,
  quickStartTitle: {
    color: dark,
    fontFamily: "Archivo Black, Impact, sans-serif",
    fontSize: 28,
    fontWeight: "900",
  },
  quickStartSub: {
    color: dark,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  quickStartCta: {
    backgroundColor: dark,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  quickStartCtaText: {
    color: lime,
    fontSize: 15,
    fontWeight: "900",
  },
  footerColumns: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    gap: 30,
    marginBottom: 60,
  },
  footerColumn: {
    gap: 12,
  },
  footerDesc: {
    color: grayText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 240,
  },
  footerColumnTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  footerLink: {
    color: grayText,
    fontSize: 13,
    fontWeight: "600",
  },
  footerCopy: {
    color: "#444444",
    textAlign: "center",
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingTop: 30,
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: lime,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    shadowColor: lime,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  checkText: { flex: 1, color: lightGrayText, fontSize: 16, lineHeight: 24, fontWeight: "600" },
  checkLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginTop: 12,
    paddingHorizontal: 4,
  },
}) as any;
