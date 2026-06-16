"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/login/login-form";
import { useTheme } from "@teispace/next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ComandaPage } from "./comanda-page";

const ERROR_MESSAGE_KEYS: Record<string, string> = {
    session_expired: "login.sessionExpired",
    unauthorized: "login.sessionExpired",
    forbidden: "login.accessDenied",
};

interface RootPageProps {
    authenticated: boolean;
}

export function RootPage({ authenticated }: RootPageProps) {
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const error = new URLSearchParams(window.location.search).get("error");
        if (!error) return;
        const key = ERROR_MESSAGE_KEYS[error] ?? "login.sessionExpired";
        toast.error(t(key));
        window.history.replaceState({}, "", "/");
    }, [t]);

    if (authenticated) {
        return <ComandaPage />;
    }

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <LoginForm />
            </div>
            <div className="absolute bottom-0 text-sm text-muted-foreground select-none">
                <Link href="https://www.mysagra.com/" target="_blank" rel="noopener noreferrer">
                    {t("common.poweredBy")}
                    <Button variant="link" className="text-primary p-1.5">
                        MySagra
                    </Button>
                </Link>
            </div>
            <div className="absolute bottom-0 right-0 m-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {mounted && (theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
                </Button>
            </div>
        </div>
    );
}
