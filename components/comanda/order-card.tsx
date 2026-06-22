"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Minus, Undo2, Package } from "lucide-react";
import type { OrderDetail } from "@/types/order";
import { itemProgressKey } from "@/lib/orders";

interface OrderCardProps {
    order: OrderDetail;
    stationId: string;
    completedCounts: Record<string, number>;
    onMarkItemUnit: (orderId: string, itemId: string) => void;
    onUnmarkItemUnit: (orderId: string, itemId: string) => void;
    onMarkReady: (orderId: string) => Promise<void>;
    onUndoReady?: (orderId: string) => Promise<void>;
    onPickup?: (orderId: string) => Promise<void>;
    onUndoPickup?: (orderId: string) => Promise<void>;
    compact?: boolean;
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

function getElapsedSeverity(confirmedAt?: string): string {
    if (!confirmedAt) return "text-muted-foreground";
    const minutes = (Date.now() - new Date(confirmedAt).getTime()) / 60000;
    if (minutes > 30) return "text-red-600 dark:text-red-400";
    if (minutes > 15) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
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

export function OrderCard({ order, stationId, completedCounts, onMarkItemUnit, onUnmarkItemUnit, onMarkReady, onUndoReady, onPickup, onUndoPickup, compact }: OrderCardProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const stationState = order.orderStationStates?.find(s => s.stationId === stationId);
    const status = stationState?.status ?? "";
    const isConfirmed = status === "CONFIRMED";
    const isReady = status === "COMPLETED";
    const isPickedUp = status === "PICKED_UP";

    const totalUnits = order.categorizedItems?.reduce((sum, cat) =>
        sum + cat.items.reduce((s, i) => s + i.quantity, 0), 0
    ) ?? 0;
    const checkedUnits = Object.values(completedCounts).reduce((s, c) => s + c, 0);
    const allChecked = totalUnits > 0 && checkedUnits === totalUnits;

    const handleMarkReady = async () => {
        setLoading("ready");
        try { await onMarkReady(order.id); } finally { setLoading(null); }
    };
    const handleUndoReady = async () => {
        setLoading("undo");
        try { await onUndoReady?.(order.id); } finally { setLoading(null); }
    };
    const handlePickup = async () => {
        setLoading("pickup");
        try { await onPickup?.(order.id); } finally { setLoading(null); }
    };
    const handleUndoPickup = async () => {
        setLoading("undo-pickup");
        try { await onUndoPickup?.(order.id); } finally { setLoading(null); }
    };

    return (
        <Card className={`p-4 shadow-sm border-l-4 transition-shadow ${isReady ? "" : isPickedUp ? "opacity-50" : "hover:shadow-md"}`}
            style={{ borderLeftColor: isPickedUp ? "var(--color-blue-500)" : isReady ? "var(--color-green-500)" : "var(--color-amber-500)" }}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-3">
                        <span className={`${compact ? "text-xl" : "text-3xl"} font-black`}>{order.displayCode}</span>
                        <span className="text-base text-muted-foreground font-medium">
                            #{order.ticketNumber}
                        </span>
                    </div>
                    {order.table && !order.table.startsWith("NO_TABLE") && (
                        <div className="text-lg font-black text-foreground mt-1 uppercase tracking-tight">
                            Tavolo {order.table}
                            {order.customer && order.customer !== "NO_CUSTOMER" && <span className="font-semibold"> · {order.customer}</span>}
                        </div>
                    )}
                    {(!order.table || order.table.startsWith("NO_TABLE")) && order.customer && order.customer !== "NO_CUSTOMER" && (
                        <div className="text-sm text-muted-foreground mt-0.5">
                            {order.customer}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`tabular-nums font-black ${compact ? "text-sm" : "text-base"} ${getElapsedSeverity(order.confirmedAt)}`}>
                        <ElapsedTime confirmedAt={order.confirmedAt} />
                    </span>
                </div>
            </div>

            {isPickedUp ? (
                <div className="flex items-center gap-3 pt-2 border-t">
                    <Package className="h-5 w-5 text-blue-500 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-blue-600">Consegnato</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndoPickup}
                        disabled={loading !== null}
                    >
                        {loading === "undo-pickup" ? <span className="animate-pulse">...</span> : <><Undo2 className="h-4 w-4 mr-1" /> Annulla</>}
                    </Button>
                </div>
            ) : isReady ? (
                <div className="flex items-center gap-3 pt-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndoReady}
                        disabled={loading !== null}
                    >
                        {loading === "undo" ? <span className="animate-pulse">...</span> : <><Undo2 className="h-4 w-4 mr-1" /> Ripristina</>}
                    </Button>
                    <Button
                        size="lg"
                        className="flex-1 text-lg font-bold py-5"
                        onClick={handlePickup}
                        disabled={loading !== null}
                    >
                        {loading === "pickup" ? <span className="animate-pulse">...</span> : <><Package className="h-5 w-5 mr-2" /> Consegnato</>}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {order.categorizedItems?.map(cat => (
                            <div key={cat.category.id}>
                                <span className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
                                    {cat.category.name}
                                </span>
                                {cat.items.map(item => {
                                    const progressKey = itemProgressKey(item);
                                    const done = (completedCounts[progressKey] ?? 0) >= item.quantity;
                                    const partial = !done && (completedCounts[progressKey] ?? 0) > 0;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer select-none transition-colors text-base ${
                                                done
                                                    ? "text-muted-foreground/60"
                                                    : "hover:bg-accent/50 active:bg-accent"
                                            }`}
                                            onClick={() => {
                                                if (done || partial) {
                                                    onUnmarkItemUnit(order.id, progressKey);
                                                    return;
                                                }
                                                onMarkItemUnit(order.id, progressKey);
                                            }}
                                        >
                                            <Checkbox done={done} partial={partial} />
                                            <span className={`font-bold tabular-nums min-w-[2rem] text-lg ${done ? "line-through" : ""}`}>
                                                {done || partial
                                                    ? `${completedCounts[progressKey] ?? 0}/${item.quantity}x`
                                                    : `${item.quantity}x`}
                                            </span>
                                            <span className={`flex-1 text-base ${done ? "line-through" : ""}`}>
                                                <span>{item.food.name}</span>
                                                {item.notes && (
                                                    <span className="block text-sm text-amber-600 dark:text-amber-400 italic mt-0.5">
                                                        📝 {item.notes}
                                                    </span>
                                                )}
                                                {item.food.ingredients.length > 0 && (
                                                    <span className="block text-xs text-muted-foreground mt-0.5">
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

                    <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                        <span className="text-base font-bold text-muted-foreground">
                            {checkedUnits}/{totalUnits} pronti
                        </span>
                        {allChecked && (
                            <Button
                                size="lg"
                                className="flex-1 text-lg font-bold py-6"
                                onClick={handleMarkReady}
                                disabled={loading !== null}
                            >
                                {loading === "ready" ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    <><Check className="h-5 w-5 mr-2" /> Completa Ordine</>
                                )}
                            </Button>
                        )}
                    </div>
                </>
            )}
        </Card>
    );
}
