import { NextResponse } from "next/server";
import { getAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; stationId: string }> }
) {
    const token = await getAuthToken();

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, stationId } = await params;
    const body = await request.json();
    const backendUrl = process.env.API_URL || "http://localhost:3000";

    const response = await fetch(`${backendUrl}/v1/orders/${id}/stations/${stationId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Cookie": `${AUTH_COOKIE_NAME}=${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
}
