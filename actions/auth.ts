"use server";

import { cookies, headers } from "next/headers";
import { AUTH_COOKIE_NAME, COOKIE_STORE_NAME } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

const API_URL = process.env.API_URL || "http://localhost:3000";

type LoginResult =
    | { success: true; user: AuthUser }
    | { success: false; error: string };

/**
 * Login action: chiama il backend, che imposta il cookie di sessione
 * (`mysagra_session`) nella risposta. Propaghiamo quel cookie al browser
 * salvandolo come `mycomanda_session` (HTTP-only).
 */
export async function login(username: string, password: string): Promise<LoginResult> {
    if (!username || !password) {
        return { success: false, error: "Username e password sono obbligatori" };
    }

    try {
        const userAgent = (await headers()).get("user-agent") ?? "";

        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": userAgent,
            },
            body: JSON.stringify({ username, password }),
            credentials: "include",
        });

        if (!response.ok) {
            return { success: false, error: "Credenziali non valide" };
        }

        // Estrai il sessionId dal Set-Cookie e reimpostalo come cookie locale.
        const setCookieHeader = response.headers.get("set-cookie");
        if (setCookieHeader) {
            const tokenMatch = setCookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
            if (tokenMatch) {
                const tokenValue = tokenMatch[1];

                const FALLBACK_MAX_AGE = 60 * 60 * 12;
                let maxAge = FALLBACK_MAX_AGE;

                const maxAgeMatch = setCookieHeader.match(/[Mm]ax-[Aa]ge=(\d+)/);
                if (maxAgeMatch) {
                    maxAge = parseInt(maxAgeMatch[1], 10);
                } else {
                    const expiresMatch = setCookieHeader.match(/[Ee]xpires=([^;]+)/);
                    if (expiresMatch) {
                        const expiresMs = Date.parse(expiresMatch[1]);
                        if (!isNaN(expiresMs)) {
                            maxAge = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
                        }
                    }
                }

                (await cookies()).set(COOKIE_STORE_NAME, tokenValue, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production" && !!process.env.AUTH_URL?.startsWith("https://"),
                    sameSite: "lax",
                    path: "/",
                    maxAge,
                });
            }
        }

        // Il backend ora restituisce `userId` invece di `id`: normalizziamo su `id`.
        const data = await response.json();
        const user: AuthUser = {
            id: data.userId ?? data.id,
            username: data.username,
            role: data.role,
        };
        return { success: true, user };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Errore durante il login" };
    }
}

/**
 * Logout action: notifica il backend (se presente la sessione) e rimuove il
 * cookie locale.
 */
export async function logout() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_STORE_NAME)?.value;

        if (token) {
            await fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: `${AUTH_COOKIE_NAME}=${token}`,
                },
            }).catch(() => {
                // Ignora errori del backend: il logout locale avviene comunque.
            });
        }
    } catch {
        // Ignora errori
    } finally {
        const cookieStore = await cookies();
        cookieStore.delete(COOKIE_STORE_NAME);
    }

    return { success: true };
}
