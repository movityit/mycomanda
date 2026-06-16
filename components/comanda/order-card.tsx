"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Minus } from "lucide-react";
import type { OrderDetail } from "@/types/order";

interface OrderCardProps {
    order: OrderDetail;
    stationId: string;
    completedCounts: Record<string, number>;
    onMarkItemUnit: (orderId: string, itemId: string) => void;
    onUnmarkItemUnit: (orderId: string, itemId: string) => void;
    onMarkReady: (orderId: string) => Promise<void>;
}

function ElapsedTime({ confirmedAt }: { confirmedAt?: string }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);
    if (!confirmedAt) return null;
    const minutes = Math.round((now - new Date(confirmedAt).getTime()) / 60000);
    if (minutes > 60) return <span>{Math.floor(minutes / 60)}h {minutes % 60}m</span>;
    return <span>{minutes}min</span>;
}

function Checkbox({ done, partial }: { done: boolean; partial: boolean }) {
    if (done) {
        return (
            <span className="mt-0.5 w-4 h-4 rounded-sm bg-primary border-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
            </span>
        );
    }
    if (partial) {
        return (
            <span className="mt-0.5 w-4 h-4 rounded-sm border-2 border-amber-500 text-amber-500 flex items-center justify-center shrink-0">
                <Minus className="h-3 w-3" />
            </span>
        );
    }
    return <span className="mt-0.5 w-4 h-4 rounded-sm border border-muted-foreground/30 shrink-0" />;
}

export function OrderCard({ order, stationId, completedCounts, onMarkItemUnit, onUnmarkItemUnit, onMarkReady }: OrderCardProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const stationState = order.orderStationStates?.find(s => s.stationId === stationId);
    const isReady = stationState?.status === "COMPLETED";

    const totalUnits = order.categorizedItems?.reduce((sum, cat) =>
        sum + cat.items.reduce((s, i) => s + i.quantity, 0), 0
    ) ?? 0;
    const checkedUnits = Object.values(completedCounts).reduce((s, c) => s + c, 0);
    const allChecked = totalUnits > 0 && checkedUnits === totalUnits;

    const handleMarkReady = async () => {
        setLoading("ready");
        try {
            await onMarkReady(order.id);
        } finally {
            setLoading(null);
        }
    };

    return (
        <Card className={`p-4 shadow-sm border-l-4 transition-shadow ${isReady ? "opacity-60" : "hover:shadow-md"}`}
            style={{ borderLeftColor: isReady ? "var(--color-green-500)" : "var(--color-amber-500)" }}>
            <div className="flex items-start justify-between mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{order.displayCode}</span>
                        <span className="text-sm text-muted-foreground">
                            #{order.ticketNumber}
                        </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                        {order.table && order.table !== "NO_TABLE" && `Tavolo ${order.table}`}
                        {order.customer && order.customer !== "NO_CUSTOMER" && ` · ${order.customer}`}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                    <ElapsedTime confirmedAt={order.confirmedAt} />
                </span>
            </div>

            <div className="space-y-1 text-sm">
                {order.categorizedItems?.map(cat => (
                    <div key={cat.category.id}>
                        <span className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                            {cat.category.name}
                        </span>
                        {cat.items.map(item => {
                            const done = (completedCounts[item.id] ?? 0) >= item.quantity;
                            const partial = !done && (completedCounts[item.id] ?? 0) > 0;
                            return (
                                <div
                                    key={item.id}
                                    className={`flex items-start gap-2 pl-2 mt-1 py-0.5 rounded cursor-pointer select-none transition-colors ${
                                        done
                                            ? "text-muted-foreground/60"
                                            : "hover:bg-accent/50"
                                    }`}
                                    onClick={() => {
                                        if (isReady) return;
                                        if (done || partial) {
                                            onUnmarkItemUnit(order.id, item.id);
                                            return;
                                        }
                                        onMarkItemUnit(order.id, item.id);
                                    }}
                                >
                                    <Checkbox done={done} partial={partial} />
                                    <span className={`font-medium tabular-nums min-w-[1.5rem] ${done ? "line-through" : ""}`}>
                                        {done || partial
                                            ? `${completedCounts[item.id] ?? 0}/${item.quantity}x`
                                            : `${item.quantity}x`}
                                    </span>
                                    <span className={`flex-1 ${done ? "line-through" : ""}`}>
                                        <span>{item.food.name}</span>
                                        {item.notes && (
                                            <span className="block text-xs text-amber-600 dark:text-amber-400 italic">
                                                📝 {item.notes}
                                            </span>
                                        )}
                                        {item.food.ingredients.length > 0 && (
                                            <span className="block text-xs text-muted-foreground">
                                                {item.food.ingredients.map(i => i.name).join(", ")}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {!isReady && (
                <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                        {checkedUnits}/{totalUnits} pronti
                    </span>
                    {allChecked && (
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleMarkReady}
                            disabled={loading !== null}
                        >
                            {loading === "ready" ? (
                                <span className="animate-pulse">...</span>
                            ) : (
                                <><Check className="h-4 w-4 mr-1" /> Completa Ordine</>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );
}
