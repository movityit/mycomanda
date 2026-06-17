import { apiFetch } from "./api";
import type { OrderDetail, OrderStationState } from "@/types/order";

type OrderListResponse = {
    data?: OrderDetail[];
    orders?: OrderDetail[];
    pagination?: {
        currentPage?: number;
        totalPages?: number;
    };
};

export function getOpenOrderDateParams() {
    const now = new Date();
    return `&dateFrom=${encodeURIComponent("1970-01-01T00:00:00.000Z")}&dateTo=${encodeURIComponent(now.toISOString())}`;
}

export function getWorkdayDateParams() {
    const now = new Date();
    const currentHour = now.getHours();
    const start = new Date(now);
    if (currentHour < 7) start.setDate(start.getDate() - 1);
    start.setHours(7, 0, 0, 0);
    return `&dateFrom=${encodeURIComponent(start.toISOString())}&dateTo=${encodeURIComponent(now.toISOString())}`;
}

export async function fetchAllOrderPages(baseParams: string) {
    let page = 1;
    let all: OrderDetail[] = [];
    let hasNextPage = true;

    while (hasNextPage) {
        const json = await apiFetch<OrderListResponse>(`/api/orders?limit=100&page=${page}${baseParams}`);
        const batch: OrderDetail[] = json.data ?? json.orders ?? (Array.isArray(json) ? json : []);
        if (!Array.isArray(batch) || batch.length === 0) break;

        all = [...all, ...batch];
        const currentPage = json.pagination?.currentPage ?? page;
        const totalPages = json.pagination?.totalPages ?? (currentPage + 1);
        hasNextPage = currentPage < totalPages && batch.length === 100;
        page++;
    }

    return all;
}

export function isActiveOrder(order: OrderDetail) {
    if (order.status === "PICKED_UP") return false;

    const states = order.orderStationStates ?? [];
    if (states.length > 0) {
        return states.some(state => state.status !== "PICKED_UP");
    }

    return order.status === "CONFIRMED" || order.status === "PARTIAL" || order.status === "COMPLETED";
}

export function isOrderReady(order: OrderDetail) {
    const states = order.orderStationStates ?? [];
    if (states.length > 0) return states.every(state => state.status === "COMPLETED") && !states.some(s => s.status === "PICKED_UP");
    return order.status === "COMPLETED";
}

export function isOrderPreparing(order: OrderDetail) {
    if (order.status === "PICKED_UP") return false;
    const states = order.orderStationStates ?? [];
    if (states.length > 0) return states.some(state => state.status === "CONFIRMED" || state.status === "PARTIAL");
    return order.status === "CONFIRMED" || order.status === "PARTIAL";
}

export function orderStateIsTerminal(state: OrderStationState) {
    return state.status === "COMPLETED" || state.status === "PICKED_UP";
}
