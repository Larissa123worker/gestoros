import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getProfessionalSession } from "@/lib/professional-session";
import { useAppStore } from "@/lib/app-store";

/** Aceita sessão do gestor (Supabase Auth) ou do profissional (sessão local). */
export function useRequireAuth() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const state = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const [professionalReady, setProfessionalReady] = useState(false);
  const [hasProfessional, setHasProfessional] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getProfessionalSession();
      if (!cancelled) {
        setHasProfessional(!!session);
        setProfessionalReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.membership, state.currentEmployeeId]);

  const loading = authLoading || !professionalReady || state.loading;
  const isProfessional = hasProfessional || state.membership === "employee";
  const isAuthenticated = !!user || isProfessional;
  const accessBlocked = !!state.subscription && !["trialing", "active"].includes(state.subscription.status);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login" as any);
    } else if (accessBlocked && isProfessional) {
      router.replace("/login-profissional" as any);
    } else if (accessBlocked && state.membership === "owner" && pathname !== "/account") {
      router.replace("/(tabs)/account" as any);
    }
  }, [loading, isAuthenticated, accessBlocked, isProfessional, state.membership, pathname, router]);

  return {
    user,
    loading,
    isProfessional,
    isAuthenticated,
    accessBlocked,
  };
}
