"use client";

import { ThemeProvider } from '@teispace/next-themes';
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <I18nProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                {children}
                <Toaster position="top-center" richColors />
            </ThemeProvider>
        </I18nProvider>
    );
}
