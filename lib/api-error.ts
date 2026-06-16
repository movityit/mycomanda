/**
 * Errore applicativo che rappresenta una risposta non ok da un'API.
 *
 * Il client effettua le richieste tramite `apiFetch` (vedi `lib/api.ts`), che
 * solleva un `ApiError` quando la risposta non è ok. Il chiamante può quindi
 * usare `instanceof ApiError` (oppure `handleApiError`) per gestire in modo
 * centralizzato i casi di sessione scaduta (401/403) e di errore server (>=500).
 */
export class ApiError extends Error {
    readonly status: number;
    readonly code?: string;

    constructor(status: number, message?: string, code?: string) {
        super(message ?? `API request failed with status ${status}`);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }

    /** 401/403: sessione assente, scaduta o permessi insufficienti. */
    get isAuthError(): boolean {
        return this.status === 401 || this.status === 403;
    }

    /** >=500: errore lato server. */
    get isServerError(): boolean {
        return this.status >= 500;
    }
}
