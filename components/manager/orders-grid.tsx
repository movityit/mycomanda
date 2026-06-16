import { cn } from "@/lib/utils";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { NUMBER_DISPLAY_KEY, TICKET_NUMBER_MAX_KEY } from "@/components/settings/NumberDisplaySettingsCard";
import type { NumberDisplay } from "@/lib/display-config-store";
import type { Order, Status } from "@/types/order";

interface OrdersGridProps {
    className?: string;
    orders: Order[];
    title?: string;
    children?: React.ReactNode;
    status?: Status;
    stationId?: string;
    onPrev?: (order: Order) => void;
    onNext?: (order: Order) => void;
    sortDir?: "asc" | "desc";
}

export default function OrdersGrid({ className, orders, title, status, stationId, onPrev, onNext, children, sortDir = "asc" }: OrdersGridProps) {
    const sortedOrders = [...orders].sort((a, b) => sortDir === "desc" ? b.ticketNumber - a.ticketNumber : a.ticketNumber - b.ticketNumber);

    return (
        <div className={cn("select-none h-full w-full rounded-xl outline-2 outline-secondary bg-card shadow-lg overflow-hidden flex flex-col", className)}>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {
                    title || children ?
                        <div className="flex place-content-between items-center sticky top-0 bg-card z-10 pt-4 pb-2">
                            {
                                title ? <h2 className="select-none text-2xl font-bold">{title}</h2> : <></>
                            }
                            {children}
                        </div>
                        :
                        <></>
                }
                <div className="flex gap-3 flex-wrap items-start place-content-start">
                    {
                        sortedOrders.map((order) => (
                            <div key={stationId ? `${order.id}-${stationId}` : order.id} className="w-40">
                                <OrderCard order={order} status={status} onPrev={onPrev} onNext={onNext} />
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    )
}

interface OrderCardProps {
    order: Order;
    status?: Status;
    onPrev?: (order: Order) => void;
    onNext?: (order: Order) => void;
}

export function OrderCard({ order, status, onPrev, onNext }: OrderCardProps) {
    const [numberDisplay, setNumberDisplay] = useState<NumberDisplay>(() => {
        const stored = localStorage.getItem(NUMBER_DISPLAY_KEY) as NumberDisplay | null;
        return (stored && ["displayCode", "ticketNumber"].includes(stored)) ? stored : "displayCode";
    });
    const [ticketNumberMax, setTicketNumberMax] = useState<number>(0);

    useEffect(() => {
        fetch("/api/display-config")
            .then(res => res.ok ? res.json() : null)
            .then(cfg => {
                if (!cfg) {
                    const nd = localStorage.getItem(NUMBER_DISPLAY_KEY) as NumberDisplay | null;
                    if (nd && ["displayCode", "ticketNumber"].includes(nd)) setNumberDisplay(nd);
                    const mx = localStorage.getItem(TICKET_NUMBER_MAX_KEY);
                    if (mx !== null) { const n = parseInt(mx, 10); if (!isNaN(n) && n >= 0) setTicketNumberMax(n); }
                    return;
                }
                if (cfg.numberDisplay && ["displayCode", "ticketNumber"].includes(cfg.numberDisplay)) {
                    setNumberDisplay(cfg.numberDisplay as NumberDisplay);
                    localStorage.setItem(NUMBER_DISPLAY_KEY, cfg.numberDisplay);
                }
                if (typeof cfg.ticketNumberMax === "number" && cfg.ticketNumberMax >= 0) {
                    setTicketNumberMax(cfg.ticketNumberMax);
                    localStorage.setItem(TICKET_NUMBER_MAX_KEY, String(cfg.ticketNumberMax));
                }
            })
            .catch(() => {
                const nd = localStorage.getItem(NUMBER_DISPLAY_KEY) as NumberDisplay | null;
                if (nd && ["displayCode", "ticketNumber"].includes(nd)) setNumberDisplay(nd);
                const mx = localStorage.getItem(TICKET_NUMBER_MAX_KEY);
                if (mx !== null) { const n = parseInt(mx, 10); if (!isNaN(n) && n >= 0) setTicketNumberMax(n); }
            });
    }, []);

    function addNext() {
        if (onNext) {
            onNext(order);
        }
    }

    function undoPrev() {
        if (onPrev) {
            onPrev(order);
        }
    }

    const orderTitle = (() => {
        if (numberDisplay == "displayCode") return order.displayCode;
        if (!ticketNumberMax) return String(order.ticketNumber);
        return String(order.ticketNumber % ticketNumberMax);
    })();

    if (status === 'CONFIRMED') {
        return (
            <Button
                variant="outline"
                size="lg"
                onClick={addNext}
                className="w-full select-none h-16 px-4 text-3xl font-bold font-mono whitespace-nowrap hover:bg-primary transition-colors"
                disabled={!onNext}
            >
                {orderTitle}
            </Button>
        )
    }

    if (status === 'COMPLETED') {
        return (
            <div className="w-full flex h-16 rounded-md overflow-hidden shadow-sm border border-input dark:border-input">
                <Button
                    variant="ghost"
                    className="select-none h-full w-12 shrink-0 rounded-none border-r border-input dark:border-input hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors"
                    onClick={undoPrev}
                    disabled={!onPrev}
                >
                    <Undo2 className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    onClick={addNext}
                    className="min-w-28 select-none h-full px-4 rounded-none text-3xl font-bold font-mono whitespace-nowrap bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transition-colors"
                    disabled={!onNext}
                >
                    {orderTitle}
                </Button>
            </div>
        )
    }

    if (status === 'PICKED_UP') {
        return (
            <div className="flex h-16 rounded-md overflow-hidden shadow-sm border border-input dark:border-input">
                <Button
                    variant="outline"
                    className="select-none h-full w-12 shrink-0 rounded-none border-r border-input dark:border-input hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors"
                    onClick={undoPrev}
                >
                    <Undo2 className="h-5 w-5" />
                </Button>
                <Button
                    className="min-w-28 h-full px-4 rounded-none text-3xl font-bold font-mono whitespace-nowrap bg-blue-400 hover:bg-blue-500 text-white"
                    disabled
                >
                    {orderTitle}
                </Button>
            </div>
        )
    }

    return (
        <Card
            key={order.id}
        >
            <CardContent className="p-4 flex items-center justify-center h-16">
                <p className="text-3xl font-bold font-mono m-0">{orderTitle}</p>
            </CardContent>
        </Card>
    )
}
