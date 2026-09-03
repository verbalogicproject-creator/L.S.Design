/**
 * Connectivity probe. Generated screen HTML usually needs a stylesheet CDN, a
 * font service and remote images, so the interface paints the stored PNG unless
 * this says the network is reachable. Cached, because it is asked on every poll.
 */
const PROBE_URL = "https://cdn.tailwindcss.com/";
const TTL_MS = 60_000;
const TIMEOUT_MS = 2_500;

let cachedAt = 0;
let cached = false;
let inflight: Promise<boolean> | null = null;

export async function isOnline(now: number = Date.now()): Promise<boolean> {
  if (now - cachedAt < TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = probe()
    .then((result) => {
      cached = result;
      cachedAt = Date.now();
      return result;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function probe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(PROBE_URL, { method: "HEAD", signal: controller.signal });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Test seam: forget the cached answer. */
export function resetOnlineCache(): void {
  cachedAt = 0;
  cached = false;
}
