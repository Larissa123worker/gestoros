import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GestorLogo } from "@/components/gestor-logo";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { store, useAppStore } from "@/lib/app-store";
import { copyToClipboard } from "@/lib/clipboard";
import { isValidCep, isValidPhone, lookupCep, onlyDigits } from "@/lib/validation";
import * as SupabaseService from "@/lib/supabase-service";
import type { CompanySubscription } from "@/lib/supabase-service";
import {
  getBillingAccount,
  getPixQrCode,
  listBillingPlans,
  subscribe,
  type BillingPlan,
} from "@/lib/billing-service";
import { isValidCpfCnpj as isValidCpfCnpjShared } from "@/lib/validation";

const statusLabels: Record<string, string> = {
  trialing: "Trial ativo",
  pending: "Aguardando pagamento",
  active: "Ativo",
  past_due: "Pagamento em atraso",
  expired: "Trial expirado",
  canceled: "Cancelado",
};

function daysRemaining(date: string | null) {
  if (!date) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(date).getTime() - Date.now()) / 86400000),
  );
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "a definir";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "a definir" : date.toLocaleDateString("pt-BR");
}

function isValidCpfCnpj(value: string) {
  return isValidCpfCnpjShared(value);
}

export default function AccountScreen() {
  const colors = useColors();
  const { loading, user, isProfessional } = useRequireAuth();
  const { logout: supabaseLogout } = useSupabaseAuth();
  const state = useAppStore();
  const { width } = useWindowDimensions();
  const [loggingOut, setLoggingOut] = useState(false);
  const isDesktop = width >= 860;
  const [company, setCompany] = useState<any>(null);
  const [liveAccount, setLiveAccount] = useState<any>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("");
  const [cardExpiryYear, setCardExpiryYear] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cardHolderCpfCnpj, setCardHolderCpfCnpj] = useState("");
  const [cardHolderPostalCode, setCardHolderPostalCode] = useState("");
  const [cardHolderAddressNumber, setCardHolderAddressNumber] = useState("");
  const [cardHolderPhone, setCardHolderPhone] = useState("");
  const [cardHolderEmail, setCardHolderEmail] = useState("");
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDocument, setEditDocument] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAddressNumber, setEditAddressNumber] = useState("");
  const [editAddressComplement, setEditAddressComplement] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCepLoading, setEditCepLoading] = useState(false);
  const [showPixQr, setShowPixQr] = useState(false);
  const [pixQr, setPixQr] = useState<any>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixQrRefreshing, setPixQrRefreshing] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [upgradeBanner, setUpgradeBanner] = useState<{ planName: string; amount: number; cycle: "MONTHLY" | "YEARLY"; nextBillingAt: string | null } | null>(null);
  const pixInitialStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.companyId) return;
    void Promise.all([
      SupabaseService.getCompanyById(state.companyId).then(setCompany),
      getBillingAccount()
        .then(setLiveAccount)
        .catch(() => undefined),
      listBillingPlans()
        .then((items) => {
          setPlans(items);
          const recommended = items[1]?.id || items[0]?.id || "";
          setSelectedPlanId((current) => current || recommended);
        })
        .catch(() => undefined),
    ]);
  }, [state.companyId]);

  useEffect(() => {
    const currentStatus = liveAccount?.subscription?.status ?? state.subscription?.status;
    if (!showPixQr && currentStatus !== "pending") return;
    // Captura o status inicial UMA VEZ via ref para evitar stale closure
    if (!pixInitialStatusRef.current) {
      pixInitialStatusRef.current = currentStatus ?? null;
    }
    const interval = setInterval(async () => {
      try {
        const account = await getBillingAccount();
        setLiveAccount(account);
        const fetchedStatus = account?.subscription?.status ?? null;
        // Confirma pagamento se status atual for 'active' E for diferente do inicial
        if (fetchedStatus === "active" && pixInitialStatusRef.current !== "active") {
          setPaymentConfirmed(true);
          setShowPixQr(false);
          setCheckoutOpen(false);
          setBillingMessage("Pagamento confirmado! Seu plano já está ativo.");
          store.setSubscription(account.subscription as CompanySubscription);
          clearInterval(interval);
        }
      } catch {
        // silent polling error
      }
    }, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPixQr, liveAccount?.subscription?.status, state.subscription?.status]);

  function openEdit() {
    if (!company) return;
    setEditName(company.name ?? state.companyName ?? "");
    setEditDocument(company.document ?? "");
    setEditPhone(company.phone ?? "");
    setEditPostalCode(company.postal_code ?? "");
    setEditAddress(company.address ?? "");
    setEditAddressNumber(company.address_number ?? "");
    setEditAddressComplement(company.address_complement ?? "");
    setEditCity(company.city ?? "");
    setEditState(company.state ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function saveCompany() {
    if (!state.companyId || !user?.id) return;
    try {
      setEditSaving(true);
      setEditError(null);
      if (!isValidCpfCnpj(editDocument)) {
        setEditError("CPF/CNPJ inválido. Informe um documento válido.");
        return;
      }
      if (!isValidPhone(editPhone)) {
        setEditError("Celular/telefone inválido. Use apenas 10 ou 11 números.");
        return;
      }
      if (!isValidCep(editPostalCode)) {
        setEditError("CEP inválido. Informe 8 números.");
        return;
      }
      const saved = await SupabaseService.createCompany({
        id: state.companyId,
        userId: user.id,
        name: editName.trim(),
        document: onlyDigits(editDocument) || undefined,
        phone: onlyDigits(editPhone) || undefined,
        postalCode: onlyDigits(editPostalCode) || undefined,
        addressNumber: onlyDigits(editAddressNumber) || undefined,
        addressComplement: editAddressComplement.trim() || undefined,
        city: editCity.trim() || undefined,
        state: editState.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      setCompany(saved);
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err?.message ?? "Erro ao atualizar empresa.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleEditCepBlur() {
    if (!isValidCep(editPostalCode)) return;
    try {
      setEditCepLoading(true);
      setEditError(null);
      const result = await lookupCep(editPostalCode);
      if (!result) return;
      setEditAddress(result.logradouro ?? "");
      setEditCity(result.localidade ?? "");
      setEditState(result.uf ?? "");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
    } finally {
      setEditCepLoading(false);
    }
  }


  async function refreshAccount() {
    setRefreshing(true);
    try {
      const account = await getBillingAccount();
      setLiveAccount(account);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      if (isProfessional || state.membership === "employee") {
        await store.logoutProfessional();
        router.replace("/login-profissional" as any);
        return;
      }
      await supabaseLogout();
      router.replace("/login" as any);
    } catch {
      setLoggingOut(false);
    }
  }

  async function handleSubscribe() {
    if (!selectedPlanId || submitting) return;
    setSubmitting(true);
    setBillingMessage(null);
    try {
      const cleanDocument = (company?.document || "").replace(/\D/g, "");
      const cleanPhone = (company?.phone || company?.mobilePhone || "").replace(/\D/g, "");
      if (!isValidCpfCnpj(cleanDocument)) {
        setBillingMessage("CPF/CNPJ inválido. Atualize os dados da empresa antes de contratar.");
        setSubmitting(false);
        return;
      }
      if (!cleanPhone || cleanPhone.length < 10) {
        setBillingMessage("Telefone da empresa é inválido ou não informado. Atualize o cadastro da empresa antes de contratar.");
        setSubmitting(false);
        return;
      }
      if (billingType === "CREDIT_CARD" && (!cardNumber || !cardHolderName || !cardExpiryMonth || !cardExpiryYear || !cardCcv || !cardHolderCpfCnpj)) {
        setBillingMessage("Preencha todos os dados do cartão para continuar.");
        setSubmitting(false);
        return;
      }
      const input: Parameters<typeof subscribe>[0] = {
        planId: selectedPlanId,
        billingCycle,
        billingType,
        idempotencyKey: `${Date.now()}-${selectedPlanId}-${billingCycle}-${billingType}`,
      } as Parameters<typeof subscribe>[0] & { idempotencyKey: string };
      if (billingType === "CREDIT_CARD") {
        (input as any).card = {
          holderName: cardHolderName,
          number: cardNumber.replace(/\D/g, ""),
          expiryMonth: cardExpiryMonth,
          expiryYear: cardExpiryYear,
          ccv: cardCcv,
          holderCpfCnpj: cardHolderCpfCnpj.replace(/\D/g, ""),
          holderPostalCode: cardHolderPostalCode.replace(/\D/g, ""),
          holderAddressNumber: cardHolderAddressNumber,
          holderPhone: cardHolderPhone.replace(/\D/g, ""),
          holderEmail: cardHolderEmail || user?.email || "",
          remoteIp: "",
        };
        console.log("CREDIT_CARD Frontend Payload:", JSON.stringify({ ...(input as any).card, number: "***", ccv: "***" }));
      }
      const result = await subscribe(input as Parameters<typeof subscribe>[0]);
      const persistedAccount = await getBillingAccount();
      const persistedSubscription = persistedAccount.subscription ?? result.subscription;
      if (billingType === "CREDIT_CARD") {
        console.log("CREDIT_CARD Frontend Response:", JSON.stringify(result));
      }

      if (billingType === "PIX") {
        const qr = (result as any)?.pixQrCode ?? null;
        setPixQr(qr);
        setPixPaymentId((result as any)?.paymentId ?? null);
        setShowPixQr(true);
        if (qr?.encodedImage || qr?.payload) {
          setBillingMessage(null);
        } else {
          setBillingMessage("Assinatura criada. A cobrança PIX estará disponível em breve no seu painel.");
        }
      } else {
        const status = (persistedSubscription as any)?.status?.toLowerCase();
        setCheckoutOpen(false);
        if (status === "active" || status === "paid") {
          setPaymentConfirmed(true);
          setBillingMessage("Pagamento confirmado! Seu plano já está ativo.");
          store.setSubscription(persistedSubscription as CompanySubscription);
        } else {
          setBillingMessage("Assinatura criada. O pagamento está sendo processado pelo Asaas.");
        }
      }

      setLiveAccount(persistedAccount);
      const planObj = plans.find((p) => p.id === selectedPlanId);
      setUpgradeBanner({
        planName: (persistedSubscription as any)?.plan ?? planObj?.name ?? "",
        amount: Number((persistedSubscription as any)?.amount ?? (billingCycle === "monthly" ? planObj?.monthly_amount : planObj?.annual_amount) ?? 0),
        cycle: ((persistedSubscription as any)?.cycle ?? (billingCycle === "annual" ? "YEARLY" : "MONTHLY")) as "MONTHLY" | "YEARLY",
        nextBillingAt: (persistedSubscription as any)?.next_billing_at ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível contratar o plano.";
      if (/forma de pagamento/i.test(message) || /downgrade/i.test(message)) {
        setBillingMessage(`${message} A cobrança pode levar alguns instantes para refletir.`);
      } else {
        setBillingMessage(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshPixQr() {
    try {
      setPixQrRefreshing(true);
      setBillingMessage(null);
      let paymentId = pixPaymentId;
      if (!paymentId) {
        const account = await getBillingAccount();
        setLiveAccount(account);
        const payment = (account as any)?.payments?.find((item: any) => item.status !== "RECEIVED" && item.status !== "CONFIRMED") ?? (account as any)?.payments?.[0];
        paymentId = payment?.id ? String(payment.id) : null;
      }
      if (!paymentId) throw new Error("Cobrança PIX não encontrada.");
      const qr = await getPixQrCode(paymentId);
      setPixPaymentId(paymentId);
      setPixQr(qr);
      setShowPixQr(true);
      setBillingMessage("Código PIX atualizado.");
    } catch (error) {
      setBillingMessage(error instanceof Error ? error.message : "Não foi possível atualizar o código PIX.");
    } finally {
      setPixQrRefreshing(false);
    }
  }

  if (loading)
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  const subscription = state.subscription;
  const liveSubscription = liveAccount?.subscription;
  const displayedStatus =
    liveSubscription?.status ?? subscription?.status ?? "trialing";
  const displayedPlan =
    liveSubscription?.plan ?? subscription?.plan ?? "Profissional";
  const displayedPayments =
    liveAccount?.payments ?? subscription?.payments ?? [];
  const blocked = !["trialing", "active"].includes(displayedStatus);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const selectedPlanPrice = selectedPlan
    ? Number(billingCycle === "monthly" ? selectedPlan.monthly_amount : selectedPlan.annual_amount)
    : 0;
  const maxPlanAmount = Math.max(...plans.map((plan) => Number(plan.monthly_amount ?? 0)), 0);
  const currentPlanIdForUpgrade = (liveSubscription as any)?.plan_id ?? subscription?.plan_id;
  const currentPlanDataForUpgrade = plans.find(p => p.id === currentPlanIdForUpgrade);
  const isPaid = displayedStatus === "active" || displayedStatus === "past_due";
  const baseCurrentMonthlyAmount = isPaid ? Number(currentPlanDataForUpgrade?.monthly_amount ?? 0) : 0;
  const showUpgradeButton = baseCurrentMonthlyAmount < maxPlanAmount && displayedStatus !== "canceled";
  const paymentDueDate =
    liveSubscription?.next_billing_at ??
    liveSubscription?.nextDueDate ??
    subscription?.nextBillingAt ??
    null;
  const lastPayment = displayedPayments.find((payment: any) => 
    payment.status === "paid" || 
    payment.status === "RECEIVED" || 
    payment.status === "CONFIRMED"
  ) ?? displayedPayments[0];
  const invoiceUrl = lastPayment?.invoiceUrl ?? null;
  const isPaidPlan = displayedStatus === "active" || displayedStatus === "past_due";
  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      style={{ backgroundColor: "#02070B" }}
    >
      <ScrollView contentContainerStyle={[styles.page, width < 760 && styles.pageMobile]}>
        <View style={[styles.hudShell, width < 760 && styles.hudShellMobile]}>
          <ImageBackground
            source={require("@/assets/images/pexels-gustavo-fring-6699404.jpeg")}
            style={[styles.sidePanel, width < 760 && styles.sidePanelMobile]}
            imageStyle={[styles.sidePanelImage, width < 760 && styles.sidePanelImageMobile]}
          >
            <View style={styles.sidePanelOverlay} />
            <GestorLogo subtitle />
            <Text style={styles.sideTitle}>Sua conta em ordem.</Text>
            <Text style={styles.sideText}>Gerencie o plano, pagamentos e acesso da sua equipe.</Text>
            <View style={styles.sideFooter}>
              <IconSymbol name="lock.fill" size={14} color="#E0E5FF" />
              <Text style={styles.sideFooterText}>Atualizado com segurança</Text>
            </View>
          </ImageBackground>

          <View style={[styles.mainPanel, width < 760 && styles.mainPanelMobile]}>
            <Text style={styles.managerName}>{displayedPlan || "Professional"}</Text>
            <Text style={styles.managerStatus}>{statusLabels[displayedStatus] ?? displayedStatus}</Text>

            {upgradeBanner && (
              <View style={styles.upgradeBanner}>
                <View style={styles.upgradeBannerHeader}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color="#0F172A" />
                  <Text style={styles.upgradeBannerTitle}>Upgrade aplicado</Text>
                  <Pressable onPress={() => setUpgradeBanner(null)} style={styles.upgradeBannerClose}>
                    <Text style={styles.upgradeBannerCloseText}>×</Text>
                  </Pressable>
                </View>
                <Text style={styles.upgradeBannerText}>
                  {upgradeBanner.planName} · {money(upgradeBanner.amount)} {upgradeBanner.cycle === "YEARLY" ? "/ ano" : "/ mês"}
                </Text>
                {upgradeBanner.nextBillingAt && (
                  <Text style={styles.upgradeBannerHint}>Próxima cobrança em {formatDate(upgradeBanner.nextBillingAt)}.</Text>
                )}
              </View>
            )}

            {displayedStatus === "trialing" && (
              <Text style={styles.managerMeta}>{daysRemaining(liveSubscription?.trial_ends_at ?? subscription?.trialEndsAt ?? null)} dias restantes de trial</Text>
            )}

            {isPaidPlan && (
              <View style={styles.activePlanCard}>
                <View style={styles.activePlanRow}>
                  <Text style={styles.activePlanLabel}>Plano</Text>
                  <Text style={styles.activePlanValue}>{displayedPlan}</Text>
                </View>
                <View style={styles.activePlanRow}>
                  <Text style={styles.activePlanLabel}>Valor</Text>
                  <Text style={styles.activePlanValue}>
                    {money(liveSubscription?.amount ?? subscription?.amount)}
                    {(liveSubscription as any)?.cycle === "YEARLY" || subscription?.cycle === "YEARLY" ? " / ano" : " / mês"}
                  </Text>
                </View>
                <View style={styles.activePlanRow}>
                  <Text style={styles.activePlanLabel}>Último pagamento</Text>
                  <Text style={styles.activePlanValue}>
                    {formatDate(lastPayment?.paid_at ?? lastPayment?.paymentDate ?? lastPayment?.due_at ?? lastPayment?.dueDate)}
                  </Text>
                </View>
                <View style={styles.activePlanRow}>
                  <Text style={styles.activePlanLabel}>Próximo vencimento</Text>
                  <Text style={styles.activePlanValue}>{formatDate(paymentDueDate)}</Text>
                </View>
                {invoiceUrl && (
                  <Pressable
                    onPress={() => {
                      try {
                        const { Linking } = require("react-native");
                        Linking.openURL(invoiceUrl);
                      } catch {
                        setBillingMessage("Não foi possível abrir o comprovante.");
                      }
                    }}
                    style={styles.invoiceButton}
                  >
                    <IconSymbol name="doc.text" size={14} color="#070B12" />
                    <Text style={styles.invoiceButtonText}>Emitir comprovante de pagamento</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable onPress={handleLogout} disabled={loggingOut} style={styles.logoutAction}>
              {loggingOut ? (
                <ActivityIndicator size="small" color="#F87171" />
              ) : (
                <Text style={styles.logoutActionText}>Sair</Text>
              )}
            </Pressable>

            {showUpgradeButton && !paymentConfirmed && (
              <Pressable onPress={() => setShowUpgradeOptions((v) => !v)} style={styles.toggleButton}>
                <Text style={styles.toggleButtonText}>{showUpgradeOptions ? "Ocultar opções" : "Fazer upgrade"}</Text>
              </Pressable>
            )}

            {showUpgradeOptions && (() => {
              const currentPlanId = (liveSubscription as any)?.plan_id ?? subscription?.plan_id ?? null;
              const currentPlanData = plans.find((p) => p.id === currentPlanId);
              const currentMonthlyAmount = currentPlanData ? Number(currentPlanData.monthly_amount ?? 0) : 0;
              const currentCycle = ((liveSubscription as any)?.cycle ?? subscription?.cycle ?? "MONTHLY") as "MONTHLY" | "YEARLY";
              const currentBillingType = ((liveSubscription as any)?.billing_type ?? subscription?.billing_type ?? "PIX") as "PIX" | "CREDIT_CARD";
              const billingTypeChanged = currentBillingType !== billingType;

              const visiblePlans = plans.filter((plan) => {
                if (plan.id === currentPlanId && currentCycle === (billingCycle === "annual" ? "YEARLY" : "MONTHLY")) {
                  return currentBillingType !== billingType;
                }
                return true;
              });

              const upgradePlans = visiblePlans.filter((plan) => Number(plan.monthly_amount) > currentMonthlyAmount + 0.01).slice(0, 3);
              const cycleChangePlans = visiblePlans.filter((plan) => {
                if (plan.id !== currentPlanId) return false;
                if (currentCycle !== (billingCycle === "annual" ? "YEARLY" : "MONTHLY")) return true;
                return currentBillingType !== billingType;
              });


              const renderPlanCard = (plan: BillingPlan, variant: "upgrade" | "cycle" | "downgrade") => {
                const index = upgradePlans.findIndex((p) => p.id === plan.id);
                const isSelected = selectedPlanId === plan.id;
                const isRecommended = variant === "upgrade" && index === 1;
                const price = Number(billingCycle === "monthly" ? plan.monthly_amount : plan.annual_amount);
                const ctaLabel =
                  variant === "upgrade"
                    ? isSelected ? "SELECIONADO" : "FAZER UPGRADE"
                    : variant === "cycle"
                      ? isSelected ? "SELECIONADO" : billingCycle === "annual" ? "MIGRAR PARA ANUAL" : "MIGRAR PARA MENSAL"
                      : isSelected ? "SELECIONADO" : "SOLICITAR DOWNGRADE";
                return (
                  <Pressable
                    key={`${variant}-${plan.id}`}
                    onPress={() => setSelectedPlanId(plan.id)}
                    disabled={variant === "downgrade"}
                    style={[
                      styles.planCard,
                      isRecommended && styles.planCardRecommended,
                      isSelected && styles.planCardSelected,
                      variant === "downgrade" && styles.planCardMuted,
                    ]}
                  >
                    {isRecommended && (
                      <View style={styles.recoBadge}>
                        <Text style={styles.recoBadgeText}>RECOMENDADO</Text>
                      </View>
                    )}
                    <View style={styles.planIcon}>
                      <IconSymbol
                        name={variant === "upgrade" ? (index === 0 ? "shield" : index === 1 ? "star.fill" : "bolt.fill") : "arrow.left.arrow.right"}
                        size={18}
                        color={isSelected ? "#FACC15" : "#D9FF3F"}
                      />
                    </View>
                    <Text style={styles.planName}>{plan.name.toUpperCase()}</Text>
                    <Text style={styles.planPrice}>{money(price)}</Text>
                    <Text style={styles.planPriceHint}>{billingCycle === "monthly" ? "por mês" : "por ano"}</Text>
                    <Pressable
                      disabled={variant === "downgrade"}
                      onPress={() => {
                        setSelectedPlanId(plan.id);
                        setCheckoutOpen(true);
                        setBillingMessage(null);
                      }}
                      style={[styles.planButton, isSelected && styles.planButtonSelected]}
                    >
                      <Text style={[styles.planButtonText, isSelected && styles.planButtonTextSelected]}>{ctaLabel}</Text>
                    </Pressable>
                  </Pressable>
                );
              };

              return (
              <View style={styles.optionsWrap}>
                <View style={[styles.billingToggle, width < 760 && styles.billingToggleMobile]}>
                  <Pressable
                    onPress={() => setBillingCycle("monthly")}
                    style={[styles.billingOption, billingCycle === "monthly" && styles.billingOptionActive]}
                  >
                    <Text style={[styles.billingOptionText, billingCycle === "monthly" && styles.billingOptionTextActive]}>Mensal</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setBillingCycle("annual")}
                    style={[styles.billingOption, billingCycle === "annual" && styles.billingOptionActive]}
                  >
                    <Text style={[styles.billingOptionText, billingCycle === "annual" && styles.billingOptionTextActive]}>Anual</Text>
                  </Pressable>
                </View>

                {billingTypeChanged && (
                  <Text style={styles.billingTypeWarn}>
                    Trocar para {billingType === "PIX" ? "PIX" : "Cartão de crédito"} requer cancelar e recriar a assinatura. A nova cobrança será gerada imediatamente.
                  </Text>
                )}

                {upgradePlans.length > 0 && (
                  <View>
                    <Text style={styles.optionsSectionTitle}>Opções de upgrade</Text>
                    <View style={[styles.planGrid, width < 760 && styles.planGridMobile]}>
                      {upgradePlans.map((plan) => renderPlanCard(plan, "upgrade"))}
                    </View>
                  </View>
                )}

                {cycleChangePlans.length > 0 && (
                  <View>
                    <Text style={styles.optionsSectionTitle}>
                      {billingCycle === "annual" ? "Migrar para anual" : "Migrar para mensal"}
                    </Text>
                    <View style={[styles.planGrid, width < 760 && styles.planGridMobile]}>
                      {cycleChangePlans.map((plan) => renderPlanCard(plan, "cycle"))}
                    </View>
                  </View>
                )}



                {upgradePlans.length === 0 && cycleChangePlans.length === 0 && (
                  <Text style={styles.optionsEmptyText}>Nenhuma alteração disponível para o seu plano atual.</Text>
                )}
              </View>
              );
            })()}

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoCardTitle}>Dados da empresa</Text>
                <Pressable onPress={openEdit} style={styles.editDataButton}>
                  <IconSymbol name="pencil" size={14} color="#D9FF3F" />
                  <Text style={styles.editDataButtonText}>Editar dados</Text>
                </Pressable>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Nome da empresa</Text>
                <Text style={styles.infoValue}>{company?.name ?? state.companyName ?? "Não informado"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>CNPJ/CPF</Text>
                <Text style={styles.infoValue}>{company?.document ?? "Não informado"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Telefone</Text>
                <Text style={styles.infoValue}>{company?.phone ?? "Não informado"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Endereço</Text>
                <Text style={styles.infoValue}>{company?.address ?? "Não informado"}</Text>
              </View>
              <View style={styles.splitRow}>
                <View style={styles.splitCell}>
                  <Text style={styles.infoKey}>Cidade</Text>
                  <Text style={styles.infoValue}>{company?.city ?? "—"}</Text>
                </View>
                <View style={styles.splitCell}>
                  <Text style={styles.infoKey}>UF</Text>
                  <Text style={styles.infoValue}>{company?.state ?? "—"}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {editOpen && (
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Atualizar dados da empresa</Text>
            <View style={{ gap: 7 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nome da empresa</Text>
                <TextInput value={editName} onChangeText={setEditName} placeholder="Nome da empresa" placeholderTextColor={colors.muted} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>CNPJ/CPF</Text>
                <TextInput value={editDocument} onChangeText={(value) => setEditDocument(onlyDigits(value, 14))} placeholder="00000000000000" placeholderTextColor={colors.muted} keyboardType="numeric" maxLength={14} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Telefone</Text>
                <TextInput value={editPhone} onChangeText={(value) => setEditPhone(onlyDigits(value, 11))} placeholder="11988889999" placeholderTextColor={colors.muted} keyboardType="numeric" maxLength={11} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Endereço</Text>
                <TextInput value={editAddress} onChangeText={setEditAddress} placeholder="Rua, número, complemento" placeholderTextColor={colors.muted} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>CEP</Text>
                <TextInput value={editPostalCode} onChangeText={(value) => setEditPostalCode(onlyDigits(value, 8))} onBlur={handleEditCepBlur} placeholder={editCepLoading ? "Consultando..." : "00000000"} placeholderTextColor={colors.muted} keyboardType="numeric" maxLength={8} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ width: 100 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Número</Text>
                  <TextInput value={editAddressNumber} onChangeText={(value) => setEditAddressNumber(onlyDigits(value, 8))} placeholder="123" placeholderTextColor={colors.muted} keyboardType="numeric" maxLength={8} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Complemento</Text>
                  <TextInput value={editAddressComplement} onChangeText={setEditAddressComplement} placeholder="Apto, bloco..." placeholderTextColor={colors.muted} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Cidade</Text>
                  <TextInput value={editCity} onChangeText={setEditCity} placeholder="São Paulo" placeholderTextColor={colors.muted} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>UF</Text>
                  <TextInput value={editState} onChangeText={setEditState} placeholder="SP" placeholderTextColor={colors.muted} maxLength={2} style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]} />
                </View>
              </View>
              {editError && <Text style={{ color: "#F87171", fontSize: 13, fontWeight: "800" }}>{editError}</Text>}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setEditOpen(false)} style={[styles.modalButton, { borderColor: colors.border }]}>
                  <Text style={[styles.modalButtonText, { color: colors.foreground }]}>Cancelar</Text>
                </Pressable>
                <Pressable disabled={editSaving} onPress={saveCompany} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>{editSaving ? "Salvando..." : "Salvar"}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
      {(checkoutOpen || showPixQr) && !paymentConfirmed && (
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.72)" }]}>
          <View style={styles.checkoutCard}>
            <View style={styles.checkoutHeader}>
              <View style={styles.checkoutBrand}>
                <View style={styles.checkoutBrandMark} />
                <Text style={styles.checkoutTitle}>CHECKOUT</Text>
              </View>
              <Pressable onPress={() => { setCheckoutOpen(false); setShowPixQr(false); }} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.checkoutAmount}>{money(selectedPlanPrice)}</Text>
            <Text style={styles.checkoutMeta}>vence em {formatDate(paymentDueDate)}</Text>

            <View style={styles.checkoutTabs}>
              <Pressable
                onPress={() => setBillingType("PIX")}
                style={[styles.checkoutTab, billingType === "PIX" && styles.checkoutTabActive]}
              >
                <Text style={[styles.checkoutTabText, billingType === "PIX" && styles.checkoutTabTextActive]}>PIX</Text>
              </Pressable>
              <Pressable
                onPress={() => setBillingType("CREDIT_CARD")}
                style={[styles.checkoutTab, billingType === "CREDIT_CARD" && styles.checkoutTabActive]}
              >
                <Text style={[styles.checkoutTabText, billingType === "CREDIT_CARD" && styles.checkoutTabTextActive]}>CARTÃO DE CRÉDITO</Text>
              </Pressable>
            </View>

            {billingMessage && (
              <Text style={styles.checkoutMessage}>{billingMessage}</Text>
            )}

            {billingType === "PIX" ? (
              <>
                {showPixQr ? (
                  <>
                    <Text style={styles.pixHint}>Escaneie o QR Code ou copie o código abaixo para pagamento instantâneo.</Text>
                    <View style={styles.qrBox}>
                      {pixQr?.encodedImage ? (
                        <Image source={{ uri: `data:image/png;base64,${pixQr.encodedImage}` }} style={styles.qrImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.qrPlaceholder} />
                      )}
                    </View>
                    <Text style={styles.validBadge}>✓ Valido até: {pixQr?.expirationDate ? new Date(pixQr.expirationDate).toLocaleString("pt-BR") : "—"}</Text>
                    <View style={styles.pixCodeRow}>
                      <Text numberOfLines={3} ellipsizeMode="tail" style={styles.pixCode}>{pixQr?.payload ?? "00020101021226850014BR.GOV.BCB.PIX..."}</Text>
                      <Pressable
                        onPress={async () => {
                          try {
                            await copyToClipboard(String(pixQr?.payload ?? ""));
                            setBillingMessage("Código PIX copiado.");
                          } catch {
                            setBillingMessage("Não foi possível copiar o código PIX.");
                          }
                        }}
                        style={styles.copyButton}
                      >
                        <Text style={styles.copyButtonText}>Copiar</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={refreshPixQr} style={styles.secondaryAction} disabled={pixQrRefreshing}>
                      <Text style={styles.secondaryActionText}>{pixQrRefreshing ? "Verificando..." : "Gerar novo código"}</Text>
                    </Pressable>
                    <Pressable onPress={refreshAccount} style={styles.secondaryAction}>
                      <Text style={styles.secondaryActionText}>Atualizar status do pagamento</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.pixHint}>O PIX será gerado usando os dados da empresa cadastrada.</Text>
                    <Pressable
                      disabled={submitting}
                      onPress={async () => {
                        setBillingMessage(null);
                        await handleSubscribe();
                      }}
                      style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
                    >
                      <Text style={styles.confirmButtonText}>{submitting ? "GERANDO PIX..." : "GERAR PIX"}</Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.pixHint}>Seus dados serão enviados criptografados ao Asaas.</Text>
                <TextInput style={styles.fieldInput} placeholder="Número do cartão" value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" maxLength={19} />
                <TextInput style={styles.fieldInput} placeholder="Nome no cartão" value={cardHolderName} onChangeText={setCardHolderName} autoCapitalize="words" />
                <View style={styles.cardRow}>
                  <TextInput style={[styles.fieldInput, styles.fieldHalf]} placeholder="MM" value={cardExpiryMonth} onChangeText={setCardExpiryMonth} keyboardType="numeric" maxLength={2} />
                  <TextInput style={[styles.fieldInput, styles.fieldHalf]} placeholder="AAAA" value={cardExpiryYear} onChangeText={setCardExpiryYear} keyboardType="numeric" maxLength={4} />
                  <TextInput style={[styles.fieldInput, styles.fieldHalf]} placeholder="CVV" value={cardCcv} onChangeText={setCardCcv} keyboardType="numeric" maxLength={4} />
                </View>
                <TextInput style={styles.fieldInput} placeholder="CPF" value={cardHolderCpfCnpj} onChangeText={setCardHolderCpfCnpj} keyboardType="numeric" maxLength={14} />
                <TextInput style={styles.fieldInput} placeholder="Telefone" value={cardHolderPhone} onChangeText={setCardHolderPhone} keyboardType="numeric" maxLength={15} />
                <Pressable
                  onPress={handleSubscribe}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>PAGAR {money(selectedPlanPrice)}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
      {paymentConfirmed && (
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.72)" }]}>
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutTitle}>Pagamento confirmado!</Text>
            <Text style={styles.checkoutMeta}>Seu plano já está ativo e pronto para uso.</Text>
            <Pressable onPress={() => setPaymentConfirmed(false)} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>ENTENDI</Text>
            </Pressable>
          </View>
        </View>
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  page: { flexGrow: 1, minHeight: "100%", backgroundColor: "#02070B", paddingVertical: 32, paddingHorizontal: 26 },
  pageMobile: { paddingVertical: 20, paddingHorizontal: 16 },
  hudShell: { width: "100%", maxWidth: 980, alignSelf: "center", flexDirection: "row", alignItems: "stretch", gap: 20 },
  hudShellMobile: { flexDirection: "column", gap: 16 },
  sidePanel: {
    width: 250,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  sidePanelMobile: { width: "100%", minHeight: 320 },
  sidePanelImage: {
    borderRadius: 18,
  },
  sidePanelImageMobile: { borderRadius: 18 },
  sidePanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 11, 18, 0.68)",
    borderRadius: 18,
  },
  sideTag: {
    color: "#E0E5FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    position: "relative",
    zIndex: 1,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  sideTitle: { color: "#FFFFFF", fontSize: 33, fontWeight: "900", letterSpacing: -0.8, lineHeight: 38, position: "relative", zIndex: 1 },
  sideText: { color: "#E8EEFF", fontSize: 13, lineHeight: 20, marginTop: 12, position: "relative", zIndex: 1 },
  sideFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, position: "relative", zIndex: 1 },
  sideFooterText: { color: "#E8EEFF", fontSize: 11, fontWeight: "800" },
  mainPanel: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#070B12",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 16,
  },
  mainPanelMobile: { paddingHorizontal: 14, paddingVertical: 14 },
  managerName: { color: "#F5F5F5", fontSize: 18, fontWeight: "900" },
  managerStatus: { color: "#34D399", fontSize: 13, fontWeight: "800" },
  managerMeta: { color: "#D1D5DB", fontSize: 12 },
  logoutAction: {
    width: "100%",
    maxWidth: 180,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutActionText: { color: "#FCA5A5", fontSize: 12, fontWeight: "800" },
  toggleButton: {
    width: "100%",
    maxWidth: 220,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonText: { color: "#E5E7EB", fontSize: 11, fontWeight: "800" },
  optionsWrap: { gap: 18 },
  billingToggle: { flexDirection: "row", justifyContent: "center", gap: 12 },
  billingToggleMobile: { alignSelf: "stretch" },
  billingOption: {
    minWidth: 110,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0D1117",
    alignItems: "center",
    justifyContent: "center",
  },
  billingOptionActive: { backgroundColor: "#FACC15", borderColor: "#FACC15" },
  billingOptionText: { color: "#F3F4F6", fontSize: 11, fontWeight: "900" },
  billingOptionTextActive: { color: "#070B12" },
  planGrid: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  planGridMobile: { flexDirection: "column", gap: 14 },
  planCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: 14,
    backgroundColor: "#0A0F14",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    alignItems: "center",
    position: "relative",
  },
  planCardRecommended: { borderColor: "#FACC15", borderWidth: 2 },
  planCardSelected: { borderColor: "#FACC15", backgroundColor: "#0B0F14" },
  recoBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: [{ translateX: -50 }],
    backgroundColor: "#FACC15",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recoBadgeText: { color: "#070B12", fontSize: 9, fontWeight: "900" },
  planIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  planName: { color: "#F3F4F6", fontSize: 18, fontWeight: "900" },
  planPrice: { color: "#F3F4F6", fontSize: 27, fontWeight: "900", marginTop: 10 },
  planPriceHint: { color: "#9CA3AF", fontSize: 10, marginTop: 2 },
  planLimit: { color: "#9CA3AF", fontSize: 10, marginTop: 4 },
  planDivider: { height: 1, width: "100%", backgroundColor: "rgba(255,255,255,0.12)", marginTop: 16, marginBottom: 12 },
  featureList: { width: "100%", gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: "#F3F4F6", fontSize: 11, lineHeight: 18, flexShrink: 1 },
  planButton: {
    width: "100%",
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  planButtonSelected: { backgroundColor: "#F3F4F6", borderColor: "#F3F4F6" },
  planButtonText: { color: "#F3F4F6", fontSize: 10, fontWeight: "900" },
  planButtonTextSelected: { color: "#070B12" },
  summaryCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.7)",
    backgroundColor: "#0A0F14",
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  summaryTitle: { color: "#F3F4F6", fontSize: 15, fontWeight: "900" },
  summaryText: { color: "#D1D5DB", fontSize: 12, textAlign: "center" },
  summaryPromo: { color: "#FACC15", fontSize: 11, fontWeight: "900" },
  finalButton: {
    width: "100%",
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#FACC15",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  finalButtonText: { color: "#070B12", fontSize: 12, fontWeight: "900" },
  summaryTrial: { color: "#9CA3AF", fontSize: 10 },
  infoCard: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0B0F14",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoCardTitle: { color: "#F3F4F6", fontSize: 13, fontWeight: "800" },
  editDataButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 7, borderRadius: 7, borderWidth: 1, borderColor: "rgba(217,255,63,0.35)" },
  editDataButtonText: { color: "#D9FF3F", fontSize: 11, fontWeight: "800" },
  infoLabel: { color: "#D1D5DB", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  editLink: { color: "#8AB4FF", fontSize: 12, fontWeight: "800" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 30,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  infoKey: { color: "#9CA3AF", fontSize: 11 },
  infoValue: { color: "#F3F4F6", fontSize: 11, fontWeight: "700", textAlign: "right", maxWidth: "58%" },
  splitRow: { flexDirection: "row", gap: 8 },
  splitCell: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  verifyPhoneButton: { alignSelf: "flex-start", marginTop: 6 },
  verifyPhoneText: { color: "#D9FF3F", fontSize: 11, fontWeight: "800" },
  phoneCodeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  phoneCodeInput: { flex: 1 },
  actionsInline: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 4 },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cancelButtonText: { color: "#F3F4F6", fontSize: 11, fontWeight: "800" },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  saveButtonText: { color: "#070B12", fontSize: 11, fontWeight: "900" },
  modalScroll: { width: "100%", maxWidth: 520, maxHeight: "92%" },
  modalContent: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  modalTitle: { fontSize: 15, fontWeight: "800", marginBottom: 8 },
  modalButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: { fontSize: 12, fontWeight: "800" },
  modalBackdrop: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.72)", padding: 24 },
  checkoutCard: { width: "100%", maxWidth: 420, borderRadius: 14, borderWidth: 1, borderColor: "rgba(250,204,21,0.7)", backgroundColor: "#070B12", padding: 18, gap: 12 },
  checkoutHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  checkoutBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkoutBrandMark: { width: 10, height: 10, backgroundColor: "#FACC15", borderRadius: 3 },
  checkoutTitle: { color: "#F3F4F6", fontSize: 15, fontWeight: "900" },
  closeButton: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  closeButtonText: { color: "#F3F4F6", fontSize: 20, lineHeight: 20 },
  checkoutAmount: { color: "#F3F4F6", fontSize: 17, fontWeight: "900", textAlign: "center" },
  checkoutMeta: { color: "#9CA3AF", fontSize: 11, textAlign: "center" },
  checkoutTabs: { flexDirection: "row", gap: 8 },
  checkoutTab: { flex: 1, minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#0D1117", alignItems: "center", justifyContent: "center" },
  checkoutTabActive: { backgroundColor: "#FACC15", borderColor: "#FACC15" },
  checkoutTabText: { color: "#F3F4F6", fontSize: 11, fontWeight: "900" },
  checkoutTabTextActive: { color: "#070B12" },
  checkoutMessage: { color: "#FACC15", fontSize: 11, lineHeight: 16, textAlign: "center", fontWeight: "700" },
  upgradeBanner: { borderRadius: 12, borderWidth: 1, borderColor: "#34D399", backgroundColor: "rgba(52, 211, 153, 0.12)", paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  upgradeBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  upgradeBannerTitle: { color: "#34D399", fontSize: 13, fontWeight: "900", flex: 1 },
  upgradeBannerClose: { width: 22, height: 22, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  upgradeBannerCloseText: { color: "#34D399", fontSize: 16, lineHeight: 16, fontWeight: "900" },
  upgradeBannerText: { color: "#F3F4F6", fontSize: 12, fontWeight: "800" },
  upgradeBannerHint: { color: "#A7F3D0", fontSize: 11 },
  optionsSectionTitle: { color: "#FACC15", fontSize: 12, fontWeight: "900", letterSpacing: 0.6, marginBottom: 8 },
  optionsEmptyText: { color: "#9CA3AF", fontSize: 12, textAlign: "center", paddingVertical: 12 },
  planCardMuted: { opacity: 0.55 },
  billingTypeWarn: { color: "#FACC15", fontSize: 11, lineHeight: 16, textAlign: "center", fontWeight: "700", paddingHorizontal: 8 },
  pixHint: { color: "#D1D5DB", fontSize: 12, textAlign: "center" },
  fieldInput: { height: 44, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#0D1117", color: "#F3F4F6", paddingHorizontal: 12 },
  cardRow: { width: "100%", flexDirection: "row", gap: 8 },
  fieldHalf: { flex: 1, minWidth: 0, width: 0 },
  confirmButton: { minHeight: 44, borderRadius: 8, backgroundColor: "#FACC15", alignItems: "center", justifyContent: "center", marginTop: 4 },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: "#070B12", fontSize: 13, fontWeight: "900" },
  qrBox: { width: 170, height: 170, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qrImage: { width: 150, height: 150, borderRadius: 8 },
  qrPlaceholder: { width: 130, height: 130, backgroundColor: "#E5E7EB" },
  validBadge: { color: "#34D399", fontSize: 11, textAlign: "center" },
  pixCodeRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  pixCode: { flex: 1, minWidth: 0, color: "#F3F4F6", fontSize: 10, lineHeight: 14, backgroundColor: "#0D1117", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, overflow: "hidden" },
  copyButton: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  copyButtonText: { color: "#F3F4F6", fontSize: 11, fontWeight: "900" },
  secondaryAction: { minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  secondaryActionText: { color: "#F3F4F6", fontSize: 11, fontWeight: "900" },
  activePlanCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
    backgroundColor: "#0B1410",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  activePlanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 28,
  },
  activePlanLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "700" },
  activePlanValue: { color: "#F3F4F6", fontSize: 11, fontWeight: "800", textAlign: "right", maxWidth: "60%" },
  invoiceButton: {
    marginTop: 8,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(217,255,63,0.35)",
    backgroundColor: "rgba(217,255,63,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  invoiceButtonText: { color: "#D9FF3F", fontSize: 11, fontWeight: "800" },
});
