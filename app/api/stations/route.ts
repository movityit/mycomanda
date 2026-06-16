import { NextResponse } from "next/server";
import { getAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
    const token = await getAuthToken();

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl = process.env.API_URL || "http://localhost:3000";

    const response = await fetch(`${backendUrl}/v1/stations`, {
        headers: {
            "Cookie": `${AUTH_COOKIE_NAME}=${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
}
