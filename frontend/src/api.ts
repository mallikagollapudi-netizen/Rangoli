// Fully offline: all artworks are stored on the device.
import { Artwork } from "./drawing";
import { storage } from "./utils/storage";

const KEY = "rangoli.artworks.v1";

export type ArtworkInput = Omit<Artwork, "id" | "created_at" | "updated_at">;

async function readAll(): Promise<Artwork[]> {
  const raw = await storage.getItem(KEY, "[]");
  try {
    return JSON.parse(raw ?? "[]") as Artwork[];
  } catch {
    return [];
  }
}

async function writeAll(list: Artwork[]) {
  const ok = await storage.setItem(KEY, JSON.stringify(list));
  if (!ok) throw new Error("Couldn't save on this device");
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const api = {
  list: async () => {
    const all = await readAll();
    return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  get: async (id: string) => {
    const found = (await readAll()).find((a) => a.id === id);
    if (!found) throw new Error("Artwork not found");
    return found;
  },
  create: async (a: ArtworkInput) => {
    const ts = new Date().toISOString();
    const art: Artwork = { ...a, id: newId(), created_at: ts, updated_at: ts };
    await writeAll([art, ...(await readAll())]);
    return art;
  },
  update: async (id: string, a: ArtworkInput) => {
    const all = await readAll();
    const idx = all.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error("Artwork not found");
    const art: Artwork = { ...all[idx], ...a, id, updated_at: new Date().toISOString() };
    all[idx] = art;
    await writeAll(all);
    return art;
  },
  remove: async (id: string) => {
    await writeAll((await readAll()).filter((a) => a.id !== id));
    return { ok: true };
  },
};
