import { getAuthToken } from "@/lib/auth";
import { subscribeProgress } from "@/lib/item-progress-store";

export const dynamic = "force-dynamic";

export async function GET() {
    const token = await getAuthToken();
    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const unsubscribe = subscribeProgress((orderId, stationId, progress) => {
                const text = JSON.stringify({ orderId, stationId, progress });
                controller.enqueue(encoder.encode(`data: ${text}\n\n`));
            });

            return () => unsubscribe();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
