"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { NumberDisplay } from "@/lib/display-config-store";

export const NUMBER_DISPLAY_KEY = "display-number-display";
export const TICKET_NUMBER_MAX_KEY = "display-ticket-number-max";

export function NumberDisplaySettingsCard() {
    const { t } = useTranslation();
    const [numberDisplay, setNumberDisplay] = useState<NumberDisplay>("displayCode");
    const [savedNumberDisplay, setSavedNumberDisplay] = useState<NumberDisplay>("displayCode");
    const [ticketNumberMax, setTicketNumberMax] = useState<number>(0);
    const [savedTicketNumberMax, setSavedTicketNumberMax] = useState<number>(0);
    const [limitEnabled, setLimitEnabled] = useState(false);
    const [savedLimitEnabled, setSavedLimitEnabled] = useState(false);
    const [inputValue, setInputValue] = useState<string>("100");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const OPTIONS: { value: NumberDisplay; label: string; description: string }[] = [
        {
            value: "displayCode",
            label: t("settings.numberDisplayCode"),
            description: t("settings.numberDisplayCodeDesc"),
        },
        {
            value: "ticketNumber",
            label: t("settings.numberDisplayTicket"),
            description: t("settings.numberDisplayTicketDesc"),
        },
    ];

    useEffect(() => {
        fetch("/api/display-config")
            .then((res) => res.ok ? res.json() : null)
            .then((cfg) => {
                if (cfg?.numberDisplay && ["displayCode", "ticketNumber"].includes(cfg.numberDisplay)) {
                    setNumberDisplay(cfg.numberDisplay as NumberDisplay);
                    setSavedNumberDisplay(cfg.numberDisplay as NumberDisplay);
                    localStorage.setItem(NUMBER_DISPLAY_KEY, cfg.numberDisplay);
                } else {
                    const stored = localStorage.getItem(NUMBER_DISPLAY_KEY) as NumberDisplay | null;
                    if (stored && ["displayCode", "ticketNumber"].includes(stored)) {
                        setNumberDisplay(stored);
                        setSavedNumberDisplay(stored);
                    }
                }

                const apiMax = cfg?.ticketNumberMax;
                if (typeof apiMax === "number" && apiMax >= 0) {
                    applyMax(apiMax);
                    localStorage.setItem(TICKET_NUMBER_MAX_KEY, String(apiMax));
                } else {
                    const stored = localStorage.getItem(TICKET_NUMBER_MAX_KEY);
                    if (stored !== null) {
                        const n = parseInt(stored, 10);
                        if (!isNaN(n) && n >= 0) applyMax(n);
                    }
                }
            })
            .catch(() => {
                const storedND = localStorage.getItem(NUMBER_DISPLAY_KEY) as NumberDisplay | null;
                if (storedND && ["displayCode", "ticketNumber"].includes(storedND)) {
                    setNumberDisplay(storedND);
                    setSavedNumberDisplay(storedND);
                }
                const storedMax = localStorage.getItem(TICKET_NUMBER_MAX_KEY);
                if (storedMax !== null) {
                    const n = parseInt(storedMax, 10);
                    if (!isNaN(n) && n >= 0) applyMax(n);
                }
            })
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function applyMax(n: number) {
        setTicketNumberMax(n);
        setSavedTicketNumberMax(n);
        if (n > 0) {
            setLimitEnabled(true);
            setSavedLimitEnabled(true);
            setInputValue(String(n));
        } else {
            setLimitEnabled(false);
            setSavedLimitEnabled(false);
        }
    }

    const handleToggleLimit = (checked: boolean) => {
        setLimitEnabled(checked);
        if (!checked) {
            setTicketNumberMax(0);
        } else {
            const parsed = parseInt(inputValue, 10);
            setTicketNumberMax(!isNaN(parsed) && parsed >= 1 ? parsed : 100);
            if (isNaN(parsed) || parsed < 1) setInputValue("100");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setInputValue(raw);
        if (raw === "") {
            setTicketNumberMax(0);
            return;
        }
        const n = parseInt(raw, 10);
        if (!isNaN(n) && n >= 1) setTicketNumberMax(n);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const effectiveMax = limitEnabled ? ticketNumberMax : 0;
            const body: Record<string, unknown> = {
                numberDisplay,
                ticketNumberMax: effectiveMax,
            };

            await fetch("/api/display-config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            setSavedNumberDisplay(numberDisplay);
            setSavedTicketNumberMax(effectiveMax);
            setSavedLimitEnabled(limitEnabled);
            localStorage.setItem(NUMBER_DISPLAY_KEY, numberDisplay);
            localStorage.setItem(TICKET_NUMBER_MAX_KEY, String(effectiveMax));
            toast.success(t("settings.numberDisplaySaved"));
        } catch {
            toast.error(t("settings.saveError"));
        } finally {
            setIsSaving(false);
        }
    };

    const effectiveMax = limitEnabled ? ticketNumberMax : 0;
    const hasChanges =
        numberDisplay !== savedNumberDisplay ||
        effectiveMax !== savedTicketNumberMax ||
        limitEnabled !== savedLimitEnabled;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 select-none">
                    <Hash className="h-5 w-5 text-amber-600" />
                    <CardTitle>{t("settings.numberDisplay")}</CardTitle>
                </div>
                <CardDescription className="select-none">
                    {t("settings.numberDisplayDesc")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Skeleton className="h-20 rounded-xl" />
                        <Skeleton className="h-20 rounded-xl" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {OPTIONS.map(({ value, label, description }) => (
                            <button
                                key={value}
                                onClick={() => setNumberDisplay(value)}
                                className={cn(
                                    "flex flex-col gap-1.5 rounded-xl border-2 p-4 text-left transition-all cursor-pointer",
                                    numberDisplay === value
                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                        : "border-border hover:border-amber-300 hover:bg-muted/50"
                                )}
                            >
                                <span className={cn(
                                    "font-semibold text-sm",
                                    numberDisplay === value ? "text-amber-700 dark:text-amber-400" : ""
                                )}>
                                    {label}
                                </span>
                                <span className="text-xs text-muted-foreground leading-snug">
                                    {description}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {!isLoading && numberDisplay === "ticketNumber" && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="limit-toggle" className="text-sm font-semibold cursor-pointer">
                                    {t("settings.ticketNumberMax")}
                                </Label>
                                <p className="text-xs text-muted-foreground select-none">
                                    {t("settings.ticketNumberMaxDesc")}
                                </p>
                            </div>
                            <Switch
                                id="limit-toggle"
                                checked={limitEnabled}
                                onCheckedChange={handleToggleLimit}
                            />
                        </div>

                        <div
                            className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out",
                                limitEnabled ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
                            )}
                        >
                            <div className="flex items-center gap-3 pt-1">
                                <Label htmlFor="ticket-number-max" className="text-sm text-muted-foreground shrink-0">
                                    {t("settings.ticketNumberMaxLabel")}
                                </Label>
                                <Input
                                    id="ticket-number-max"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    placeholder={t("settings.ticketNumberMaxPlaceholder")}
                                    disabled={!limitEnabled}
                                    className="max-w-[140px]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving || isLoading}>
                        {isSaving ? t("settings.saving") : t("settings.save")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
