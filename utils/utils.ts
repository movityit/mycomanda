import type { Order } from "@/types/order";

export function getWorkdayBounds() {
    const now = new Date();
    const currentHour = now.getHours();

    const start = new Date(now);
    if (currentHour < 8) {
        start.setDate(start.getDate() - 1);
    }
    start.setHours(8, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(7, 59, 59, 999);

    return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString()
    };
}

export const sortByDate = (a: Order, b: Order) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
    return timeA - timeB;
};
