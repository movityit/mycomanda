import { NextResponse } from "next/server";
import { getAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
    console.log("[stations] GET called");
    const token = await getAuthToken();
    console.log("[stations] token:", token ? "present" : "MISSING");

    if (!token) {
        console.log("[stations] no token, returning 401");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl = process.env.API_URL || "http://localhost:3000";

    console.log("[stations] fetching from backend:", `${backendUrl}/v1/stations`);
    const response = await fetch(`${backendUrl}/v1/stations`, {
        headers: {
            "Cookie": `${AUTH_COOKIE_NAME}=${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log("[stations] backend error:", response.status, errorText);
        return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log("[stations] response:", JSON.stringify(data).slice(0, 200));
    return NextResponse.json(data);
}
