import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import * as SupabaseService from "@/lib/supabase-service";
import {
  clearProfessionalSession,
  getProfessionalSession,
  setProfessionalSession,
  type ProfessionalSession,
} from "@/lib/professional-session";
import type { CatalogItem, CompanySubscription } from "@/lib/supabase-service";

export type Role = "empresa" | "funcionario";
export type OrderStatus = "Pendente" | "Em andamento" | "Concluída" | "Cancelada";
export type Priority = "Alta" | "Média" | "Baixa";

export type Client = { id: string; name: string; contact: string; city: string; document?: string; street?: string; number?: string; neighborhood?: string; state?: string; address?: string; observation?: string; referencePoint?: string };
export type Employee = {
  id: string;
  name: string;
  role: string;
  initials: string;
  activeOrders: number;
  email?: string;
};
export type ServiceEvidence = { id: string; uri: string; createdAt: string };
export type ServiceArrival = { latitude: number; longitude: number; registeredAt: string; distanceMeters?: number };
export type CustomerApproval = { name: string; signaturePath: string; acceptedAt: string };
export type AbsentClient = { reason: string; photoUri?: string; registeredAt: string };

export type ServiceOrder = {
  id: string;
  createdAt?: string;
  title: string;
  clientId: string;
  employeeId: string;
  status: OrderStatus;
  priority: Priority;
  date: string;
  time: string;
  value: number;
  description: string;
  address: string;
  notes: string;
  startedAt?: string;
  completedAt?: string;
  evidences?: ServiceEvidence[];
  arrival?: ServiceArrival;
  approval?: CustomerApproval;
  absentClient?: AbsentClient;
  cancellationReason?: string;
};

type AppState = {
  role: Role;
  membership: "owner" | "employee" | null;
  currentEmployeeId: string;
  professionalName: string | null;
  orders: ServiceOrder[];
  clients: Client[];
  employees: Employee[];
  companyId: string | null;
  companyName: string | null;
  catalog: CatalogItem[];
  subscription: CompanySubscription | null;
  loading: boolean;
};

const STORAGE_KEY = "gestor-os-state-v4";

const defaultState: AppState = {
  role: "empresa",
  membership: null,
  currentEmployeeId: "",
  professionalName: null,
  orders: [],
  clients: [],
  employees: [],
  companyId: null,
  companyName: null,
  catalog: [],
  subscription: null,
  loading: true,
};

let state: AppState = { ...defaultState };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  persistState();
  emit();
}

async function persistState() {
  try {
    const payload = {
      role: state.role,
      membership: state.membership,
      currentEmployeeId: state.currentEmployeeId,
      professionalName: state.professionalName,
      companyId: state.companyId,
      companyName: state.companyName,
      catalog: state.catalog,
      orders: state.orders,
      clients: state.clients,
      employees: state.employees,
      subscription: state.subscription,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

async function loadPersistedState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<AppState>;
    setState((prev) => ({ ...prev, ...saved, loading: true }));
  } catch {
    // ignore
  }
}

async function loadCompanyData(companyId: string, companyCreatedAt?: string | null) {
  const resolvedCreatedAt = companyCreatedAt ?? (await SupabaseService.getCompanyById(companyId))?.createdAt;
  const [clients, employees, orders, catalog, subscription] = await Promise.all([
    SupabaseService.listClients(companyId),
    SupabaseService.listEmployees(companyId),
    SupabaseService.listOrders(companyId),
    SupabaseService.listCatalog(companyId),
    SupabaseService.getCompanySubscription(companyId, resolvedCreatedAt),
  ]);
  return { clients, employees, orders, catalog, subscription };
}

async function loadEmployeeScopedData(companyId: string, employeeId: string) {
  const [orders, allClients, allEmployees, subscription, company] = await Promise.all([
    SupabaseService.listOrders(companyId, { employeeId }),
    SupabaseService.listClients(companyId),
    SupabaseService.listEmployees(companyId),
    SupabaseService.getCompanySubscription(companyId),
    SupabaseService.getCompanyById(companyId),
  ]);
  const resolvedSubscription = company?.createdAt || company?.created_at
    ? await SupabaseService.getCompanySubscription(companyId, company.createdAt ?? company.created_at)
    : subscription;
  const clientIds = new Set(orders.map((order: ServiceOrder) => order.clientId).filter(Boolean));
  return {
    orders,
    clients: allClients.filter((client: Client) => clientIds.has(client.id)),
    employees: allEmployees,
    catalog: await SupabaseService.listCatalog(companyId),
    subscription: resolvedSubscription,
  };
}

async function applyProfessionalSession(session: ProfessionalSession) {
  const data = await loadEmployeeScopedData(session.companyId, session.employeeId);
  setState((prev) => ({
    ...prev,
    role: "funcionario",
    membership: "employee",
    currentEmployeeId: session.employeeId,
    professionalName: session.name,
    companyId: session.companyId,
    companyName: session.companyName,
    ...data,
    loading: false,
  }));
}

async function bootstrap() {
  const professional = await getProfessionalSession();
  if (professional) {
    await applyProfessionalSession(professional);
    return;
  }

  const user = await SupabaseService.getCurrentUser();
  if (!user) {
    setState((prev) => ({
      ...prev,
      membership: null,
      currentEmployeeId: "",
      professionalName: null,
      loading: false,
    }));
    return;
  }

  await SupabaseService.ensureProfile(user.id, user.email ?? null, "user");

  const ownedCompany = await SupabaseService.getCompanyByUserId(user.id);
  if (ownedCompany?.id) {
    const data = await loadCompanyData(ownedCompany.id, ownedCompany.createdAt ?? ownedCompany.created_at);
    setState((prev) => ({
      ...prev,
      role: "empresa",
      membership: "owner",
      currentEmployeeId: "",
      professionalName: null,
      companyId: ownedCompany.id,
      companyName: ownedCompany.name ?? null,
      ...data,
      loading: false,
    }));
    return;
  }

  setState((prev) => ({
    ...prev,
    membership: null,
    companyId: null,
    companyName: null,
    professionalName: null,
    loading: false,
  }));
}

if (process.env.NODE_ENV !== "test") {
  void loadPersistedState();
  void bootstrap();
}

export const store = {
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setRole: (role: Role) => setState((prev) => ({ ...prev, role })),
  setCurrentEmployee: (id: string) => setState((prev) => ({ ...prev, currentEmployeeId: id })),
  setCompanyContext: (companyId: string, companyName?: string | null, role: Role = "empresa") =>
    setState((prev) => ({
      ...prev,
      companyId,
      companyName: companyName ?? prev.companyName,
      role,
      membership: role === "empresa" ? "owner" : "employee",
    })),
  setSubscription: (subscription: CompanySubscription | null) => setState((prev) => ({ ...prev, subscription })),
  bootstrap,
  loginProfessional: async (input: { companyId: string; email: string; password: string }) => {
    const session = await SupabaseService.loginProfessionalCredentials(input);
    await setProfessionalSession(session);
    await applyProfessionalSession(session);
    return session;
  },
  logoutProfessional: async () => {
    await clearProfessionalSession();
    setState(() => ({ ...defaultState, loading: false }));
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    const now = new Date().toISOString();
    const currentOrder = state.orders.find((order) => order.id === orderId);
    const startedAt = status === "Em andamento" ? (currentOrder?.startedAt ?? now) : currentOrder?.startedAt;
    const completedAt = status === "Concluída" || status === "Cancelada" ? (currentOrder?.completedAt ?? now) : currentOrder?.completedAt;
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) => (order.id === orderId ? {
        ...order,
        status,
        startedAt,
        completedAt,
      } : order)),
    }));
    if (state.companyId) {
      await SupabaseService.updateOrderStatus(orderId, status, now, startedAt, completedAt);
    }
  },
  addEvidence: async (orderId: string, uri: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              evidences: [{ id: `ev-${Date.now()}`, uri, createdAt: new Date().toLocaleString("pt-BR") }, ...(order.evidences ?? [])],
            }
          : order
      ),
    }));
    if (state.companyId) {
      await SupabaseService.addEvidence(orderId, uri);
    }
  },
  registerArrival: async (orderId: string, latitude: number, longitude: number) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) =>
        order.id === orderId
          ? { ...order, arrival: { latitude, longitude, registeredAt: new Date().toISOString() } }
          : order
      ),
    }));
    if (state.companyId) {
      await SupabaseService.registerArrival(orderId, latitude, longitude);
    }
  },
  completeOrder: async (orderId: string, name: string, signaturePath: string) => {
    const completedAt = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "Concluída",
              startedAt: order.startedAt,
              completedAt,
              approval: { name, signaturePath, acceptedAt: new Date().toLocaleString("pt-BR") },
            }
          : order
      ),
    }));
    if (state.companyId) {
      await SupabaseService.submitApproval(orderId, name, signaturePath, completedAt);
    }
  },
  recordAbsence: async (orderId: string, reason: string, photoUri?: string) => {
    const completedAt = new Date().toISOString();
    const absentClient: AbsentClient = {
      reason,
      photoUri,
      registeredAt: new Date().toLocaleString("pt-BR"),
    };
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) =>
        order.id === orderId
          ? { ...order, status: "Concluída", startedAt: order.startedAt, completedAt, absentClient }
          : order
      ),
    }));
    if (state.companyId) {
      // Persist absence as a special approval with reason as name and no signature
      await SupabaseService.submitApproval(orderId, `[AUSENTE] ${reason}`, photoUri ?? "", completedAt);
    }
  },
  cancelOrder: async (orderId: string, reason: string) => {
    const completedAt = new Date().toISOString();
    const currentOrder = state.orders.find((order) => order.id === orderId);
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) =>
        order.id === orderId
          ? { ...order, status: "Cancelada", completedAt: order.completedAt ?? completedAt, cancellationReason: reason }
          : order
      ),
    }));
    if (state.companyId) {
      await SupabaseService.updateOrderStatus(orderId, "Cancelada", completedAt, currentOrder?.startedAt, completedAt);
      // Store reason in notes field via update
      await SupabaseService.updateOrderNotes(orderId, `[CANCELAMENTO] ${reason}`);
    }
  },
  addOrder: async (order: Omit<ServiceOrder, "id">) => {
    const id = `OS-${Date.now().toString(36).toUpperCase()}`;
    const newOrder = { ...order, id, createdAt: new Date().toISOString(), evidences: order.evidences ?? [] };
    setState((prev) => ({ ...prev, orders: [newOrder, ...prev.orders] }));
    if (state.companyId) {
      await SupabaseService.createOrder({
        ...newOrder,
        company_id: state.companyId,
      });
    }
  },
  refresh: async () => {
    if (!state.companyId) return;
    if (state.membership === "employee" && state.currentEmployeeId) {
      const data = await loadEmployeeScopedData(state.companyId, state.currentEmployeeId);
      setState((prev) => ({ ...prev, ...data }));
      return;
    }
    const data = await loadCompanyData(state.companyId);
    setState((prev) => ({ ...prev, ...data }));
  },
  addClient: async (client: Omit<Client, "id">) => {
    if (state.companyId) {
      const created = await SupabaseService.createClient(state.companyId, client);
      setState((prev) => ({ ...prev, clients: [created, ...prev.clients] }));
      return;
    }
    const id = `c-${Date.now()}`;
    setState((prev) => ({ ...prev, clients: [...prev.clients, { ...client, id }] }));
  },
  updateClient: async (client: Client) => {
    const updated = state.companyId
      ? await SupabaseService.updateClient(client.id, client)
      : client;
    setState((prev) => ({ ...prev, clients: prev.clients.map((item) => item.id === client.id ? updated : item) }));
    return updated;
  },
  addEmployee: async (employee: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
  }) => {
    if (!state.companyId) throw new Error("Empresa não carregada.");
    const created = await SupabaseService.createProfessionalByManager({
      companyId: state.companyId,
      name: employee.name,
      email: employee.email,
      password: employee.password,
      role: employee.role,
      phone: employee.phone,
    });
    const displayName = created.name ?? employee.name;
    const mapped: Employee = {
      id: created.id,
      name: displayName,
      email: created.email ?? employee.email,
      role: created.role ?? employee.role,
      initials: displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      activeOrders: 0,
    };
    setState((prev) => ({ ...prev, employees: [mapped, ...prev.employees] }));
    return mapped;
  },
  updateEmployee: async (employee: Employee & { password?: string }) => {
    const updated = await SupabaseService.updateEmployee(employee.id, { ...employee, email: employee.email ?? "" });
    const displayName = updated.name ?? employee.name;
    const mapped: Employee = {
      ...employee,
      name: displayName,
      email: updated.email ?? employee.email,
      role: updated.role ?? employee.role,
      initials: displayName.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
    };
    setState((prev) => ({ ...prev, employees: prev.employees.map((item) => item.id === employee.id ? mapped : item) }));
    return mapped;
  },
  addCatalogItem: async (item: Omit<CatalogItem, "id" | "active">) => {
    if (!state.companyId) throw new Error("Empresa não carregada.");
    const created = await SupabaseService.createCatalogItem(state.companyId, item);
    setState((prev) => ({ ...prev, catalog: [created, ...prev.catalog] }));
    return created;
  },
  updateCatalogItem: async (item: CatalogItem) => {
    if (!state.companyId) throw new Error("Empresa não carregada.");
    await SupabaseService.updateCatalogItem(state.companyId, item);
    setState((prev) => ({ ...prev, catalog: prev.catalog.map((current) => current.id === item.id ? item : current) }));
  },
};

export function useAppStore() {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
