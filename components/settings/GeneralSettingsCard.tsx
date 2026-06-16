"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const EVENT_NAME_KEY = "display-event-name";

export function GeneralSettingsCard() {
    const { t } = useTranslation();
    const [eventName, setEventName] = useState("");
    const [savedEventName, setSavedEventName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch("/api/display-config")
            .then((res) => res.ok ? res.json() : null)
            .then((cfg) => {
                if (cfg?.eventName !== undefined) {
                    setEventName(cfg.eventName);
                    setSavedEventName(cfg.eventName);
                    localStorage.setItem(EVENT_NAME_KEY, cfg.eventName);
                } else {
                    const stored = localStorage.getItem(EVENT_NAME_KEY);
                    if (stored) {
                        setEventName(stored);
                        setSavedEventName(stored);
                    }
                }
            })
            .catch(() => {
                const stored = localStorage.getItem(EVENT_NAME_KEY);
                if (stored) {
                    setEventName(stored);
                    setSavedEventName(stored);
                }
            })
            .finally(() => setIsLoading(false));
    }, [t]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/display-config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventName }),
            });
            setSavedEventName(eventName);
            localStorage.setItem(EVENT_NAME_KEY, eventName);
            toast.success(t("settings.eventNameSaved"));
        } catch {
            toast.error(t("settings.saveError"));
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = eventName !== savedEventName;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 select-none">
                    <Settings className="h-5 w-5 text-amber-600" />
                    <CardTitle>{t("settings.general")}</CardTitle>
                </div>
                <CardDescription className="select-none">
                    {t("settings.generalDesc")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="space-y-1.5 md:flex-1">
                        <Label htmlFor="event-name">{t("settings.eventName")}</Label>
                        <div className="text-sm text-muted-foreground select-none">
                            {t("settings.eventNameDesc")}
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-9 w-full md:max-w-sm rounded-md" />
                    ) : (
                        <div className="flex flex-col w-full md:max-w-sm">
                            <Input
                                id="event-name"
                                placeholder={t("settings.eventNamePlaceholder")}
                                value={eventName}
                                maxLength={100}
                                onChange={(e) => setEventName(e.target.value)}
                                className="w-full"
                            />
                            <p className={`text-xs mt-1 ${eventName.length >= 85 ? "text-destructive" : "text-muted-foreground"}`}>
                                {eventName.length} / 100
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving || isLoading}>
                        {isSaving ? t("settings.saving") : t("settings.save")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
