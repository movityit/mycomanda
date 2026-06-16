"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Monitor, AlertCircle, Play, Grid2x2, ZoomIn, ZoomOut, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type DisplayMode = "ready" | "preparing" | "hybrid";

export const DISPLAY_MODE_KEY = "display-mode";
export const AUTO_SCROLL_PAGES_KEY = "auto-scroll-pages";
export const DISPLAY_ZOOM_KEY = "display-zoom";
export const STANDARD_DISPLAY_ZOOM_KEY = "standard-display-zoom";
export const KITCHEN_DISPLAY_ZOOM_KEY = "kitchen-display-zoom";
export const TABLES_DISPLAY_ZOOM_KEY = "tables-display-zoom";
export const TABLES_SHOW_PREPARING_KEY = "tables-show-preparing";
export const TABLES_ENABLED_KEY = "display-tables-enabled";

function ZoomControl({ title, value, setValue, isLoading }: { title: string; value: number; setValue: (value: number) => void; isLoading: boolean }) {
    const fill = ((value - 50) / 150) * 100;
    return (
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold">{title}</Label>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">{value}%</span>
            </div>
            <div className="flex items-center justify-center gap-3">
                <ZoomOut className="h-4 w-4 text-blue-600" />
                <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={value}
                    onChange={(e) => setValue(parseInt(e.target.value, 10))}
                    disabled={isLoading}
                    className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer dark:bg-blue-800"
                    style={{
                        background: `linear-gradient(to right, rgb(96, 165, 250) 0%, rgb(96, 165, 250) ${fill}%, rgb(229, 231, 235) ${fill}%, rgb(229, 231, 235) 100%)`
                    }}
                />
                <ZoomIn className="h-4 w-4 text-blue-600" />
                <input
                    type="number"
                    min="50"
                    max="200"
                    value={value}
                    onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 50 && val <= 200) setValue(val);
                    }}
                    disabled={isLoading}
                    className="w-14 h-8 rounded px-2 text-sm font-bold text-center text-blue-700 dark:text-blue-400 bg-white dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 tabular-nums"
                />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setValue(50)} className={`py-1.5 px-2 rounded text-xs font-semibold transition-colors ${value === 50 ? "bg-blue-600 text-white" : "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-800"}`}>50%</button>
                <button onClick={() => setValue(100)} className={`py-1.5 px-2 rounded text-xs font-semibold transition-colors ${value === 100 ? "bg-blue-600 text-white" : "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-800"}`}>100%</button>
                <button onClick={() => setValue(200)} className={`py-1.5 px-2 rounded text-xs font-semibold transition-colors ${value === 200 ? "bg-blue-600 text-white" : "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-800"}`}>200%</button>
            </div>
        </div>
    );
}

export function DisplayModeSettingsCard() {
    const { t } = useTranslation();
    const [mode, setMode] = useState<DisplayMode>("ready");
    const [savedMode, setSavedMode] = useState<DisplayMode>("ready");
    const [stationsEnabled, setStationsEnabled] = useState(false);
    const [savedStationsEnabled, setSavedStationsEnabled] = useState(false);
    const [fullscreenAlertEnabled, setFullscreenAlertEnabled] = useState(true);
    const [savedFullscreenAlertEnabled, setSavedFullscreenAlertEnabled] = useState(true);
    const [autoScrollPagesEnabled, setAutoScrollPagesEnabled] = useState(true);
    const [savedAutoScrollPagesEnabled, setSavedAutoScrollPagesEnabled] = useState(true);
    const [displayZoom, setDisplayZoom] = useState(100);
    const [savedDisplayZoom, setSavedDisplayZoom] = useState(100);
    const [standardDisplayZoom, setStandardDisplayZoom] = useState(100);
    const [savedStandardDisplayZoom, setSavedStandardDisplayZoom] = useState(100);
    const [kitchenDisplayZoom, setKitchenDisplayZoom] = useState(100);
    const [savedKitchenDisplayZoom, setSavedKitchenDisplayZoom] = useState(100);
    const [tablesDisplayZoom, setTablesDisplayZoom] = useState(100);
    const [savedTablesDisplayZoom, setSavedTablesDisplayZoom] = useState(100);
    const [tablesShowPreparing, setTablesShowPreparing] = useState(false);
    const [savedTablesShowPreparing, setSavedTablesShowPreparing] = useState(false);
    const [tablesEnabled, setTablesEnabled] = useState(false);
    const [savedTablesEnabled, setSavedTablesEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const MODES = [
        {
            value: "ready" as DisplayMode,
            label: t("settings.displayModeReady"),
            description: t("settings.displayModeReadyDesc"),
        },
        {
            value: "preparing" as DisplayMode,
            label: t("settings.displayModePrep"),
            description: t("settings.displayModePrepDesc"),
        },
        {
            value: "hybrid" as DisplayMode,
            label: t("settings.displayModeHybrid"),
            description: t("settings.displayModeHybridDesc"),
        },
    ];

    useEffect(() => {
        fetch("/api/display-config")
            .then((res) => res.ok ? res.json() : null)
            .then((cfg) => {
                const m = cfg?.displayMode as DisplayMode | undefined;
                if (m && ["ready", "preparing", "hybrid"].includes(m)) {
                    setMode(m);
                    setSavedMode(m);
                    localStorage.setItem(DISPLAY_MODE_KEY, m);
                } else {
                    const stored = localStorage.getItem(DISPLAY_MODE_KEY) as DisplayMode | null;
                    if (stored && ["ready", "preparing", "hybrid"].includes(stored)) {
                        setMode(stored);
                        setSavedMode(stored);
                    }
                }
                if (typeof cfg?.stationsEnabled === "boolean") {
                    setStationsEnabled(cfg.stationsEnabled);
                    setSavedStationsEnabled(cfg.stationsEnabled);
                }
                if (typeof cfg?.fullscreenAlertEnabled === "boolean") {
                    setFullscreenAlertEnabled(cfg.fullscreenAlertEnabled);
                    setSavedFullscreenAlertEnabled(cfg.fullscreenAlertEnabled);
                }
                if (typeof cfg?.autoScrollPagesEnabled === "boolean") {
                    setAutoScrollPagesEnabled(cfg.autoScrollPagesEnabled);
                    setSavedAutoScrollPagesEnabled(cfg.autoScrollPagesEnabled);
                }
                const standardZoom = typeof cfg?.standardDisplayZoom === "number" && cfg.standardDisplayZoom >= 50 && cfg.standardDisplayZoom <= 200 ? cfg.standardDisplayZoom : cfg?.displayZoom;
                const kitchenZoom = typeof cfg?.kitchenDisplayZoom === "number" && cfg.kitchenDisplayZoom >= 50 && cfg.kitchenDisplayZoom <= 200 ? cfg.kitchenDisplayZoom : cfg?.displayZoom;
                const tablesZoom = typeof cfg?.tablesDisplayZoom === "number" && cfg.tablesDisplayZoom >= 50 && cfg.tablesDisplayZoom <= 200 ? cfg.tablesDisplayZoom : cfg?.displayZoom;
                if (typeof standardZoom === "number") {
                    setStandardDisplayZoom(standardZoom);
                    setSavedStandardDisplayZoom(standardZoom);
                    localStorage.setItem(STANDARD_DISPLAY_ZOOM_KEY, String(standardZoom));
                }
                if (typeof kitchenZoom === "number") {
                    setKitchenDisplayZoom(kitchenZoom);
                    setSavedKitchenDisplayZoom(kitchenZoom);
                    localStorage.setItem(KITCHEN_DISPLAY_ZOOM_KEY, String(kitchenZoom));
                }
                if (typeof tablesZoom === "number") {
                    setTablesDisplayZoom(tablesZoom);
                    setSavedTablesDisplayZoom(tablesZoom);
                    localStorage.setItem(TABLES_DISPLAY_ZOOM_KEY, String(tablesZoom));
                }
                if (typeof cfg?.tablesShowPreparing === "boolean") {
                    setTablesShowPreparing(cfg.tablesShowPreparing);
                    setSavedTablesShowPreparing(cfg.tablesShowPreparing);
                    localStorage.setItem(TABLES_SHOW_PREPARING_KEY, String(cfg.tablesShowPreparing));
                }
                if (typeof cfg?.displayZoom === "number" && cfg.displayZoom >= 50 && cfg.displayZoom <= 200) {
                    setDisplayZoom(cfg.displayZoom);
                    setSavedDisplayZoom(cfg.displayZoom);
                    localStorage.setItem(DISPLAY_ZOOM_KEY, String(cfg.displayZoom));
                }
                if (typeof cfg?.tablesEnabled === "boolean") {
                    setTablesEnabled(cfg.tablesEnabled);
                    setSavedTablesEnabled(cfg.tablesEnabled);
                    localStorage.setItem(TABLES_ENABLED_KEY, String(cfg.tablesEnabled));
                }
            })
            .catch(() => {
                const stored = localStorage.getItem(DISPLAY_MODE_KEY) as DisplayMode | null;
                if (stored && ["ready", "preparing", "hybrid"].includes(stored)) {
                    setMode(stored);
                    setSavedMode(stored);
                }
                const storedZoom = localStorage.getItem(DISPLAY_ZOOM_KEY);
                if (storedZoom) { const z = parseInt(storedZoom, 10); if (!isNaN(z) && z >= 50 && z <= 200) { setDisplayZoom(z); setSavedDisplayZoom(z); } }
                const storedStandardZoom = localStorage.getItem(STANDARD_DISPLAY_ZOOM_KEY);
                if (storedStandardZoom) { const z = parseInt(storedStandardZoom, 10); if (!isNaN(z) && z >= 50 && z <= 200) { setStandardDisplayZoom(z); setSavedStandardDisplayZoom(z); } }
                const storedKitchenZoom = localStorage.getItem(KITCHEN_DISPLAY_ZOOM_KEY);
                if (storedKitchenZoom) { const z = parseInt(storedKitchenZoom, 10); if (!isNaN(z) && z >= 50 && z <= 200) { setKitchenDisplayZoom(z); setSavedKitchenDisplayZoom(z); } }
                const storedTablesZoom = localStorage.getItem(TABLES_DISPLAY_ZOOM_KEY);
                if (storedTablesZoom) { const z = parseInt(storedTablesZoom, 10); if (!isNaN(z) && z >= 50 && z <= 200) { setTablesDisplayZoom(z); setSavedTablesDisplayZoom(z); } }
                const storedTablesShowPreparing = localStorage.getItem(TABLES_SHOW_PREPARING_KEY);
                if (storedTablesShowPreparing !== null) {
                    const enabled = storedTablesShowPreparing === "true";
                    setTablesShowPreparing(enabled);
                    setSavedTablesShowPreparing(enabled);
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
                body: JSON.stringify({ displayMode: mode, stationsEnabled, fullscreenAlertEnabled, autoScrollPagesEnabled, displayZoom, standardDisplayZoom, kitchenDisplayZoom, tablesDisplayZoom, tablesShowPreparing, tablesEnabled }),
            });
            setSavedMode(mode);
            setSavedStationsEnabled(stationsEnabled);
            setSavedFullscreenAlertEnabled(fullscreenAlertEnabled);
            setSavedAutoScrollPagesEnabled(autoScrollPagesEnabled);
            setSavedDisplayZoom(displayZoom);
            setSavedStandardDisplayZoom(standardDisplayZoom);
            setSavedKitchenDisplayZoom(kitchenDisplayZoom);
            setSavedTablesDisplayZoom(tablesDisplayZoom);
            setSavedTablesShowPreparing(tablesShowPreparing);
            setSavedTablesEnabled(tablesEnabled);
            localStorage.setItem(DISPLAY_MODE_KEY, mode);
            localStorage.setItem(DISPLAY_ZOOM_KEY, String(displayZoom));
            localStorage.setItem(STANDARD_DISPLAY_ZOOM_KEY, String(standardDisplayZoom));
            localStorage.setItem(KITCHEN_DISPLAY_ZOOM_KEY, String(kitchenDisplayZoom));
            localStorage.setItem(TABLES_DISPLAY_ZOOM_KEY, String(tablesDisplayZoom));
            localStorage.setItem(TABLES_SHOW_PREPARING_KEY, String(tablesShowPreparing));
            localStorage.setItem(TABLES_ENABLED_KEY, String(tablesEnabled));
            toast.success(t("settings.displayModeSaved"));
        } catch {
            toast.error(t("settings.saveError"));
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges =
        mode !== savedMode ||
        stationsEnabled !== savedStationsEnabled ||
        fullscreenAlertEnabled !== savedFullscreenAlertEnabled ||
        autoScrollPagesEnabled !== savedAutoScrollPagesEnabled ||
        displayZoom !== savedDisplayZoom ||
        standardDisplayZoom !== savedStandardDisplayZoom ||
        kitchenDisplayZoom !== savedKitchenDisplayZoom ||
        tablesDisplayZoom !== savedTablesDisplayZoom ||
        tablesShowPreparing !== savedTablesShowPreparing ||
        tablesEnabled !== savedTablesEnabled;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 select-none">
                    <Monitor className="h-5 w-5 text-amber-600" />
                    <CardTitle>{t("settings.display")}</CardTitle>
                </div>
                <CardDescription className="select-none">
                    {t("settings.displayDesc")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Label htmlFor="event-name">{t("settings.operativeMode")}</Label>
                <div className="text-sm text-muted-foreground select-none mb-2">
                    {t("settings.operativeModeDesc")}
                </div>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Skeleton className="h-20 rounded-xl" />
                        <Skeleton className="h-20 rounded-xl" />
                        <Skeleton className="h-20 rounded-xl" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {MODES.map(({ value, label, description }) => (
                            <button
                                key={value}
                                onClick={() => setMode(value)}
                                className={cn(
                                    "flex flex-col gap-1.5 rounded-xl border-2 p-4 text-left transition-all cursor-pointer",
                                    mode === value
                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                        : "border-border hover:border-amber-300 hover:bg-muted/50"
                                )}
                            >
                                <span
                                    className={cn(
                                        "font-semibold text-sm",
                                        mode === value ? "text-amber-700 dark:text-amber-400" : ""
                                    )}
                                >
                                    {label}
                                </span>
                                <span className="text-xs text-muted-foreground leading-snug">
                                    {description}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-8 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">{t("settings.displayZoom")}</Label>
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Skeleton className="h-32 rounded-lg" />
                                <Skeleton className="h-32 rounded-lg" />
                                <Skeleton className="h-32 rounded-lg" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <ZoomControl title="Display principale" value={standardDisplayZoom} setValue={setStandardDisplayZoom} isLoading={isLoading} />
                                <ZoomControl title="Cucina" value={kitchenDisplayZoom} setValue={setKitchenDisplayZoom} isLoading={isLoading} />
                                <ZoomControl title="Tavoli" value={tablesDisplayZoom} setValue={setTablesDisplayZoom} isLoading={isLoading} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">{t("settings.displayOptions")}</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                    <Label htmlFor="fullscreen-alert-enabled" className="cursor-pointer select-none text-sm font-medium truncate">
                                        {t("settings.fullscreenAlertEnabled")}
                                    </Label>
                                </div>
                                <Switch
                                    id="fullscreen-alert-enabled"
                                    checked={fullscreenAlertEnabled}
                                    onCheckedChange={setFullscreenAlertEnabled}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Play className="h-4 w-4 text-green-600 shrink-0" />
                                    <Label htmlFor="auto-scroll-pages-enabled" className="cursor-pointer select-none text-sm font-medium truncate">
                                        {t("settings.autoScrollPagesEnabled")}
                                    </Label>
                                </div>
                                <Switch
                                    id="auto-scroll-pages-enabled"
                                    checked={autoScrollPagesEnabled}
                                    onCheckedChange={setAutoScrollPagesEnabled}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Grid2x2 className="h-4 w-4 text-purple-600 shrink-0" />
                                    <Label htmlFor="stations-enabled" className="cursor-pointer select-none text-sm font-medium truncate">
                                        {t("settings.stationsEnabled")}
                                    </Label>
                                </div>
                                <Switch
                                    id="stations-enabled"
                                    checked={stationsEnabled}
                                    onCheckedChange={setStationsEnabled}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Hash className="h-4 w-4 text-sky-600 shrink-0" />
                                    <Label htmlFor="tables-enabled" className="cursor-pointer select-none text-sm font-medium truncate">
                                        Tavoli abilitati
                                    </Label>
                                </div>
                                <Switch
                                    id="tables-enabled"
                                    checked={tablesEnabled}
                                    onCheckedChange={setTablesEnabled}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Play className="h-4 w-4 text-amber-600 shrink-0" />
                                    <Label htmlFor="tables-show-preparing" className="cursor-pointer select-none text-sm font-medium truncate">
                                        Tavoli: mostra anche in preparazione
                                    </Label>
                                </div>
                                <Switch
                                    id="tables-show-preparing"
                                    checked={tablesShowPreparing}
                                    onCheckedChange={setTablesShowPreparing}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving || isLoading}>
                        {isSaving ? t("settings.saving") : t("settings.save")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
