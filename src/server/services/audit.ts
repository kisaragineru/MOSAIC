import { auditEvents } from "../db/schema";
import type { Tx } from "../db/tx";

/** Record a security-relevant action. Never pass personal content here. */
export async function audit(tx: Tx, userId: string | null, action: string, targetType?: string, targetId?: string) {
  await tx.insert(auditEvents).values({ userId, action, targetType: targetType ?? null, targetId: targetId ?? null });
}
