"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@teispace/next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Palette } from 'lucide-react';
import { useTranslation } from "react-i18next";

export function AppearanceSettingsCard() {
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const lightVariant = mounted && theme === 'light' ? 'default' : 'outline';
    const darkVariant = mounted && theme === 'dark' ? 'default' : 'outline';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-amber-600" />
                    <CardTitle className='select-none'>{t("settings.appearance")}</CardTitle>
                </div>
                <CardDescription className='select-none'>
                    {t("settings.appearanceDesc")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label>{t("settings.theme")}</Label>
                        <div className="text-sm text-muted-foreground select-none">
                            {t("settings.themeDesc")}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={lightVariant}
                            size="sm"
                            className='select-none'
                            onClick={() => setTheme('light')}
                        >
                            <Sun className="h-4 w-4 mr-2" />
                            {t("settings.light")}
                        </Button>
                        <Button
                            variant={darkVariant}
                            size="sm"
                            className='select-none'
                            onClick={() => setTheme('dark')}
                        >
                            <Moon className="h-4 w-4 mr-2" />
                            {t("settings.dark")}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
