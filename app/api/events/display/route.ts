import { getAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const token = await getAuthToken();

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const backendUrl = process.env.API_URL || "http://localhost:3000";

    const lastEventId = request.headers.get("Last-Event-ID");

    let response: Response;
    try {
        response = await fetch(`${backendUrl}/events/display`, {
            signal: request.signal,
            headers: {
                "Accept": "text/event-stream",
                "Cookie": `${AUTH_COOKIE_NAME}=${token}`,
                ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
            }
        });
    } catch {
        // Return valid SSE stream that closes immediately — EventSource stays CONNECTING and retries
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("retry: 3000\n\n"));
                controller.close();
            }
        });
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
            }
        });
    }

    if (!response.ok) {
        return new Response("Error connecting to event stream", { status: response.status });
    }

    return new Response(response.body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    });
}
