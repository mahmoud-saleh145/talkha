import { NextRequest, NextResponse } from "next/server";

export const DEVICE_COOKIE = "device_id";

// Two years — the device identity must survive IP changes, restarts and sessions
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

const SECRET = process.env.DEVICE_ID_SECRET ?? process.env.JWT_SECRET ?? "";

if (!SECRET) {
    throw new Error(
        "DEVICE_ID_SECRET (or JWT_SECRET) must be set to sign device identifiers."
    );
}

const encoder = new TextEncoder();

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Web Crypto is used (not node:crypto) so this works in both the Edge
// proxy runtime and the Node runtime used by API route handlers.
let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
    if (!keyPromise) {
        keyPromise = crypto.subtle.importKey(
            "raw",
            encoder.encode(SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
    }
    return keyPromise;
}

function toBase64Url(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

async function sign(value: string): Promise<string> {
    const key = await getKey();
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
    return toBase64Url(sig);
}

function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

export function newDeviceId(): string {
    return crypto.randomUUID();
}

export async function signDeviceId(id: string): Promise<string> {
    return `${id}.${await sign(id)}`;
}

/** Verifies a cookie value and returns the raw device id, or null if tampered. */
export async function readDeviceId(
    raw: string | undefined
): Promise<string | null> {
    if (!raw) return null;

    const dot = raw.lastIndexOf(".");
    if (dot <= 0) return null;

    const id = raw.slice(0, dot);
    const signature = raw.slice(dot + 1);

    if (!UUID_RE.test(id)) return null;

    return safeEqual(signature, await sign(id)) ? id : null;
}

export function setDeviceCookie(res: NextResponse, signedValue: string): void {
    res.cookies.set(DEVICE_COOKIE, signedValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: DEVICE_COOKIE_MAX_AGE,
        path: "/",
    });
}

/**
 * Returns the verified device id for this request.
 * `issued` is non-null only when a new cookie must be attached to the response.
 */
export async function getOrCreateDeviceId(
    req: NextRequest
): Promise<{ deviceId: string; issued: string | null }> {
    const existing = await readDeviceId(req.cookies.get(DEVICE_COOKIE)?.value);
    if (existing) return { deviceId: existing, issued: null };

    const id = newDeviceId();
    return { deviceId: id, issued: await signDeviceId(id) };
}