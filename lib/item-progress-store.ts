import fs from "fs";
import path from "path";

type ProgressMap = Record<string, number>;
type OrderProgress = Record<string, ProgressMap>;

type ProgressSubscriber = (orderId: string, stationId: string, progress: ProgressMap) => void;

const PROGRESS_PATH = path.join(process.cwd(), "data", "item-progress.json");

const DEFAULT_PROGRESS: Record<string, OrderProgress> = {};

let cache: Record<string, OrderProgress> = { ...DEFAULT_PROGRESS };
let loaded = false;

const subscribers = new Set<ProgressSubscriber>();

function loadFromFile(): void {
    if (loaded) return;
    loaded = true;
    try {
        if (fs.existsSync(PROGRESS_PATH)) {
            const raw = fs.readFileSync(PROGRESS_PATH, "utf-8");
            cache = JSON.parse(raw) as Record<string, OrderProgress>;
        }
    } catch {
        cache = { ...DEFAULT_PROGRESS };
    }
}

function saveToFile(): void {
    try {
        fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
        fs.writeFileSync(PROGRESS_PATH, JSON.stringify(cache, null, 2), "utf-8");
    } catch (err) {
        console.error("[item-progress] Failed to persist progress:", err);
    }
}

function getStationProgress(orderId: string, stationId: string): ProgressMap {
    loadFromFile();
    return { ...(cache[orderId]?.[stationId] ?? {}) };
}

function setStationProgress(orderId: string, stationId: string, progress: ProgressMap): ProgressMap {
    loadFromFile();
    cache[orderId] = cache[orderId] ?? {};
    cache[orderId][stationId] = progress;
    saveToFile();
    subscribers.forEach((fn) => {
        try { fn(orderId, stationId, { ...progress }); } catch { /* ignore */ }
    });
    return { ...progress };
}

function updateStationProgress(orderId: string, stationId: string, itemId: string, count: number): ProgressMap {
    loadFromFile();
    cache[orderId] = cache[orderId] ?? {};
    const station = cache[orderId][stationId] ?? {};
    station[itemId] = count;
    cache[orderId][stationId] = station;
    saveToFile();
    subscribers.forEach((fn) => {
        try { fn(orderId, stationId, { ...station }); } catch { /* ignore */ }
    });
    return { ...station };
}

function resetStationProgress(orderId: string, stationId: string): void {
    loadFromFile();
    if (!cache[orderId]) return;
    delete cache[orderId][stationId];
    saveToFile();
    subscribers.forEach((fn) => {
        try { fn(orderId, stationId, {}); } catch { /* ignore */ }
    });
}

export function getProgress(orderId: string, stationId: string): ProgressMap {
    return getStationProgress(orderId, stationId);
}

export function setProgress(orderId: string, stationId: string, progress: ProgressMap): ProgressMap {
    return setStationProgress(orderId, stationId, progress);
}

export function updateProgress(orderId: string, stationId: string, itemId: string, count: number): ProgressMap {
    return updateStationProgress(orderId, stationId, itemId, count);
}

export function resetProgress(orderId: string, stationId: string): void {
    resetStationProgress(orderId, stationId);
}

export function subscribeProgress(fn: ProgressSubscriber): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}
