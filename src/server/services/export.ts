/**
 * Full personal data export as a single, self-describing JSON document.
 *
 * Designed for portability: plain JSON, ISO dates, stable ids, and a snapshot of every
 * question version the user answered (so answers remain meaningful outside MOSAIC).
 * Nothing about OTHER users is included except what they consented to share in
 * comparisons the exporting user took part in (stored comparison results).
 */
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { enforceRateLimit } from "../auth/rate-limit";
import * as s from "../db/schema";
import { withUser } from "../db/tx";
import { audit } from "./audit";

export const EXPORT_FORMAT_VERSION = 1;

export async function buildExport(userId: string) {
  await enforceRateLimit("export", userId);
  return withUser(userId, async (tx) => {
    const [job] = await tx.insert(s.dataExportJobs).values({ userId, status: "running" }).returning();
    const [account] = await tx
      .select({ id: s.users.id, email: s.users.email, createdAt: s.users.createdAt })
      .from(s.users)
      .where(eq(s.users.id, userId));
    const [profile] = await tx.select().from(s.profiles).where(eq(s.profiles.userId, userId));
    const [notifications] = await tx.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, userId));

    const entries = await tx.select().from(s.memoryEntries).where(eq(s.memoryEntries.userId, userId)).orderBy(asc(s.memoryEntries.createdAt));
    const versions = await tx.select().from(s.memoryEntryVersions).where(eq(s.memoryEntryVersions.userId, userId)).orderBy(asc(s.memoryEntryVersions.version));
    const tags = await tx.select().from(s.memoryTags).where(eq(s.memoryTags.userId, userId));
    const mpeople = await tx.select().from(s.memoryPeople).where(eq(s.memoryPeople.userId, userId));
    const circles = await tx.select().from(s.memoryCircles).where(eq(s.memoryCircles.ownerId, userId));

    const responses = await tx.select().from(s.questionResponses).where(eq(s.questionResponses.userId, userId)).orderBy(asc(s.questionResponses.answeredAt));
    const qids = [...new Set(responses.map((r) => r.questionId))];
    const qversions = qids.length ? await tx.select().from(s.questionVersions).where(inArray(s.questionVersions.questionId, qids)) : [];
    const qdefs = qids.length ? await tx.select().from(s.questionDefinitions).where(inArray(s.questionDefinitions.id, qids)) : [];

    const feedback = await tx.select().from(s.questionFeedback).where(eq(s.questionFeedback.userId, userId));
    // "How do you see me?": requests both ways (with my own answers when I was asked) and what
    // others said about me — anonymous answers only as the summary the app shows.
    const peerRequests = (await tx.execute(sql`select * from peer_requests_mine() order by created_at`)).rows;
    const peerResults = (await tx.execute(sql`select * from peer_results()`)).rows;
    // Comments I wrote on records (mine or others'); others' words to me stay theirs.
    const commentsWritten = (await tx.execute(sql`select * from memory_comments_authored()`)).rows;
    // Messages I sent (others' messages to me stay theirs).
    const messagesSent = (await tx.execute(sql`select * from dm_messages_authored()`)).rows;
    const photo = (await tx.execute<{ mime: string; bytes: Buffer; version: number }>(sql`select * from avatar_get(${userId})`)).rows[0];
    const profilePhoto = photo ? { mime: photo.mime, base64: Buffer.from(photo.bytes).toString("base64") } : null;
    const manualShares = await tx.select().from(s.manualShares).where(eq(s.manualShares.ownerId, userId));
    const [manualRewrite] = await tx.select().from(s.manualRewrites).where(eq(s.manualRewrites.userId, userId));
    const memoryReplies = await tx.select().from(s.memoryReplies).where(eq(s.memoryReplies.ownerId, userId)).orderBy(asc(s.memoryReplies.createdAt));
    const manualShareRewrites = await tx.select().from(s.manualShareRewrites).where(eq(s.manualShareRewrites.ownerId, userId));
    // Gift boxes I write in or received, each as I may see it (see gift_box_read).
    const giftIds = (await tx.execute<{ id: string }>(sql`select id from gift_boxes_mine()`)).rows;
    const giftBoxes = [];
    for (const g of giftIds) giftBoxes.push((await tx.execute<{ b: unknown }>(sql`select gift_box_read(${g.id}) as b`)).rows[0]!.b);
    const claims = await tx.select().from(s.tendencyClaims).where(eq(s.tendencyClaims.userId, userId));
    const evidence = await tx.select().from(s.tendencyEvidence).where(eq(s.tendencyEvidence.userId, userId));

    const [birth] = await tx.select().from(s.birthProfiles).where(eq(s.birthProfiles.userId, userId));
    const charts = await tx.select().from(s.tuviCharts).where(eq(s.tuviCharts.userId, userId)).orderBy(asc(s.tuviCharts.createdAt));
    const interps = await tx.select().from(s.tuviInterpretations).where(eq(s.tuviInterpretations.userId, userId));

    const ppl = await tx.select().from(s.people).where(eq(s.people.userId, userId));
    const relEntries = await tx.select().from(s.relationshipEntries).where(eq(s.relationshipEntries.userId, userId));
    const relEvents = await tx.select().from(s.relationshipEvents).where(eq(s.relationshipEvents.userId, userId));
    const gifts = await tx.select().from(s.giftRecords).where(eq(s.giftRecords.userId, userId));
    const dates = await tx.select().from(s.importantDates).where(eq(s.importantDates.userId, userId));
    const prefItems = await tx.select().from(s.preferenceItems).where(eq(s.preferenceItems.userId, userId));
    const prefValues = await tx.select().from(s.preferenceValues).where(eq(s.preferenceValues.userId, userId)).orderBy(asc(s.preferenceValues.recordedAt));

    const shares = await tx
      .select({ id: s.profileShares.id, label: s.profileShares.label, createdAt: s.profileShares.createdAt, expiresAt: s.profileShares.expiresAt, revokedAt: s.profileShares.revokedAt, useCount: s.profileShares.useCount })
      .from(s.profileShares)
      .where(eq(s.profileShares.userId, userId));
    const sessions = await tx
      .select()
      .from(s.comparisonSessions)
      .where(or(eq(s.comparisonSessions.userA, userId), eq(s.comparisonSessions.userB, userId)));
    const sids = sessions.map((x) => x.id);
    const myConsents = sids.length
      ? await tx.select().from(s.comparisonConsents).where(and(inArray(s.comparisonConsents.sessionId, sids), eq(s.comparisonConsents.userId, userId)))
      : [];
    const results = sids.length ? await tx.select().from(s.comparisonResults).where(inArray(s.comparisonResults.sessionId, sids)) : [];
    const auditRows = await tx
      .select({ action: s.auditEvents.action, targetType: s.auditEvents.targetType, targetId: s.auditEvents.targetId, createdAt: s.auditEvents.createdAt })
      .from(s.auditEvents)
      .where(eq(s.auditEvents.userId, userId))
      .orderBy(asc(s.auditEvents.createdAt));

    const prefsFor = (personId: string | null) =>
      prefItems
        .filter((i) => i.personId === personId)
        .map((i) => ({ ...i, values: prefValues.filter((v) => v.itemId === i.id) }));

    const doc = {
      format: "mosaic-export",
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      notes: [
        "All timestamps are ISO 8601 (UTC). Dates without time are YYYY-MM-DD.",
        "memories[].versions holds every saved version; the highest version is current.",
        "questionResponses keeps every answer, skip and correction; questions[] has the exact wording of each version.",
        "tendencies are derived by MOSAIC's rule model and are not your own words; evidence lists the response ids used.",
        "Tử Vi charts include the ruleset and engine version used to compute them.",
      ],
      account,
      profile,
      notificationPreferences: notifications ?? null,
      memories: entries.map((e) => ({
        ...e,
        versions: versions.filter((v) => v.entryId === e.id),
        tags: tags.filter((t) => t.entryId === e.id).map((t) => t.tag),
        personIds: mpeople.filter((m) => m.entryId === e.id).map((m) => m.personId),
        sharedWithCircles: circles.filter((c) => c.entryId === e.id).map((c) => c.circle),
      })),
      questions: qdefs.map((d) => ({ ...d, versions: qversions.filter((v) => v.questionId === d.id) })),
      questionResponses: responses,
      questionFeedback: feedback,
      peerRequests,
      peerResults,
      commentsWritten,
      messagesSent,
      profilePhoto,
      manualShares,
      manualRewrite: manualRewrite ?? null,
      memoryReplies,
      manualShareRewrites,
      giftBoxes,
      tendencies: claims.map((c) => ({ ...c, evidence: evidence.filter((e) => e.claimId === c.id) })),
      tuvi: {
        birthProfile: birth ?? null,
        charts: charts.map((c) => ({ ...c, interpretations: interps.filter((i) => i.chartId === c.id) })),
      },
      selfPreferences: prefsFor(null),
      people: ppl.map((p) => ({
        ...p,
        notes: relEntries.filter((e) => e.personId === p.id),
        events: relEvents.filter((e) => e.personId === p.id),
        gifts: gifts.filter((g) => g.personId === p.id),
        importantDates: dates.filter((d) => d.personId === p.id),
        preferences: prefsFor(p.id),
      })),
      importantDates: dates.filter((d) => d.personId === null),
      shares,
      comparisons: sessions.map((x) => ({
        id: x.id,
        role: x.userA === userId ? "link_owner" : "link_opener",
        status: x.status,
        createdAt: x.createdAt,
        revokedAt: x.revokedAt,
        myConsents: myConsents.filter((c) => c.sessionId === x.id),
        result: results.find((r) => r.sessionId === x.id)?.result ?? null,
      })),
      auditEvents: auditRows,
    };
    const json = JSON.stringify(doc, null, 2);
    await tx
      .update(s.dataExportJobs)
      .set({ status: "completed", completedAt: new Date(), byteSize: Buffer.byteLength(json) })
      .where(eq(s.dataExportJobs.id, job!.id));
    await audit(tx, userId, "data.exported", "data_export_job", job!.id);
    return { json, filename: `mosaic-export-${new Date().toISOString().slice(0, 10)}.json` };
  });
}

export async function listExportJobs(userId: string) {
  return withUser(userId, (tx) =>
    tx.select().from(s.dataExportJobs).where(eq(s.dataExportJobs.userId, userId)).orderBy(asc(s.dataExportJobs.createdAt)),
  );
}
