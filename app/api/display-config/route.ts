import { getConfig, updateConfig, type DisplayMode, type NumberDisplay } from "@/lib/display-config-store";

export async function GET() {
    return Response.json(getConfig());
}

export async function PATCH(request: Request) {
    const body = await request.json();
    const patch: Parameters<typeof updateConfig>[0] = {};

    if (typeof body.announcement === "string") patch.announcement = body.announcement;
    if (typeof body.eventName === "string") patch.eventName = body.eventName;
    if (["ready", "preparing", "hybrid"].includes(body.displayMode)) {
        patch.displayMode = body.displayMode as DisplayMode;
    }
    if (["displayCode", "ticketNumber"].includes(body.numberDisplay)) {
        patch.numberDisplay = body.numberDisplay as NumberDisplay;
    }
    if (typeof body.ticketNumberMax === "number" && body.ticketNumberMax >= 0) {
        patch.ticketNumberMax = Math.floor(body.ticketNumberMax);
    }
    if (typeof body.stationsEnabled === "boolean") {
        patch.stationsEnabled = body.stationsEnabled;
    }
    if (typeof body.fullscreenAlertEnabled === "boolean") {
        patch.fullscreenAlertEnabled = body.fullscreenAlertEnabled;
    }
    if (typeof body.autoScrollPagesEnabled === "boolean") {
        patch.autoScrollPagesEnabled = body.autoScrollPagesEnabled;
    }
    if (typeof body.displayZoom === "number" && body.displayZoom >= 50 && body.displayZoom <= 200) {
        patch.displayZoom = Math.round(body.displayZoom);
    }
    if (typeof body.standardDisplayZoom === "number" && body.standardDisplayZoom >= 50 && body.standardDisplayZoom <= 200) {
        patch.standardDisplayZoom = Math.round(body.standardDisplayZoom);
    }
    if (typeof body.kitchenDisplayZoom === "number" && body.kitchenDisplayZoom >= 50 && body.kitchenDisplayZoom <= 200) {
        patch.kitchenDisplayZoom = Math.round(body.kitchenDisplayZoom);
    }
    if (typeof body.tablesDisplayZoom === "number" && body.tablesDisplayZoom >= 50 && body.tablesDisplayZoom <= 200) {
        patch.tablesDisplayZoom = Math.round(body.tablesDisplayZoom);
    }
    if (typeof body.tablesShowPreparing === "boolean") {
        patch.tablesShowPreparing = body.tablesShowPreparing;
    }
    if (typeof body.tablesEnabled === "boolean") {
        patch.tablesEnabled = body.tablesEnabled;
    }

    const updated = updateConfig(patch);
    return Response.json(updated);
}
