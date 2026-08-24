import { connectDB } from "@/lib/db/mongoose";
import DeviceRegistration from "@/lib/models/DeviceRegistration";

const TIMEZONE = "Africa/Cairo";
const CLAIM_TTL_MS = 1000 * 60 * 60 * 48; // 48h — safely past the end of the day

/** Successful registrations allowed per device per calendar day. */
export const DAILY_DEVICE_REGISTRATION_LIMIT = 3;

/** Calendar day key (YYYY-MM-DD) in the centre's local timezone. */
export function currentDayKey(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function isDuplicateKeyError(err: unknown): boolean {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { code?: number }).code === 11000
    );
}

/**
 * Atomically claims one of today's registration slots for a device.
 * Returns true if a slot was claimed, false once the daily limit is reached.
 *
 * findOneAndUpdate + $inc is a single atomic MongoDB operation, and the
 * unique { deviceId, day } index guarantees only one counter document
 * exists — so two simultaneous requests always receive different counts
 * and cannot both consume the same slot.
 */
export async function claimDailyDeviceSlot(deviceId: string): Promise<boolean> {
    await connectDB();

    const day = currentDayKey();
    const expiresAt = new Date(Date.now() + CLAIM_TTL_MS);

    // Two attempts: a concurrent upsert can lose the insert race once (E11000),
    // after which the document exists and the retry is a plain $inc.
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const doc = await DeviceRegistration.findOneAndUpdate(
                { deviceId, day },
                { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
                { new: true, upsert: true }
            );

            return doc.count <= DAILY_DEVICE_REGISTRATION_LIMIT;
        } catch (err) {
            if (isDuplicateKeyError(err) && attempt === 0) continue;
            throw err;
        }
    }

    return false;
}

/**
 * Returns a claimed slot — used when the registration itself fails, so a
 * rejected attempt never consumes one of the device's daily registrations.
 */
export async function releaseDailyDeviceSlot(deviceId: string): Promise<void> {
    try {
        await connectDB();
        await DeviceRegistration.updateOne(
            { deviceId, day: currentDayKey(), count: { $gt: 0 } },
            { $inc: { count: -1 } }
        );
    } catch {
        // Non-fatal — the TTL index will clear the document within 48h
    }
}