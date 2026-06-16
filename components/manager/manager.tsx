"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/manager/header";
import OrdersGrid from "@/components/manager/orders-grid";
import { PickedUpOrdersSheet } from "@/components/manager/picked-up-orders-sheet";
import { StationCard } from "@/components/manager/StationCard";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiFetch, handleApiError } from "@/lib/api";
import type { Order, Station, Status } from "@/types/order";

function getWorkdayBounds() {
    const now = new Date();
    const currentHour = now.getHours();
    const start = new Date(now);
    if (currentHour < 7) start.setDate(start.getDate() - 1);
    start.setHours(7, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
}

const toOrder = (o: Order): Order => ({
    id: o.id,
    ticketNumber: o.ticketNumber,
    displayCode: o.displayCode,
    status: o.status,
    confirmedAt: o.confirmedAt,
    completedAt: o.completedAt,
    ordersStations: o.ordersStations,
    orderStationStates: o.orderStationStates,
});

export default function Manager() {
    const { t } = useTranslation();
    const router = useRouter();

    const [ordersMap, setOrdersMap] = useState<Map<string, Order>>(new Map());

    const [stations, setStations] = useState<Station[]>([]);
    const [stationsEnabled, setStationsEnabled] = useState(false);
    const stationsEnabledRef = useRef(false);

    const confirmedOrders = useMemo(() =>
        Array.from(ordersMap.values()).filter(o =>
            (o.orderStationStates ?? []).length > 0 &&
            (o.status === 'CONFIRMED' || o.status === 'PARTIAL')
        ),
        [ordersMap]
    );

    const readyOrders = useMemo(() =>
        Array.from(ordersMap.values()).filter(o =>
            (o.orderStationStates ?? []).length > 0 && o.status === 'COMPLETED'
        ),
        [ordersMap]
    );

    const pickedUpOrders = useMemo(() =>
        Array.from(ordersMap.values()).filter(o =>
            (o.orderStationStates ?? []).length > 0 && o.status === 'PICKED_UP'
        ),
        [ordersMap]
    );

    const stationConfirmed = useMemo(() => {
        const map: Record<string, Order[]> = {};
        for (const s of stations) map[s.id] = [];
        for (const o of ordersMap.values())
            for (const state of o.orderStationStates ?? [])
                if (state.status === 'CONFIRMED' && state.stationId in map &&
                    !map[state.stationId].find(x => x.id === o.id))
                    map[state.stationId].push(o);
        return map;
    }, [ordersMap, stations]);

    const stationCompleted = useMemo(() => {
        const map: Record<string, Order[]> = {};
        for (const s of stations) map[s.id] = [];
        for (const o of ordersMap.values())
            for (const state of o.orderStationStates ?? [])
                if (state.status === 'COMPLETED' && state.stationId in map &&
                    !map[state.stationId].find(x => x.id === o.id))
                    map[state.stationId].push(o);
        return map;
    }, [ordersMap, stations]);

    const stationPickedUp = useMemo(() => {
        const map: Record<string, Order[]> = {};
        for (const s of stations) map[s.id] = [];
        for (const o of ordersMap.values())
            for (const state of o.orderStationStates ?? [])
                if (state.status === 'PICKED_UP' && state.stationId in map &&
                    !map[state.stationId].find(x => x.id === o.id))
                    map[state.stationId].push(o);
        return map;
    }, [ordersMap, stations]);

    const stationModePickedUpOrders = useMemo(() => {
        const seen = new Set<string>();
        const result: Order[] = [];
        for (const list of Object.values(stationPickedUp))
            for (const o of list)
                if (!seen.has(o.id)) { seen.add(o.id); result.push(o); }
        return result;
    }, [stationPickedUp]);

    const fetchAllPages = async (baseParams: string): Promise<Order[]> => {
        let page = 1;
        let all: Order[] = [];
        let hasNextPage = true;
        while (hasNextPage) {
            const json = await apiFetch<{ data?: Order[]; orders?: Order[]; pagination?: { currentPage?: number; totalPages?: number } }>(`/api/orders?limit=100&page=${page}${baseParams}`);
            const batch: Order[] = json.data || json.orders || (Array.isArray(json) ? json : []);
            if (Array.isArray(batch)) all = [...all, ...batch.map(toOrder)];
            hasNextPage = (json.pagination?.currentPage ?? 0) < (json.pagination?.totalPages ?? 0);
            page++;
        }
        return all;
    };

    const fetchOrders = useCallback(async () => {
        try {
            const { dateFrom, dateTo } = getWorkdayBounds();
            const dateParams = `&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
            const orders = await fetchAllPages(`${dateParams}&include=ordersStationsStates`);
            setOrdersMap(new Map(orders.map(o => [o.id, o])));
        } catch (error) {
            if (handleApiError(error, router)) return;
            console.error("Failed to fetch orders:", error);
        }
    }, [router]);

    useEffect(() => {
        fetch("/api/display-config")
            .then(res => res.ok ? res.json() : null)
            .then(async cfg => {
                if (cfg?.stationsEnabled) {
                    stationsEnabledRef.current = true;
                    setStationsEnabled(true);
                    apiFetch<Station[]>("/api/stations")
                        .then(data => {
                            if (Array.isArray(data)) {
                                setStations(data);
                                fetchOrders();
                            }
                        })
                        .catch(err => { if (!handleApiError(err, router)) console.error(err); });
                } else {
                    fetchOrders();
                }
            })
            .catch(err => { if (!handleApiError(err, router)) console.error(err); });
    }, [router]);

    useEffect(() => {
        fetchOrders();

        const eventSource = new EventSource('/api/events/display');
        let isFirstOpen = true;

        eventSource.addEventListener('open', () => {
            if (!isFirstOpen) fetchOrders();
            isFirstOpen = false;
        });

        const handleConfirmedOrder = (event: MessageEvent) => {
            try {
                const raw = toOrder(JSON.parse(event.data));
                if ((raw.ordersStations ?? []).length === 0) return;
                const orderStationStates = (raw.orderStationStates ?? []).length > 0
                    ? raw.orderStationStates!
                    : (raw.ordersStations ?? []).map(stId => ({ stationId: stId, status: 'CONFIRMED' }));
                setOrdersMap(prev => new Map(prev).set(raw.id, { ...raw, orderStationStates }));
            } catch (err) {
                console.error("Error parsing confirmed-order event:", err);
            }
        };

        eventSource.addEventListener('confirmed-order', handleConfirmedOrder);
        eventSource.onmessage = handleConfirmedOrder;

        eventSource.addEventListener('order-status-update', (event: MessageEvent) => {
            try {
                const { id, status, displayCode, ticketNumber } = JSON.parse(event.data);
                setOrdersMap(prev => {
                    const existing = prev.get(String(id));
                    if (!existing) return prev;

                    let orderStationStates = existing.orderStationStates;
                    if (stationsEnabledRef.current) {
                        if (status === 'COMPLETED') {
                            orderStationStates = (orderStationStates ?? []).map(s =>
                                s.status === 'PICKED_UP' ? { ...s, status: 'COMPLETED' } : s
                            );
                        } else if (status === 'CONFIRMED') {
                            orderStationStates = (orderStationStates ?? []).map(s =>
                                s.status === 'COMPLETED' ? { ...s, status: 'CONFIRMED' } : s
                            );
                        }
                    }

                    return new Map(prev).set(String(id), {
                        ...existing,
                        status,
                        displayCode,
                        ticketNumber,
                        orderStationStates,
                    });
                });
            } catch (err) {
                console.error("Error parsing order-status-update event:", err);
            }
        });

        eventSource.addEventListener('order-station-status-update', (event: MessageEvent) => {
            try {
                const { orderId, stationId, status } = JSON.parse(event.data);
                setOrdersMap(prev => {
                    const order = prev.get(String(orderId));
                    if (!order) return prev;
                    const existing = order.orderStationStates ?? [];
                    const hasState = existing.some(s => s.stationId === stationId);
                    const updatedStates = hasState
                        ? existing.map(s => s.stationId === stationId ? { ...s, status } : s)
                        : [...existing, { stationId, status }];
                    return new Map(prev).set(order.id, { ...order, orderStationStates: updatedStates });
                });
            } catch (err) {
                console.error("Error parsing order-station-status-update event:", err);
            }
        });

        eventSource.addEventListener('order-cancelled', (event: MessageEvent) => {
            try {
                const cancelled = JSON.parse(event.data);
                const sid = String(cancelled.id);
                setOrdersMap(prev => { const next = new Map(prev); next.delete(sid); return next; });
                toast.warning(t("manager.orderCancelled", { code: cancelled.displayCode }));
            } catch (err) {
                console.error("Error parsing order-cancelled event:", err);
            }
        });

        eventSource.onerror = () => { console.error("SSE connection error"); };

        return () => { eventSource.close(); };
    }, [fetchOrders]);

    const updateOrderStatus = async (orderId: string, newStatus: Status, stationId?: string) => {
        try {
            const endpoint = stationId
                ? `/api/orders/${orderId}/stations/${stationId}`
                : `/api/orders/${orderId}`;
            await apiFetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (error) {
            if (handleApiError(error, router)) return;
            fetchOrders();
        }
    };

    const resetStationProgress = (orderId: string, stationId: string) => {
        fetch(`/api/orders/${orderId}/progress?stationId=${stationId}`, { method: "DELETE" }).catch(console.error);
    };

    const handleStationMarkDone = (order: Order, stationId: string) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            const updatedStates = (current.orderStationStates ?? []).map(s =>
                s.stationId === stationId ? { ...s, status: 'COMPLETED' } : s
            );
            return new Map(prev).set(order.id, { ...current, orderStationStates: updatedStates });
        });
        updateOrderStatus(order.id, 'COMPLETED', stationId);
    };

    const handleStationMarkUndo = (order: Order, stationId: string) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            const updatedStates = (current.orderStationStates ?? []).map(s =>
                s.stationId === stationId ? { ...s, status: 'CONFIRMED' } : s
            );
            return new Map(prev).set(order.id, { ...current, orderStationStates: updatedStates });
        });
        resetStationProgress(order.id, stationId);
        updateOrderStatus(order.id, 'CONFIRMED', stationId);
    };

    const handleStationMarkPickup = (order: Order, stationId: string) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            const updatedStates = (current.orderStationStates ?? []).map(s =>
                s.stationId === stationId ? { ...s, status: 'PICKED_UP' } : s
            );
            return new Map(prev).set(order.id, { ...current, orderStationStates: updatedStates });
        });
        updateOrderStatus(order.id, 'PICKED_UP', stationId);
    };

    const handlePickupToCompleteStation = (order: Order, stationId?: string) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            const updatedStates = stationId
                ? (current.orderStationStates ?? []).map(s =>
                    s.stationId === stationId ? { ...s, status: 'COMPLETED' } : s
                )
                : (current.orderStationStates ?? []).map(s =>
                    s.status === 'PICKED_UP' ? { ...s, status: 'COMPLETED' } : s
                );
            return new Map(prev).set(order.id, { ...current, orderStationStates: updatedStates });
        });
        updateOrderStatus(order.id, 'COMPLETED', stationId);
    };

    const handleConfirmToComplete = (order: Order) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            return new Map(prev).set(order.id, { ...current, status: 'COMPLETED' });
        });
        updateOrderStatus(order.id, 'COMPLETED');
    };

    const handleCompleteToConfirm = (order: Order) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            return new Map(prev).set(order.id, { ...current, status: 'CONFIRMED' });
        });
        (order.orderStationStates ?? []).forEach(s => resetStationProgress(order.id, s.stationId));
        updateOrderStatus(order.id, 'CONFIRMED');
    };

    const handleCompleteToPickup = (order: Order) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            return new Map(prev).set(order.id, { ...current, status: 'PICKED_UP' });
        });
        updateOrderStatus(order.id, 'PICKED_UP');
    };

    const handlePickupToComplete = (order: Order) => {
        setOrdersMap(prev => {
            const current = prev.get(order.id) ?? order;
            return new Map(prev).set(order.id, { ...current, status: 'COMPLETED' });
        });
        updateOrderStatus(order.id, 'COMPLETED');
    };

    if (stationsEnabled && stations.length > 0) {
        return (
            <div className="h-screen w-full flex flex-col overflow-hidden">
                <Header pickedUpOrders={stationModePickedUpOrders} onPickupPrev={handlePickupToCompleteStation} />
                <main className="flex-1 w-full overflow-hidden">
                    <div className="h-full w-full flex gap-3 p-3 pt-20 md:pt-24 max-w-[1920px] mx-auto overflow-x-auto">
                        {stations.map(station => (
                            <StationCard
                                key={station.id}
                                className="flex-1 min-w-60"
                                stationId={station.id}
                                stationName={station.name}
                                confirmedOrders={stationConfirmed[station.id] ?? []}
                                completedOrders={stationCompleted[station.id] ?? []}
                                pickedUpOrders={stationPickedUp[station.id] ?? []}
                                onConfirmedNext={order => handleStationMarkDone(order, station.id)}
                                onCompletedPrev={order => handleStationMarkUndo(order, station.id)}
                                onCompletedNext={order => handleStationMarkPickup(order, station.id)}
                                onPickupPrev={order => handlePickupToCompleteStation(order, station.id)}
                                sortCompletedOrders="desc"
                            />
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden">
            <Header pickedUpOrders={pickedUpOrders} onPickupPrev={handlePickupToComplete} />
            <main className="flex-1 w-full overflow-hidden">
                <div className="h-full w-full flex flex-col md:grid md:grid-cols-3 gap-3 p-3 pt-20 md:pt-24 max-w-[1920px] mx-auto">
                    <OrdersGrid
                        status="CONFIRMED"
                        className="flex-1 min-h-0 min-w-0 md:flex-none md:col-span-2 md:h-full"
                        orders={confirmedOrders}
                        title={t("manager.preparingOrders")}
                        onNext={handleConfirmToComplete}
                    />
                    <OrdersGrid
                        status="COMPLETED"
                        className="flex-1 min-h-0 min-w-0 md:flex-none md:col-span-1 md:h-full"
                        orders={readyOrders}
                        title={t("manager.readyOrders")}
                        onPrev={handleCompleteToConfirm}
                        onNext={handleCompleteToPickup}
                        sortDir="desc"
                    >
                        <div className="hidden md:block">
                            <PickedUpOrdersSheet
                                pickedUpOrders={pickedUpOrders}
                                onPrev={handlePickupToComplete}
                                sortDir="desc"
                            />
                        </div>
                    </OrdersGrid>
                </div>
            </main>
        </div>
    );
}
