"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { ChevronDownIcon, LogOutIcon, Settings, Sun, Moon, Languages } from "lucide-react"
import { useTheme } from "@teispace/next-themes"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface UserMenuProps {
    user: {
        username: string
        role: string
    }
    onLogout: () => void
}

function UserAvatar({ initials, size = 8 }: { initials: string; size?: number }) {
    return (
        <div
            className={`rounded-full bg-primary text-primary-foreground h-${size} w-${size} flex items-center justify-center text-base font-semibold select-none shrink-0`}
        >
            {initials}
        </div>
    )
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
    const initials = user.username.slice(0, 2).toUpperCase()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const { t, i18n } = useTranslation()

    useEffect(() => { setMounted(true) }, [])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="h-8 px-2 bg-transparent hover:bg-transparent focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer">
                    <UserAvatar initials={initials} />
                    <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-48 rounded-lg select-none" align="end" sideOffset={6}>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                        <UserAvatar initials={initials} />
                        <div className="grid text-left text-sm leading-tight">
                            <span className="truncate font-medium">{user.username}</span>
                            <span className="truncate text-xs text-muted-foreground">{user.role}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem
                    className="md:hidden cursor-pointer"
                    onClick={() => router.push("/settings")}
                >
                    <Settings className="h-4 w-4" />
                    {t("userMenu.settings")}
                </DropdownMenuItem>
                {mounted && (
                    <DropdownMenuItem
                        className="md:hidden cursor-pointer"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {theme === "dark" ? t("userMenu.lightTheme") : t("userMenu.darkTheme")}
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                        <Languages className="h-4 w-4" />
                        {t("userMenu.language")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuCheckboxItem
                                checked={i18n.language === 'it' || !i18n.language}
                                onClick={() => i18n.changeLanguage('it')}
                                className="cursor-pointer"
                            >
                                {t("userMenu.italian")}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={i18n.language === 'en'}
                                onClick={() => i18n.changeLanguage('en')}
                                className="cursor-pointer"
                            >
                                {t("userMenu.english")}
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                    <LogOutIcon className="h-4 w-4" />
                    {t("userMenu.logout")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
