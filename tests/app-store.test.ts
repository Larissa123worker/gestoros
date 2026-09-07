import { describe, expect, it } from "vitest";

import { store } from "../lib/app-store";

describe("fluxo operacional da ordem de serviço", () => {
  it("registra chegada, anexa evidência e conclui com aceite do cliente", async () => {
    // Adiciona uma ordem inicial para teste
    await store.addOrder({
      title: "Manutenção de Ar Condicionado",
      clientId: "c1",
      employeeId: "e1",
      status: "Pendente",
      priority: "Média",
      date: "2026-08-26",
      time: "10:00",
      value: 150,
      description: "Limpeza de filtros e carga de gás",
      address: "Av. Paulista, 1000",
      notes: "Levar escada",
    });

    const orders = store.getState().orders;
    const addedOrder = orders[0];
    if (!addedOrder) throw new Error("Ordem não foi adicionada ao store");
    const orderId = addedOrder.id;
    const evidenceCount = addedOrder.evidences?.length ?? 0;

    await store.registerArrival(orderId, -23.5614, -46.6559);
    await store.addEvidence(orderId, "file://evidencia-teste.jpg");
    await store.completeOrder(orderId, "Ana Responsável", "M 10 10 L 30 30");

    const after = store.getState().orders.find((order) => order.id === orderId);
    expect(after?.arrival).toMatchObject({ latitude: -23.5614, longitude: -46.6559 });
    expect(after?.evidences).toHaveLength(evidenceCount + 1);
    expect(after?.approval?.name).toBe("Ana Responsável");
    expect(after?.approval?.signaturePath).toContain("M 10 10");
    expect(after?.status).toBe("Concluída");
  });
});

