import { subscribeProgress } from "@/lib/item-progress-store";

export const dynamic = 'force-dynamic';

export async function GET() {
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
        start(controller) {
            unsubscribe = subscribeProgress((orderId, stationId, progress) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ orderId, stationId, progress })}\n\n`)
                    );
                } catch {
                    unsubscribe?.();
                    unsubscribe = null;
                }
            });
        },
        cancel() {
            unsubscribe?.();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
