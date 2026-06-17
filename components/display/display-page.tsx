"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { OrderDetail, Station } from "@/types/order";
import { KITCHEN_DISPLAY_ZOOM_KEY } from "@/components/settings/DisplayModeSettingsCard";
import { fetchAllOrderPages, getOpenOrderDateParams, isActiveOrder } from "@/lib/orders";

type MissingItem = {
    key: string;
    name: string;
    quantity: number;
    notes?: string;
    ingredients: string[];
    orders: string[];
    orderIds: string[];
    foodId: string;
    ticketNumber: number;
};

export function DisplayPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
    const [displayZoom, setDisplayZoom] = useState(100);
    const selectedRef = useRef(selectedStation);
    const progressMapRef = useRef<Record<string, Record<string, number>>>({});

    useEffect(() => {
        selectedRef.current = selectedStation;
    }, [selectedStation]);

    useEffect(() => {
        fetch("/api/display-config")
            .then(res => res.ok ? res.json() : null)
            .then(cfg => {
                const zoom = typeof cfg?.kitchenDisplayZoom === "number" && cfg.kitchenDisplayZoom >= 50 && cfg.kitchenDisplayZoom <= 200 ? cfg.kitchenDisplayZoom : cfg?.displayZoom;
                if (typeof zoom === "number") {
                    setDisplayZoom(zoom);
                    localStorage.setItem(KITCHEN_DISPLAY_ZOOM_KEY, String(zoom));
                } else {
                    const stored = localStorage.getItem(KITCHEN_DISPLAY_ZOOM_KEY);
                    if (stored) {
                        const z = parseInt(stored, 10);
                        if (!isNaN(z) && z >= 50 && z <= 200) setDisplayZoom(z);
                    }
                }
            })
            .catch(() => {
                const stored = localStorage.getItem(KITCHEN_DISPLAY_ZOOM_KEY);
                if (stored) {
                    const z = parseInt(stored, 10);
                    if (!isNaN(z) && z >= 50 && z <= 200) setDisplayZoom(z);
                }
            });
    }, []);

    useEffect(() => {
        const es = new EventSource("/api/display-config/events");
        es.onmessage = event => {
            try {
                const cfg = JSON.parse(event.data);
                const zoom = typeof cfg?.kitchenDisplayZoom === "number" && cfg.kitchenDisplayZoom >= 50 && cfg.kitchenDisplayZoom <= 200 ? cfg.kitchenDisplayZoom : cfg?.displayZoom;
                if (typeof zoom === "number") {
                    setDisplayZoom(zoom);
                    localStorage.setItem(KITCHEN_DISPLAY_ZOOM_KEY, String(zoom));
                }
            } catch { /* ignore */ }
        };
        return () => es.close();
    }, []);

    useEffect(() => {
        fetch("/api/stations")
            .then(r => r.json())
            .then((json: Station[] | { data: Station[] }) => {
                const data = Array.isArray(json) ? json : (json as { data: Station[] }).data ?? [];
                setStations(data);
                if (data.length > 0) {
                    setSelectedStation(prev => prev ?? data[0].id);
                }
            })
            .catch(console.error);
    }, []);

    const loadMissingItems = useCallback(async (station: string) => {
        try {
            const list = await fetchAllOrderPages(`${getOpenOrderDateParams()}&include=ordersStationsStates`);

            const relevantIds = list
                .filter((o: OrderDetail) => {
                    const state = o.orderStationStates?.find(s => s.stationId === station);
                    return state && isActiveOrder(o) && (state.status === "CONFIRMED" || state.status === "PARTIAL");
                })
                .map((o: OrderDetail) => o.id);

            const details = await Promise.all(
                relevantIds.map((id: string) => fetch(`/api/orders/${id}`).then(r => r.json()))
            );

            const progressByOrder = await Promise.all(
                relevantIds.map(async (id: string) => {
                    try {
                        const res = await fetch(`/api/orders/${id}/progress?stationId=${station}`);
                        const progress = res.ok ? await res.json() : {};
                        return [id, progress as Record<string, number>] as const;
                    } catch {
                        return [id, {}] as const;
                    }
                })
            );
            const progressMap = Object.fromEntries(progressByOrder);
            progressMapRef.current = progressMap;

            const map = new Map<string, MissingItem>();

            details.forEach((o: OrderDetail) => {
                const state = o.orderStationStates?.find(s => s.stationId === station);
                if (!state || state.status === "COMPLETED" || state.status === "PICKED_UP") return;

                o.categorizedItems?.forEach(cat => {
                    cat.items.forEach(item => {
                        const progress = progressMap[o.id]?.[item.food.id] ?? 0;
                        const remaining = Math.max(0, item.quantity - progress);
                        if (remaining <= 0) return;

                        const ingredients = item.food.ingredients.map(i => i.name);
                        const key = `${item.food.id}|${item.notes ?? ""}|${ingredients.join("\u001f")}`;
                        const existing = map.get(key);
                        if (existing) {
                            existing.quantity += remaining;
                            if (!existing.orders.includes(o.displayCode)) {
                                existing.orders.push(o.displayCode);
                                existing.orderIds.push(o.id);
                            }
                        } else {
                            map.set(key, {
                                key,
                                name: item.food.name,
                                quantity: remaining,
                                notes: item.notes ?? undefined,
                                ingredients,
                                orders: [o.displayCode],
                                orderIds: [o.id],
                                foodId: item.food.id,
                                ticketNumber: o.ticketNumber,
                            });
                        }
                    });
                });
            });

            setMissingItems(
                Array.from(map.values()).sort((a, b) =>
                    a.ticketNumber - b.ticketNumber ||
                    a.name.localeCompare(b.name) ||
                    a.key.localeCompare(b.key)
                )
            );
        } catch (err) {
            console.error(err);
        }
    }, []);

    const handleMark = useCallback(async (item: MissingItem, isUndo: boolean) => {
        const station = selectedRef.current;
        if (!station) return;
        const orderId = item.orderIds[0];
        if (!orderId) return;
        const current = progressMapRef.current[orderId]?.[item.foodId] ?? 0;
        const newCount = isUndo ? Math.max(0, current - 1) : current + 1;
        try {
            await fetch(`/api/orders/${orderId}/progress?stationId=${station}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.foodId, count: newCount }),
            });
            if (station) loadMissingItems(station);
        } catch { /* ignore */ }
    }, [loadMissingItems]);

    useEffect(() => {
        if (!selectedStation) return;
        let cancelled = false;
        (async () => {
            if (cancelled) return;
            await loadMissingItems(selectedStation);
        })().catch(console.error);
        return () => { cancelled = true; };
    }, [selectedStation, loadMissingItems]);

    useEffect(() => {
        const es = new EventSource("/api/events/display");
        const pollInterval = setInterval(() => {
            const station = selectedRef.current;
            if (station) loadMissingItems(station);
        }, 30000);

        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        es.onerror = () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                const station = selectedRef.current;
                if (station) loadMissingItems(station);
            }, 3000);
        };

        es.addEventListener("confirmed-order", () => {
            const station = selectedRef.current;
            if (station) loadMissingItems(station);
        });

        es.addEventListener("order-station-status-update", () => {
            const station = selectedRef.current;
            if (station) loadMissingItems(station);
        });

        es.addEventListener("order-cancelled", () => {
            const station = selectedRef.current;
            if (station) loadMissingItems(station);
        });

        return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            clearInterval(pollInterval);
            es.close();
        };
    }, [loadMissingItems]);

    useEffect(() => {
        const es = new EventSource("/api/orders/progress/events");
        es.onmessage = () => {
            const station = selectedRef.current;
            if (station) loadMissingItems(station);
        };
        es.onerror = () => {
            const station = selectedRef.current;
            if (station) loadMissingItems(station);
        };
        return () => es.close();
    }, [loadMissingItems]);

    if (!selectedStation) {
        if (stations.length === 0) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <p className="text-muted-foreground">Nessuna stazione configurata</p>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-dvh bg-gray-100 text-gray-900">
            <header className="shrink-0 px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-black">Cucina</h1>
                        <p className="text-sm font-semibold text-gray-600">Solo le pietanze da preparare</p>
                    </div>
                    <select
                        className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-lg font-bold"
                        value={selectedStation}
                        onChange={e => setSelectedStation(e.target.value)}
                    >
                        {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-6">
                {missingItems.length === 0 ? (
                    <div className="h-full rounded-3xl border-4 border-dashed border-gray-300 bg-white flex items-center justify-center">
                        <p className="text-4xl font-black text-gray-400">Tutto pronto</p>
                    </div>
                ) : (
                    <div className="h-full grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 overflow-y-auto" style={{ transform: `scale(${displayZoom / 100})`, transformOrigin: "top left" }}>
                        {missingItems.map(item => (
                            <div key={item.key} className="rounded-3xl bg-white border-4 border-gray-200 shadow-sm p-6 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight text-black leading-tight">
                                        {item.name}
                                    </h2>
                                    {item.notes && (
                                        <p className="mt-3 text-xl font-bold text-amber-600">
                                            {item.notes}
                                        </p>
                                    )}
                                    {item.ingredients.length > 0 && (
                                        <p className="mt-3 text-lg font-semibold text-gray-500">
                                            {item.ingredients.join(", ")}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-6">
                                    <div className="text-7xl font-black text-black tabular-nums">
                                        {item.quantity}x
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {item.orders.map(code => (
                                            <span key={code} className="px-3 py-1 rounded-full bg-yellow-300 text-black text-xl font-black">
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => handleMark(item, false)}
                                        className="flex-1 py-3 rounded-2xl bg-green-500 text-white text-2xl font-black hover:bg-green-600 active:scale-95 transition"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => handleMark(item, true)}
                                        className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-2xl font-black hover:bg-red-600 active:scale-95 transition"
                                    >
                                        ↩
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
