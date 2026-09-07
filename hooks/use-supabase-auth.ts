import { useCallback, useEffect, useMemo, useState } from "react";
import * as SupabaseAuth from "@/lib/supabase-auth";
import { supabase } from "@/lib/supabase";

type AuthUser = SupabaseAuth.AuthUser;

export function useSupabaseAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const current = await SupabaseAuth.getCurrentUser();
      setUser(current);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to fetch user");
      setError(e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      const current = await SupabaseAuth.getCurrentUser();
      setUser(current);
      setLoading(false);
    });

    refresh();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  /** Login com email e senha */
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await SupabaseAuth.signInWithEmail(email, password);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Login falhou");
      setError(e);
      setLoading(false);
      throw e;
    }
  }, []);

  /** Cadastro com nome, email e senha */
  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await SupabaseAuth.signUpWithEmail(name, email, password);
      setLoading(false);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Cadastro falhou");
      setError(e);
      setLoading(false);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await SupabaseAuth.signOut();
      setUser(null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Logout falhou");
      setError(e);
      setLoading(false);
      throw e;
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh,
    loginWithEmail,
    register,
    logout,
  };
}
