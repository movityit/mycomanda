import fs from "fs";
import path from "path";

export type DisplayMode = "ready" | "preparing" | "hybrid";
export type NumberDisplay = "displayCode" | "ticketNumber";

export interface DisplayConfig {
    announcement: string;
    eventName: string;
    displayMode: DisplayMode;
    numberDisplay: NumberDisplay;
    ticketNumberMax: number;
    stationsEnabled: boolean;
    fullscreenAlertEnabled: boolean;
    autoScrollPagesEnabled: boolean;
    displayZoom: number;
    standardDisplayZoom: number;
    kitchenDisplayZoom: number;
    tablesDisplayZoom: number;
    tablesShowPreparing: boolean;
    tablesEnabled: boolean;
}

type Subscriber = (text: string) => void;
type ConfigSubscriber = (config: DisplayConfig) => void;

const CONFIG_PATH = path.join(process.cwd(), "data", "display-config.json");

const DEFAULT_CONFIG: DisplayConfig = {
    announcement: "",
    eventName: "",
    displayMode: "ready",
    numberDisplay: "displayCode",
    ticketNumberMax: 100,
    stationsEnabled: false,
    fullscreenAlertEnabled: true,
    autoScrollPagesEnabled: true,
    displayZoom: 100,
    standardDisplayZoom: 100,
    kitchenDisplayZoom: 100,
    tablesDisplayZoom: 100,
    tablesShowPreparing: false,
    tablesEnabled: false,
};

let cache: DisplayConfig = { ...DEFAULT_CONFIG };
let loaded = false;

function loadFromFile(): void {
    if (loaded) return;
    loaded = true;
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
            const parsed = JSON.parse(raw) as Partial<DisplayConfig>;
            cache = { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch {
        // Missing or corrupt file — keep defaults
    }
}

function saveToFile(): void {
    try {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cache, null, 2), "utf-8");
    } catch (err) {
        console.error("[display-config] Failed to persist config:", err);
    }
}

const announcementSubscribers = new Set<Subscriber>();
const configSubscribers = new Set<ConfigSubscriber>();

export function getConfig(): DisplayConfig {
    loadFromFile();
    return { ...cache };
}

export function updateConfig(patch: Partial<DisplayConfig>): DisplayConfig {
    loadFromFile();
    const prevAnnouncement = cache.announcement;
    cache = { ...cache, ...patch };
    saveToFile();

    if (patch.announcement !== undefined && patch.announcement !== prevAnnouncement) {
        announcementSubscribers.forEach((fn) => {
            try { fn(cache.announcement); } catch { /* subscriber gone */ }
        });
    }

    if (patch.displayMode !== undefined || patch.eventName !== undefined ||
        patch.numberDisplay !== undefined || patch.ticketNumberMax !== undefined ||
        patch.stationsEnabled !== undefined || patch.fullscreenAlertEnabled !== undefined ||
        patch.autoScrollPagesEnabled !== undefined || patch.displayZoom !== undefined ||
        patch.standardDisplayZoom !== undefined || patch.kitchenDisplayZoom !== undefined ||
        patch.tablesDisplayZoom !== undefined || patch.tablesShowPreparing !== undefined ||
        patch.tablesEnabled !== undefined) {
        configSubscribers.forEach((fn) => {
            try { fn({ ...cache }); } catch { /* subscriber gone */ }
        });
    }

    return { ...cache };
}

export function getAnnouncement(): string {
    loadFromFile();
    return cache.announcement;
}

export function setAnnouncement(text: string): void {
    updateConfig({ announcement: text });
}

export function subscribe(fn: Subscriber): () => void {
    announcementSubscribers.add(fn);
    return () => announcementSubscribers.delete(fn);
}

export function subscribeConfig(fn: ConfigSubscriber): () => void {
    loadFromFile();
    fn({ ...cache });
    configSubscribers.add(fn);
    return () => configSubscribers.delete(fn);
}
