"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Settings, Monitor, Maximize, Minimize, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { ButtonGroup } from "@/components/ui/button-group";
import { logout as logoutAction } from "@/actions/auth";
import { useAuth, USER_STORAGE_KEY } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { OrderCard } from "./order-card";
import type { OrderDetail, Station } from "@/types/order";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { fetchAllOrderPages, getOpenOrderDateParams, isActiveOrder } from "@/lib/orders";

export function ComandaPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [orders, setOrders] = useState<Map<string, OrderDetail>>(new Map());
    const [completedCounts, setCompletedCounts] = useState<Record<string, Record<string, number>>>({});
    const selectedRef = useRef(selectedStation);

    useEffect(() => {
        selectedRef.current = selectedStation;
    }, [selectedStation]);

    // Fetch stations
    useEffect(() => {
        fetch("/api/stations")
            .then(r => r.json())
            .then((data: Station[]) => {
                setStations(data);
                if (data.length > 0) {
                    setSelectedStation(prev => prev ?? data[0].id);
                }
            })
            .catch(console.error);
    }, []);

    // Fetch orders for selected station
    useEffect(() => {
        if (!selectedStation) return;

        (async () => {
            try {
                const list = await fetchAllOrderPages(`${getOpenOrderDateParams()}&include=ordersStationsStates`);

                const station = selectedStation;
                const relevantIds = list
                    .filter((o: OrderDetail) =>
                        isActiveOrder(o) && (
                            o.ordersStations?.includes(station) ||
                            o.orderStationStates?.some(s => s.stationId === station)
                        )
                    )
                    .map((o: OrderDetail) => o.id);

                // Fetch full detail (with categorizedItems) for each order
                const details = await Promise.all(
                    relevantIds.map((id: string) =>
                        fetch(`/api/orders/${id}`).then(r => r.json())
                    )
                );

                const orderMap = new Map<string, OrderDetail>();
                details.forEach((o: OrderDetail) => orderMap.set(o.id, o));
                setOrders(orderMap);

                const progressEntries = await Promise.all(
                    relevantIds.map((id: string) =>
                        fetch(`/api/orders/${id}/progress?stationId=${station}`)
                            .then(r => r.ok ? r.json() : {})
                            .then((progress: Record<string, number>) => [id, progress] as const)
                    )
                );
                setCompletedCounts(Object.fromEntries(progressEntries));
            } catch (err) {
                console.error(err);
            }
        })();
    }, [selectedStation]);

    // SSE connection
    useEffect(() => {
        const es = new EventSource("/api/events/display");

        es.addEventListener("confirmed-order", (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as {
                    id: string;
                    displayCode: string;
                    ticketNumber: number;
                    ordersStations: string[];
                };
                const station = selectedRef.current;
                if (station && data.ordersStations?.includes(station)) {
                    fetch(`/api/orders/${data.id}`)
                        .then(r => r.json())
                        .then((order: OrderDetail) => {
                            setOrders(prev => {
                                const next = new Map(prev);
                                next.set(order.id, order);
                                return next;
                            });
                            return fetch(`/api/orders/${data.id}/progress?stationId=${station}`)
                                .then(r => r.ok ? r.json() : {});
                        })
                        .then((progress: Record<string, number>) => {
                            setCompletedCounts(prev => ({ ...prev, [data.id]: progress }));
                        })
                        .catch(console.error);
                }
            } catch { /* ignore parse errors */ }
        });

        es.addEventListener("order-station-status-update", (event: MessageEvent) => {
            try {
                const { orderId, stationId, status } = JSON.parse(event.data);
                setOrders(prev => {
                    const next = new Map(prev);
                    const order = next.get(orderId);
                    if (order) {
                        const existing = order.orderStationStates ?? [];
                        const idx = existing.findIndex(s => s.stationId === stationId);
                        const updated = idx >= 0
                            ? existing.map((s, i) => i === idx ? { ...s, status } : s)
                            : [...existing, { stationId, status }];
                        next.set(orderId, { ...order, orderStationStates: updated });
                    }
                    return next;
                });
            } catch { /* ignore */ }
        });

        es.addEventListener("order-status-update", (event: MessageEvent) => {
            try {
                const { id, status } = JSON.parse(event.data);
                setOrders(prev => {
                    const next = new Map(prev);
                    const order = next.get(id);
                    if (order) {
                        next.set(id, { ...order, status });
                    }
                    return next;
                });
            } catch { /* ignore */ }
        });

        es.addEventListener("order-cancelled", (event: MessageEvent) => {
            try {
                const { id } = JSON.parse(event.data);
                setOrders(prev => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
                setCompletedCounts(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            } catch { /* ignore */ }
        });

        return () => es.close();
    }, []);

    const handleMarkReady = useCallback(async (orderId: string) => {
        if (!selectedStation) return;
        try {
            const res = await fetch(`/api/orders/${orderId}/stations/${selectedStation}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "COMPLETED" }),
            });
            if (!res.ok) throw new Error("Failed to update");
            toast.success("Ordine completato");
        } catch {
            toast.error("Errore durante l'aggiornamento");
        }
    }, [selectedStation]);

    const markItemUnit = useCallback((orderId: string, itemId: string) => {
        setCompletedCounts(prev => {
            const orderItems = prev[orderId] ?? {};
            const current = orderItems[itemId] ?? 0;
            const next = current + 1;
            fetch(`/api/orders/${orderId}/progress?stationId=${selectedStation}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, count: next }),
            }).catch(console.error);
            return {
                ...prev,
                [orderId]: { ...orderItems, [itemId]: next },
            };
        });
    }, [selectedStation]);

    const unmarkItemUnit = useCallback((orderId: string, itemId: string) => {
        setCompletedCounts(prev => {
            const orderItems = prev[orderId] ?? {};
            const current = orderItems[itemId] ?? 0;
            const next = Math.max(0, current - 1);
            fetch(`/api/orders/${orderId}/progress?stationId=${selectedStation}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, count: next }),
            }).catch(console.error);
            return {
                ...prev,
                [orderId]: { ...orderItems, [itemId]: next },
            };
        });
    }, [selectedStation]);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [noticeText, setNoticeText] = useState("");
    const [avvisiOpen, setAvvisiOpen] = useState(false);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    useEffect(() => {
        fetch("/api/display-config")
            .then((res) => res.ok ? res.json() : null)
            .then((cfg) => {
                if (cfg?.announcement !== undefined) {
                    setNoticeText(cfg.announcement);
                } else {
                    const stored = localStorage.getItem("display-announcement");
                    if (stored) setNoticeText(stored);
                }
            })
            .catch(() => {
                const stored = localStorage.getItem("display-announcement");
                if (stored) setNoticeText(stored);
            });
    }, []);

    const saveAnnouncement = async () => {
        try {
            await fetch("/api/display-config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ announcement: noticeText }),
            });
            toast.success("Avviso salvato");
        } catch {
            toast.error("Errore nel salvataggio");
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleLogout = async () => {
        try {
            await logoutAction();
            toast.success("Logout effettuato");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem(USER_STORAGE_KEY);
            window.location.href = "/";
        }
    };

    if (!selectedStation) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Caricamento...</p>
            </div>
        );
    }

    const preparingOrders = Array.from(orders.values())
        .filter(o => {
            const s = o.orderStationStates?.find(s => s.stationId === selectedStation);
            return s?.status === "CONFIRMED";
        })
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

    const readyOrders = Array.from(orders.values())
        .filter(o => {
            const s = o.orderStationStates?.find(s => s.stationId === selectedStation);
            return s?.status === "COMPLETED";
        })
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

    return (
        <div className="flex flex-col h-dvh bg-background">
            <header className="border-b flex h-16 w-full items-center justify-between bg-card px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold select-none hidden md:block">MyComanda</h1>
                    <select
                        className="px-3 py-1.5 rounded-md border bg-background text-sm cursor-pointer ml-2"
                        value={selectedStation}
                        onChange={e => setSelectedStation(e.target.value)}
                    >
                        {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <ButtonGroup className="hidden md:flex">
                        <Button variant="outline" size="icon" onClick={() => router.push("/settings")}>
                            <Settings className="h-4 w-4" />
                        </Button>
                        <ThemeToggle />
                        <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                            {isFullscreen
                                ? <Minimize className="h-4 w-4" />
                                : <Maximize className="h-4 w-4" />
                            }
                        </Button>
                    </ButtonGroup>
                    <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => setAvvisiOpen(true)}>
                        <FileText className="h-4 w-4 mr-1.5" />
                        Avvisi
                    </Button>
                    <Button variant="outline" size="sm" className="hidden md:inline-flex">
                        <a href="/display" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                            <Monitor className="h-4 w-4" />
                            Display
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="hidden md:inline-flex">
                        <a href="/display/kitchen" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                            <Monitor className="h-4 w-4" />
                            Cucina
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="hidden md:inline-flex">
                        <a href="/display/tables" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                            <Monitor className="h-4 w-4" />
                            Tavoli
                        </a>
                    </Button>
                    {user && (
                        <UserMenu user={user} onLogout={handleLogout} />
                    )}
                </div>
                <Drawer open={avvisiOpen} onOpenChange={setAvvisiOpen}>
                    <DrawerContent>
                        <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
                            <DrawerHeader>
                                <DrawerTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Avvisi Display
                                </DrawerTitle>
                                <DrawerDescription className="flex items-center gap-2 text-left">
                                    Testo mostrato in fondo al display pubblico.
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="mx-4">
                                <Textarea
                                    id="notes-textarea"
                                    className="w-full min-h-[200px] px-3 py-2 text-sm border rounded-md resize-none"
                                    placeholder="Scrivi un avviso da mostrare sul display..."
                                    value={noticeText}
                                    maxLength={500}
                                    onChange={(e) => setNoticeText(e.target.value)}
                                />
                                <p className={`text-xs mt-1 text-right ${noticeText.length >= 450 ? "text-destructive" : "text-muted-foreground"}`}>
                                    {noticeText.length} / 500
                                </p>
                            </div>
                            <DrawerFooter>
                                <div className="flex items-center gap-2 justify-between">
                                    <Button variant="destructive" onClick={() => setNoticeText("")}>
                                        Svuota
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <DrawerClose asChild>
                                            <Button variant="outline">Annulla</Button>
                                        </DrawerClose>
                                        <DrawerClose asChild>
                                            <Button onClick={saveAnnouncement}>Salva</Button>
                                        </DrawerClose>
                                    </div>
                                </div>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col border-r overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b shrink-0">
                        <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                            In Preparazione
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {preparingOrders.length} ordini
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {preparingOrders.length === 0 ? (
                            <p className="text-muted-foreground text-center mt-8">
                                Nessun ordine in preparazione
                            </p>
                        ) : preparingOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                stationId={selectedStation}
                                completedCounts={completedCounts[order.id] ?? {}}
                                onMarkItemUnit={markItemUnit}
                                onUnmarkItemUnit={unmarkItemUnit}
                                onMarkReady={handleMarkReady}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 bg-green-50 dark:bg-green-950/30 border-b shrink-0">
                        <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
                            Pronti
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {readyOrders.length} ordini
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {readyOrders.length === 0 ? (
                            <p className="text-muted-foreground text-center mt-8">
                                Nessun ordine pronto
                            </p>
                        ) : readyOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                stationId={selectedStation}
                                completedCounts={completedCounts[order.id] ?? {}}
                                onMarkItemUnit={markItemUnit}
                                onUnmarkItemUnit={unmarkItemUnit}
                                onMarkReady={handleMarkReady}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
