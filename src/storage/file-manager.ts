import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import type { MapPayload, Lock } from "../contracts/data-models";

const DATA_DIR = path.join(process.cwd(), "data");
const MAP_FILE = path.join(DATA_DIR, "school-map.json");
const LOCK_FILE = path.join(DATA_DIR, "edit.lock");

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readMapPayload(): Promise<MapPayload> {
  try {
    const data = await readFile(MAP_FILE, "utf-8");
    return JSON.parse(data) as MapPayload;
  } catch {
    return {
      meta: { width: 0, height: 0 },
      walls: [],
      nodes: {},
      rooms: {},
      teleporters: {}
    };
  }
}

export async function writeMapPayload(payload: MapPayload): Promise<void> {
  await ensureDataDir();
  await writeFile(MAP_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

export async function readLockStatus(): Promise<Lock> {
  try {
    const data = await readFile(LOCK_FILE, "utf-8");
    const lock = JSON.parse(data) as Lock;
    const now = Date.now();
    
    if (lock.is_locked && (now - lock.timestamp > TWO_HOURS_MS)) {
      await deleteLock();
      return { is_locked: false, locked_by: "", timestamp: 0 };
    }
    
    return lock;
  } catch {
    return { is_locked: false, locked_by: "", timestamp: 0 };
  }
}

export async function writeLock(locked_by: string): Promise<void> {
  await ensureDataDir();
  const lock: Lock = {
    is_locked: true,
    locked_by,
    timestamp: Date.now()
  };
  await writeFile(LOCK_FILE, JSON.stringify(lock, null, 2), "utf-8");
}

export async function deleteLock(): Promise<void> {
  await rm(LOCK_FILE, { force: true });
}
