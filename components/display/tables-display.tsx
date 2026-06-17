"use client";

import { useEffect, useState, useCallback } from "react";
import type { OrderDetail } from "@/types/order";
import { type DisplayMode, DISPLAY_MODE_KEY } from "@/components/settings/DisplayModeSettingsCard";
import { TABLES_DISPLAY_ZOOM_KEY, TABLES_SHOW_PREPARING_KEY } from "@/components/settings/DisplayModeSettingsCard";
import { fetchAllOrderPages, getOpenOrderDateParams, isActiveOrder, isOrderReady } from "@/lib/orders";

type TableOrder = {
    order: OrderDetail;
    status: "preparing" | "ready";
};

type TableGroup = {
    table: string;
    label: string;
    subtitle?: string;
    preparing: TableOrder[];
    ready: TableOrder[];
};

function normalizeTableLabel(table: string | undefined) {
    const raw = (table ?? "").trim();
    const normalizedRaw = raw.toUpperCase();

    if (!raw || normalizedRaw === "NO_TABLE" || normalizedRaw.startsWith("NO_")) return null;

    return {
        table: raw,
        label: `Tavolo ${raw}`,
        subtitle: undefined,
    };
}

export function TablesDisplay() {
    const [displayMode, setDisplayMode] = useState<DisplayMode>("ready");
    const [tablesShowPreparing, setTablesShowPreparing] = useState(false);
    const [displayZoom, setDisplayZoom] = useState(100);
    const [groups, setGroups] = useState<TableGroup[]>([]);

    const loadOrders = useCallback(async () => {
        setGroups([]);
        try {
            const list = await fetchAllOrderPages(`${getOpenOrderDateParams()}&include=ordersStationsStates`);

            const relevantIds = list
                .filter((o: OrderDetail) => {
                    const table = (o.table ?? "").trim().toUpperCase();
                    return table !== "" && table !== "NO_TABLE" && !table.startsWith("NO_") && isActiveOrder(o);
                })
                .map((o: OrderDetail) => o.id);

            const details = await Promise.all(
                relevantIds.map((id: string) => fetch(`/api/orders/${id}`).then(r => r.json()))
            );

            const map = new Map<string, TableGroup>();

            details.forEach((o: OrderDetail) => {
                const normalized = normalizeTableLabel(o.table);
                if (!normalized) return;
                const group = map.get(normalized.table) ?? {
                    ...normalized,
                    preparing: [],
                    ready: [],
                };
                const status = isOrderReady(o) ? "ready" : "preparing";
                if (status === "ready") {
                    group.ready.push({ order: o, status });
                } else {
                    group.preparing.push({ order: o, status });
                }
                map.set(normalized.table, group);
            });

            const sorted = Array.from(map.values()).sort((a, b) => {
                const numA = parseInt(a.table);
                const numB = parseInt(b.table);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.table.localeCompare(b.table);
            });

            setGroups(sorted);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetch("/api/display-config")
            .then(res => res.ok ? res.json() : null)
            .then(cfg => {
                const mode = cfg?.displayMode as DisplayMode | undefined;
                if (mode && ["ready", "preparing", "hybrid"].includes(mode)) {
                    setDisplayMode(mode);
                    localStorage.setItem(DISPLAY_MODE_KEY, mode);
                } else {
                    const stored = localStorage.getItem(DISPLAY_MODE_KEY) as DisplayMode | null;
                    if (stored && ["ready", "preparing", "hybrid"].includes(stored)) {
                        setDisplayMode(stored);
                    }
                }
                if (typeof cfg?.tablesShowPreparing === "boolean") {
                    setTablesShowPreparing(cfg.tablesShowPreparing);
                    localStorage.setItem(TABLES_SHOW_PREPARING_KEY, String(cfg.tablesShowPreparing));
                } else {
                    const stored = localStorage.getItem(TABLES_SHOW_PREPARING_KEY);
                    if (stored !== null) setTablesShowPreparing(stored === "true");
                }
                const zoom = typeof cfg?.tablesDisplayZoom === "number" && cfg.tablesDisplayZoom >= 50 && cfg.tablesDisplayZoom <= 200 ? cfg.tablesDisplayZoom : cfg?.displayZoom;
                if (typeof zoom === "number") {
                    setDisplayZoom(zoom);
                    localStorage.setItem(TABLES_DISPLAY_ZOOM_KEY, String(zoom));
                } else {
                    const stored = localStorage.getItem(TABLES_DISPLAY_ZOOM_KEY);
                    if (stored) {
                        const z = parseInt(stored, 10);
                        if (!isNaN(z) && z >= 50 && z <= 200) setDisplayZoom(z);
                    }
                }
            })
            .catch(() => {
                const stored = localStorage.getItem(DISPLAY_MODE_KEY) as DisplayMode | null;
                if (stored && ["ready", "preparing", "hybrid"].includes(stored)) {
                    setDisplayMode(stored);
                }
                const storedShow = localStorage.getItem(TABLES_SHOW_PREPARING_KEY);
                if (storedShow !== null) setTablesShowPreparing(storedShow === "true");
                const storedZoom = localStorage.getItem(TABLES_DISPLAY_ZOOM_KEY);
                if (storedZoom) {
                    const z = parseInt(storedZoom, 10);
                    if (!isNaN(z) && z >= 50 && z <= 200) setDisplayZoom(z);
                }
            });
    }, []);

    useEffect(() => {
        const es = new EventSource("/api/display-config/events");
        es.onmessage = event => {
            try {
                const cfg = JSON.parse(event.data);
                const mode = cfg?.displayMode as DisplayMode | undefined;
                if (mode && ["ready", "preparing", "hybrid"].includes(mode)) {
                    setDisplayMode(mode);
                    localStorage.setItem(DISPLAY_MODE_KEY, mode);
                }
                if (typeof cfg?.tablesShowPreparing === "boolean") {
                    setTablesShowPreparing(cfg.tablesShowPreparing);
                    localStorage.setItem(TABLES_SHOW_PREPARING_KEY, String(cfg.tablesShowPreparing));
                }
                const zoom = typeof cfg?.tablesDisplayZoom === "number" && cfg.tablesDisplayZoom >= 50 && cfg.tablesDisplayZoom <= 200 ? cfg.tablesDisplayZoom : cfg?.displayZoom;
                if (typeof zoom === "number") {
                    setDisplayZoom(zoom);
                    localStorage.setItem(TABLES_DISPLAY_ZOOM_KEY, String(zoom));
                }
            } catch { /* ignore */ }
        };
        return () => es.close();
    }, []);

    useEffect(() => {
        const es = new EventSource("/api/events/display");
        const pollInterval = setInterval(loadOrders, 30000);

        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        es.onerror = () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(loadOrders, 3000);
        };

        es.addEventListener("confirmed-order", () => loadOrders());
        es.addEventListener("order-station-status-update", () => loadOrders());
        es.addEventListener("order-cancelled", () => loadOrders());

        return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            clearInterval(pollInterval);
            es.close();
        };
    }, [loadOrders]);

    const visibleGroups = groups
        .map(group => ({
            ...group,
            preparing: tablesShowPreparing ? group.preparing : [],
            ready: group.ready,
        }))
        .filter(group => group.preparing.length > 0 || group.ready.length > 0);

    if (visibleGroups.length === 0) {
        return (
            <div className="flex flex-col h-dvh bg-gray-100 text-gray-900">
                <header className="shrink-0 px-8 py-6 bg-white border-b border-gray-200">
                    <h1 className="text-4xl font-black tracking-tight text-black">Tavoli</h1>
                </header>
                <main className="flex-1 flex items-center justify-center">
                    <div className="rounded-3xl border-4 border-dashed border-gray-300 bg-white p-10 text-center">
                        <p className="text-3xl font-black text-gray-400">Nessun ordine</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-dvh bg-gray-100 text-gray-900">
            <header className="shrink-0 px-8 py-6 bg-white border-b border-gray-200">
                <h1 className="text-4xl font-black tracking-tight text-black">Tavoli</h1>
                <p className="text-sm font-semibold text-gray-600">Dettaglio ordini pronti per tavolo</p>
            </header>

            <main className="flex-1 overflow-hidden p-6">
                <div className="h-full grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 overflow-y-auto" style={{ transform: `scale(${displayZoom / 100})`, transformOrigin: "top left" }}>
                    {visibleGroups.map(group => (
                        <div key={group.table} className="rounded-3xl bg-white border-4 border-gray-200 shadow-sm p-6 flex flex-col">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight text-black">
                                        {group.label}
                                    </h2>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                                    {group.preparing.length + group.ready.length} {group.preparing.length + group.ready.length === 1 ? "ordine" : "ordini"}
                                </span>
                            </div>

                            {displayMode === "hybrid" && (
                                <div className="mt-3 flex gap-2">
                                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                        {group.preparing.length} prep
                                    </span>
                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                                        {group.ready.length} pronti
                                    </span>
                                </div>
                            )}

                            <div className="mt-5 space-y-4">
                                {[
                                    ...group.preparing.map(o => ({ ...o, section: "preparing" as const })).sort((a, b) => a.order.ticketNumber - b.order.ticketNumber),
                                    ...group.ready.map(o => ({ ...o, section: "ready" as const })).sort((a, b) => b.order.ticketNumber - a.order.ticketNumber),
                                ].map(item => (
                                        <div
                                            key={item.order.id}
                                            className={`rounded-2xl border-4 p-5 ${
                                                item.section === "ready"
                                                    ? "border-green-400 bg-green-50"
                                                    : "border-amber-300 bg-amber-50"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-4xl font-black tracking-tight text-black">
                                                        {item.order.displayCode}
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-500">
                                                        Ticket #{item.order.ticketNumber}
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                    item.section === "ready"
                                                        ? "bg-green-600 text-white"
                                                        : "bg-amber-500 text-black"
                                                }`}>
                                                    {item.section === "ready" ? "Pronto" : "In preparazione"}
                                                </span>
                                            </div>

                                            {item.order.customer && item.order.customer !== "NO_CUSTOMER" && (
                                                <div className="mt-3 text-lg font-semibold text-gray-700">
                                                    Cliente: {item.order.customer}
                                                </div>
                                            )}

                                            <div className="mt-4 space-y-3">
                                                {item.order.categorizedItems?.map(cat => (
                                                    <div key={cat.category.id} className="space-y-2">
                                                        <div className="text-sm font-bold uppercase tracking-wide text-gray-500">
                                                            {cat.category.name}
                                                        </div>
                                                        {cat.items.map(orderItem => (
                                                            <div key={orderItem.id} className="flex gap-2 text-lg">
                                                                <span className="font-black text-black tabular-nums min-w-[3rem]">
                                                                    {orderItem.quantity}x
                                                                </span>
                                                                <span className="flex-1">
                                                                    <span className="font-semibold text-black">
                                                                        {orderItem.food.name}
                                                                    </span>
                                                                    {orderItem.notes && (
                                                                        <span className="block text-sm text-amber-700 italic">
                                                                            {orderItem.notes}
                                                                        </span>
                                                                    )}
                                                                    {orderItem.food.ingredients.length > 0 && (
                                                                        <span className="block text-sm text-gray-500">
                                                                            {orderItem.food.ingredients.map(i => i.name).join(", ")}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
