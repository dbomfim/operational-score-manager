/**
 * Client-side analytics event queue with 5-second flush.
 * Sends batches to admin.analyticsIngest.
 */
import { trpc } from "@/lib/trpc";

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 50;

interface QueuedEvent {
  sessionId: string;
  userId: string;
  eventType: string;
  page?: string;
  referrer?: string;
  entityType?: string;
  entityId?: string;
  featureName?: string;
  actionLabel?: string;
  duration?: number;
  loadTime?: number;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId = crypto.randomUUID();

function getUserId(): string {
  try {
    const raw = localStorage.getItem("osm_access_token");
    return raw ? "authenticated" : "anonymous";
  } catch {
    return "anonymous";
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

export function track(event: Omit<QueuedEvent, "sessionId" | "userId" | "timestamp">) {
  queue.push({
    ...event,
    sessionId,
    userId: getUserId(),
    timestamp: new Date(),
  });
  if (queue.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
}

export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await (trpc as unknown as { admin: { analyticsIngest: { mutate: (i: { events: QueuedEvent[] }) => Promise<unknown> } } }).admin.analyticsIngest.mutate({
      events: batch,
    });
  } catch {
    // Re-queue on failure (simplified: drop for now)
  }
}
