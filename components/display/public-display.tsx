"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { OrderDetail } from "@/types/order";

type DisplayOrder = {
    displayCode: string;
    ticketNumber: number;
    table: string;
    customer: string;
};

export function PublicDisplay() {
    const [preparing, setPreparing] = useState<DisplayOrder[]>([]);
    const [ready, setReady] = useState<DisplayOrder[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    const loadOrders = useCallback(async () => {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const res = await fetch(
                `/api/orders?include=ordersStationsStates&dateFrom=${todayStart.toISOString()}`
            );
            const data = await res.json();
            const list: OrderDetail[] = Array.isArray(data) ? data : data.data;

            const prep: DisplayOrder[] = [];
            const rdy: DisplayOrder[] = [];

            for (const o of list) {
                const hasConfirmed = o.orderStationStates?.some(s => s.status === "CONFIRMED");
                const hasCompleted = o.orderStationStates?.some(s => s.status === "COMPLETED");
                const orderInfo = {
                    displayCode: o.displayCode,
                    ticketNumber: o.ticketNumber,
                    table: o.table ?? "",
                    customer: o.customer ?? "",
                };

                if (hasConfirmed && !hasCompleted) {
                    prep.push(orderInfo);
                }
                if (hasCompleted) {
                    rdy.push(orderInfo);
                }
            }

            setPreparing(prep);
            setReady(rdy);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        loadOrders();

        const es = new EventSource("/api/events/display");
        es.addEventListener("confirmed-order", () => loadOrders());
        es.addEventListener("order-station-status-update", () => loadOrders());
        es.addEventListener("order-cancelled", () => loadOrders());

        // Periodic refresh fallback
        intervalRef.current = setInterval(loadOrders, 30000);

        return () => {
            es.close();
            clearInterval(intervalRef.current);
        };
    }, [loadOrders]);

    return (
        <div className="flex flex-col h-dvh bg-background">
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col border-r overflow-hidden">
                    <div className="px-8 py-6 bg-amber-50 dark:bg-amber-950/30 border-b shrink-0">
                        <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-300">
                            In Preparazione
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-2 gap-6">
                            {preparing.map(o => (
                                <div key={o.displayCode}
                                    className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                                    <span className="text-7xl font-black tracking-tight mb-4">
                                        {o.displayCode}
                                    </span>
                                    <span className="text-2xl text-muted-foreground">
                                        {o.table && o.table !== "NO_TABLE" && `Tavolo ${o.table}`}
                                    </span>
                                </div>
                            ))}
                            {preparing.length === 0 && (
                                <p className="text-muted-foreground text-2xl col-span-2 text-center mt-12">
                                    Nessun ordine in preparazione
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-8 py-6 bg-green-50 dark:bg-green-950/30 border-b shrink-0">
                        <h2 className="text-3xl font-bold text-green-800 dark:text-green-300">
                            Pronti
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-2 gap-6">
                            {ready.map(o => (
                                <div key={o.displayCode}
                                    className="bg-card border-2 border-green-400 dark:border-green-600 rounded-2xl p-8 shadow-lg flex flex-col items-center justify-center text-center">
                                    <span className="text-7xl font-black tracking-tight mb-2 text-green-700 dark:text-green-300">
                                        {o.displayCode}
                                    </span>
                                    <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-lg font-semibold mb-3">
                                        PRONTO
                                    </span>
                                    <span className="text-2xl text-muted-foreground">
                                        {o.table && o.table !== "NO_TABLE" && `Tavolo ${o.table}`}
                                    </span>
                                </div>
                            ))}
                            {ready.length === 0 && (
                                <p className="text-muted-foreground text-2xl col-span-2 text-center mt-12">
                                    Nessun ordine pronto
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
