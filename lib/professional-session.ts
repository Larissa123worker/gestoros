import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type ProfessionalSession = {
  employeeId: string;
  companyId: string;
  companyName: string | null;
  name: string;
  email: string;
  jobRole: string;
};

const STORAGE_KEY = "gestor-os-professional-session-v1";

async function writeSecure(raw: string | null) {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return;
    if (raw == null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, raw);
    return;
  }
  try {
    const SecureStore = await import("expo-secure-store");
    if (raw == null) await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await SecureStore.setItemAsync(STORAGE_KEY, raw);
  } catch {
    // fallback abaixo
  }
}

async function readSecure(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  }
  try {
    const SecureStore = await import("expo-secure-store");
    return SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function getProfessionalSession(): Promise<ProfessionalSession | null> {
  try {
    const raw = (await readSecure()) ?? (await AsyncStorage.getItem(STORAGE_KEY));
    if (!raw) return null;
    return JSON.parse(raw) as ProfessionalSession;
  } catch {
    return null;
  }
}

export async function setProfessionalSession(session: ProfessionalSession): Promise<void> {
  const raw = JSON.stringify(session);
  await writeSecure(raw);
  await AsyncStorage.setItem(STORAGE_KEY, raw);
}

export async function clearProfessionalSession(): Promise<void> {
  await writeSecure(null);
  await AsyncStorage.removeItem(STORAGE_KEY);
}
