"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OrderCard } from "./order-card";
import type { OrderDetail } from "@/types/order";

interface PickedUpOrdersSheetProps {
    pickedUpOrders: OrderDetail[];
    stationId: string;
    onUndoPickup: (orderId: string) => Promise<void>;
}

export function PickedUpOrdersSheet({ pickedUpOrders, stationId, onUndoPickup }: PickedUpOrdersSheetProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                    Consegnati ({pickedUpOrders.length})
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[90vw] sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-bold">Ordini Consegnati</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                    {pickedUpOrders.length === 0 ? (
                        <p className="text-muted-foreground text-center mt-8">Nessun ordine consegnato</p>
                    ) : pickedUpOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            stationId={stationId}
                            completedCounts={{}}
                            onMarkItemUnit={() => {}}
                            onUnmarkItemUnit={() => {}}
                            onMarkReady={async () => {}}
                            onUndoPickup={onUndoPickup}
                            compact
                        />
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}
