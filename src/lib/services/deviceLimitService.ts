import { connectDB } from "@/lib/db/mongoose";
import DeviceRegistration from "@/lib/models/DeviceRegistration";

const TIMEZONE = "Africa/Cairo";
const CLAIM_TTL_MS = 1000 * 60 * 60 * 48; // 48h — safely past the end of the day

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
 * Atomically claims today's single registration slot for a device.
 * Returns true if the slot was claimed, false if this device already
 * registered today. The unique { deviceId, day } index guarantees that
 * two simultaneous requests cannot both claim the same slot.
 */
export async function claimDailyDeviceSlot(deviceId: string): Promise<boolean> {
    await connectDB();

    const day = currentDayKey();
    const expiresAt = new Date(Date.now() + CLAIM_TTL_MS);

    try {
        const result = await DeviceRegistration.updateOne(
            { deviceId, day },
            { $setOnInsert: { expiresAt } },
            { upsert: true }
        );

        return result.upsertedCount > 0;
    } catch (err) {
        // Lost the race against a concurrent request from the same device
        if (isDuplicateKeyError(err)) return false;
        throw err;
    }
}

/**
 * Releases a claimed slot — used when the registration itself fails, so a
 * device is never locked out for the day by a rejected attempt.
 */
export async function releaseDailyDeviceSlot(deviceId: string): Promise<void> {
    try {
        await connectDB();
        await DeviceRegistration.deleteOne({ deviceId, day: currentDayKey() });
    } catch {
        // Non-fatal — the TTL index will clear it within 48h
    }
}