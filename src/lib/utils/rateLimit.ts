import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import RateLimit from "@/lib/models/RateLimit";

export function clientIp(req: NextRequest): string {
    return (
        req.headers.get("x-real-ip")?.trim() ||
        (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
        "unknown"
    );
}

/**
 * Fixed-window rate limit backed by MongoDB.
 * Returns true if the request is allowed, false if the limit is exceeded.
 */
export async function checkRateLimit(
    scope: string,
    identifier: string,
    limit: number,
    windowSeconds: number
): Promise<boolean> {
    try {
        await connectDB();

        const windowIndex = Math.floor(Date.now() / (windowSeconds * 1000));
        const key = `${scope}:${identifier}:${windowIndex}`;
        const expiresAt = new Date((windowIndex + 1) * windowSeconds * 1000);

        const doc = await RateLimit.findOneAndUpdate(
            { key },
            { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
            { new: true, upsert: true }
        );

        return doc.count <= limit;
    } catch {
        // Fail open — never block legitimate traffic because the limiter itself failed
        return true;
    }
}