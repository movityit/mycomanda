"use client";

import { useState, useEffect } from "react";
import type { AuthUser } from "@/types/auth";

export const USER_STORAGE_KEY = "mycomanda_user";

export interface UseAuthResult {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

function readUserStorage(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
        return null;
    }
}

/**
 * Hook per leggere i dati dell'utente autenticato dal localStorage.
 * Non effettua chiamate API: legge il valore impostato al login.
 */
export function useAuth(): UseAuthResult {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setUser(readUserStorage());
        setIsLoading(false);
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
    };
}
