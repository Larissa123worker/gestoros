import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "./supabase";

export type AuthUser = {
  id: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  emailConfirmedAt: string | null;
  lastSignedIn: Date;
};

const SESSION_KEY = "gestor-os-session";
const USER_KEY = "gestor-os-user";

export async function getSessionToken() {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setSessionToken(token: string) {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function removeSessionToken() {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getUserInfo() {
  const raw =
    Platform.OS === "web" && typeof localStorage !== "undefined"
      ? localStorage.getItem(USER_KEY)
      : null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    return { ...parsed, lastSignedIn: new Date(parsed.lastSignedIn) };
  } catch {
    return null;
  }
}

export async function setUserInfo(user: AuthUser) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export async function clearUserInfo() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
}

/** Login com email e senha */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Cadastro de novo usuário com nome, email e senha */
export async function signUpWithEmail(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });
  if (error) throw error;
  return data;
}

/** Encerra a sessão do usuário */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  await removeSessionToken();
  await clearUserInfo();
  if (error) throw error;
}

/** Retorna o usuário autenticado atual */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const user = data.user;
  if (!user) return null;

  return {
    id: user.id,
    openId: user.id,
    name: user.user_metadata?.full_name ?? user.email ?? null,
    email: user.email ?? null,
    loginMethod: "email",
    emailConfirmedAt: user.email_confirmed_at ?? null,
    lastSignedIn: new Date(user.last_sign_in_at ?? Date.now()),
  } as AuthUser;
}

export async function handleAuthCallback(url: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(url);
  if (error) throw error;
  const user = await getCurrentUser();
  if (user) await setUserInfo(user);
  return { session: data.session, user };
}
