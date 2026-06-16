"use client";

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-svh gap-4 p-8">
            <h1 className="text-2xl font-bold">Errore</h1>
            <p className="text-muted-foreground text-center">
                Si è verificato un errore durante il caricamento della pagina.
            </p>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
                Riprova
            </button>
        </div>
    );
}
