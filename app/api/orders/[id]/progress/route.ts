import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { getProgress, resetProgress, updateProgress } from "@/lib/item-progress-store";

async function isAuthorized() {
    const token = await getAuthToken();
    return !!token;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthorized())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const stationId = new URL(_request.url).searchParams.get("stationId");
    if (!stationId) {
        return NextResponse.json({ error: "stationId required" }, { status: 400 });
    }

    return NextResponse.json(getProgress(id, stationId));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthorized())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const stationId = new URL(request.url).searchParams.get("stationId");
    if (!stationId) {
        return NextResponse.json({ error: "stationId required" }, { status: 400 });
    }

    const body = await request.json();
    const itemId = typeof body.itemId === "string" ? body.itemId : null;
    const count = typeof body.count === "number" ? Math.max(0, Math.floor(body.count)) : null;

    if (!itemId || count === null) {
        return NextResponse.json({ error: "itemId and count required" }, { status: 400 });
    }

    return NextResponse.json(updateProgress(id, stationId, itemId, count));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthorized())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const stationId = new URL(_request.url).searchParams.get("stationId");
    if (!stationId) {
        return NextResponse.json({ error: "stationId required" }, { status: 400 });
    }

    resetProgress(id, stationId);
    return NextResponse.json({ ok: true });
}
