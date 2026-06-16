"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import OrdersGrid from "@/components/manager/orders-grid";
import { useTranslation } from "react-i18next";
import type { Order } from "@/types/order";

interface PickedUpOrdersSheetProps {
    pickedUpOrders: Order[];
    onPrev?: (order: Order) => void;
    sortDir?: "asc" | "desc";
    stationId?: string;
    stationName?: string;
}

export function PickedUpOrdersSheet({ pickedUpOrders, onPrev, stationId, stationName, sortDir = "asc" }: PickedUpOrdersSheetProps) {
    const { t } = useTranslation();
    const title = stationName
        ? `${t("manager.pickedUpOrders")} — ${stationName}`
        : t("manager.pickedUpOrders");
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline">{t("manager.pickedUpOrders")}</Button>
            </SheetTrigger>
            <SheetContent className="w-[90vw] sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-bold">{title}</SheetTitle>
                    <SheetDescription>{t("manager.pickedUpOrdersDesc")}</SheetDescription>
                </SheetHeader>
                <OrdersGrid
                    status="PICKED_UP"
                    className="rounded-none bg-background shadow-none outline-0 h-[calc(100vh-8rem)] mt-4 px-4 pb-4"
                    orders={pickedUpOrders}
                    stationId={stationId}
                    onPrev={onPrev}
                    sortDir={sortDir}
                />
            </SheetContent>
        </Sheet>
    );
}
