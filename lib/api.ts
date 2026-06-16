import { ApiError } from "./api-error";
import { USER_STORAGE_KEY } from "@/hooks/use-auth";

/** Sottoinsieme di `AppRouterInstance` usato da `handleApiError`. */
type AppRouter = { push: (href: string) => void };

/**
 * Wrapper di `fetch` lato client che solleva `ApiError` quando la risposta non è ok.
 *
 * Restituisce il JSON parsato (o `undefined` per 204). Il chiamante incapsula la
 * chiamata in un try/catch e delega la gestione degli errori a `handleApiError`.
 */
export async function apiFetch<T = unknown>(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(input, init);

    if (!response.ok) {
        let message: string | undefined;
        let code: string | undefined;
        try {
            const body = await response.json();
            message = body.error ?? body.message;
            code = body.code ?? body.type;
        } catch {
            /* corpo non JSON: lascia il messaggio di default */
        }
        throw new ApiError(response.status, message, code);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

/**
 * Gestione centralizzata degli errori API lato client.
 *
 * - 401/403 -> redirect al login ("/?error=...")
 * - >=500   -> redirect alla pagina di errore ("/500")
 *
 * Usa il router di Next (`router.push`) così la navigazione è client-side e il
 * layout (incluso il Toaster) persiste: il toast sulla pagina di login resta
 * visibile invece di essere perso da un full reload.
 *
 * Restituisce `true` se ha gestito l'errore (e avviato un redirect), `false`
 * altrimenti, così il chiamante può decidere se mostrare un toast o rilanciare.
 */
export function handleApiError(error: unknown, router: AppRouter): boolean {
    if (error instanceof ApiError) {
        if (error.isAuthError) {
            try {
                localStorage.removeItem(USER_STORAGE_KEY);
            } catch {
                /* localStorage non disponibile */
            }
            // 403 -> permessi insufficienti, 401 -> sessione scaduta/assente.
            const reason = error.status === 403 ? "forbidden" : "session_expired";
            router.push(`/?error=${reason}`);
            return true;
        }
        if (error.isServerError) {
            router.push("/500");
            return true;
        }
    }
    return false;
}
