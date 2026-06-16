export type OrderStationState = {
    stationId: string;
    status: string;
};

export type CategorizedItem = {
    id: string;
    quantity: number;
    notes: string | null;
    total: string;
    unitPrice: string;
    unitSurcharge: string;
    food: {
        id: string;
        name: string;
        description: string;
        price: string;
        printerId: string | null;
        ingredients: {
            id: string;
            name: string;
            surcharge: string;
        }[];
    };
};

export type CategorizedCategory = {
    category: { id: string; name: string };
    items: CategorizedItem[];
};

export type OrderDetail = {
    id: string;
    ticketNumber: number;
    displayCode: string;
    createdAt?: string;
    confirmedAt?: string;
    completedAt?: string;
    customer?: string;
    table?: string;
    status: `PENDING` | `CONFIRMED` | `COMPLETED` | `PICKED_UP` | `PARTIAL`;
    ordersStations?: string[];
    orderStationStates?: OrderStationState[];
    categorizedItems?: CategorizedCategory[];
};

export type Order = OrderDetail;

export type Status = `PENDING` | `CONFIRMED` | `COMPLETED` | `PICKED_UP`;

export type Station = {
    id: string;
    name: string;
};
