"use client";

import { SettingsHeader } from "@/components/settings/header";
import { GeneralSettingsCard } from "@/components/settings/GeneralSettingsCard";
import { DisplayModeSettingsCard } from "@/components/settings/DisplayModeSettingsCard";
import { NumberDisplaySettingsCard } from "@/components/settings/NumberDisplaySettingsCard";
import { AppearanceSettingsCard } from "@/components/settings/AppearanceSettingsCard";

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-muted/30">
            <SettingsHeader />
            <main className="pt-20 px-4 md:px-6 pb-8 max-w-4xl mx-auto space-y-6">
                <GeneralSettingsCard />
                <DisplayModeSettingsCard />
                <NumberDisplaySettingsCard />
                <AppearanceSettingsCard />
            </main>
        </div>
    );
}
