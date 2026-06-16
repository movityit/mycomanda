"use client";

import { Settings, FileText, Monitor, Maximize, Minimize } from "lucide-react";
import { Button } from "../ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout as logoutAction } from "@/actions/auth";
import { useAuth, USER_STORAGE_KEY } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ButtonGroup } from "../ui/button-group";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { UserMenu } from "@/components/manager/UserMenu";
import { PickedUpOrdersSheet } from "@/components/manager/picked-up-orders-sheet";
import { useTranslation } from "react-i18next";
import type { Order } from "@/types/order";

interface HeaderProps {
    pickedUpOrders?: Order[];
    onPickupPrev?: (order: Order) => void;
}

export function Header({ pickedUpOrders, onPickupPrev }: HeaderProps = {}) {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useTranslation();

    const [noticeText, setNoticeText] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [avvisiOpen, setAvvisiOpen] = useState(false);

    useEffect(() => {
        fetch("/api/display-config")
            .then((res) => res.ok ? res.json() : null)
            .then((cfg) => {
                if (cfg?.announcement !== undefined) {
                    setNoticeText(cfg.announcement);
                } else {
                    const stored = localStorage.getItem("display-announcement");
                    if (stored) setNoticeText(stored);
                }
            })
            .catch(() => {
                const stored = localStorage.getItem("display-announcement");
                if (stored) setNoticeText(stored);
            });
    }, []);

    useEffect(() => {
        const es = new EventSource("/api/announcement/events");
        es.onmessage = (event) => {
            try {
                const { announcement: text } = JSON.parse(event.data);
                setAvvisiOpen(open => {
                    if (!open) setNoticeText(text);
                    return open;
                });
            } catch { /* ignore */ }
        };
        return () => es.close();
    }, []);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const saveAnnouncement = async () => {
        try {
            await fetch("/api/display-config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ announcement: noticeText }),
            });
            toast.success(t("manager.noticeSaved"));
        } catch {
            toast.error(t("manager.noticeSaveError"));
        }
    };

    const handleLogout = async () => {
        try {
            await logoutAction();
            toast.success(t("manager.logoutSuccess"));
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem(USER_STORAGE_KEY);
            window.location.href = "/";
        }
    };

    return (
        <header className="border-b fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-card px-4 shadow-sm">
            <div className="flex items-center gap-3">
                <img
                    src="/logo.svg"
                    alt="Logo"
                    className="mx-auto h-10 w-auto select-none"
                />
                <h1 className="text-2xl font-bold select-none hidden md:block">MyComanda</h1>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <ButtonGroup className="hidden md:flex">
                    <Button variant="outline" size="icon" onClick={() => router.push("/settings")}>
                        <Settings className="h-4 w-4" />
                    </Button>
                    <ThemeToggle />
                    <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                        {isFullscreen
                            ? <Minimize className="h-4 w-4" />
                            : <Maximize className="h-4 w-4" />
                        }
                    </Button>
                </ButtonGroup>
                {pickedUpOrders !== undefined && (
                    <div className="md:hidden">
                        <PickedUpOrdersSheet pickedUpOrders={pickedUpOrders} onPrev={onPickupPrev} sortDir="desc" />
                    </div>
                )}
                <Drawer open={avvisiOpen} onOpenChange={setAvvisiOpen}>
                    <DrawerTrigger asChild>
                        <Button variant="outline" className="hidden md:flex">
                            <FileText className="h-4 w-4 mr-2" />
                            {t("manager.displayNotices")}
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
                            <DrawerHeader>
                                <DrawerTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    {t("manager.displayNotices")}
                                </DrawerTitle>
                                <DrawerDescription className="flex items-center gap-2 text-left">
                                    {t("manager.displayNoticesDesc")}
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="mx-4">
                                <Textarea
                                    id="notes-textarea"
                                    className="w-full min-h-[200px] px-3 py-2 text-sm border rounded-md resize-none"
                                    placeholder={t("manager.noticesPlaceholder")}
                                    value={noticeText}
                                    maxLength={500}
                                    onChange={(e) => setNoticeText(e.target.value)}
                                />
                                <p className={`text-xs mt-1 text-right ${noticeText.length >= 450 ? "text-destructive" : "text-muted-foreground"}`}>
                                    {noticeText.length} / 500
                                </p>
                            </div>
                            <DrawerFooter>
                                <div className="flex items-center gap-2 justify-between">
                                    <Button variant="destructive" onClick={() => setNoticeText("")}>
                                        {t("manager.empty")}
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <DrawerClose asChild>
                                            <Button variant="outline">{t("manager.cancel")}</Button>
                                        </DrawerClose>
                                        <DrawerClose asChild>
                                            <Button onClick={saveAnnouncement}>{t("manager.saveNotices")}</Button>
                                        </DrawerClose>
                                    </div>
                                </div>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>
                <Button variant="outline" size="sm" className="hidden md:inline-flex">
                    <a href="/display" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        <Monitor className="h-4 w-4" />
                        Display
                    </a>
                </Button>
                <Button variant="outline" size="sm" className="hidden md:inline-flex">
                    <a href="/display/kitchen" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        <Monitor className="h-4 w-4" />
                        Cucina
                    </a>
                </Button>
                <Button variant="outline" size="sm" className="hidden md:inline-flex">
                    <a href="/display/tables" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        <Monitor className="h-4 w-4" />
                        Tavoli
                    </a>
                </Button>
                {user && (
                    <UserMenu user={user} onLogout={handleLogout} />
                )}
            </div>
        </header>
    );
}
