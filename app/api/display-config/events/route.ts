import { subscribeConfig } from "@/lib/display-config-store";

export async function GET() {
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
        start(controller) {
            unsubscribe = subscribeConfig((config) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(config)}\n\n`)
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
        },
    });
}
