import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyStudentToken, verifyToken } from "@/lib/utils/jwt";
import { getOrCreateDeviceId, setDeviceCookie } from "@/lib/utils/deviceId";

export async function proxy(req: NextRequest) {
    const res = await handleRequest(req);

    // Issue a persistent, signed device cookie to every visitor.
    // Tied to the browser profile, so it survives IP changes.
    const { issued } = await getOrCreateDeviceId(req);
    if (issued) setDeviceCookie(res, issued);

    return res;
}

async function handleRequest(req: NextRequest): Promise<NextResponse> {
    const pathname = req.nextUrl.pathname;

    // Non-admin routes: no auth logic here, only the device cookie above
    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    const token = req.cookies.get("admin_token")?.value;
    const studentToken = req.cookies.get("student_token")?.value;

    if (studentToken && !token && pathname === "/") {
        const studentPayload = await verifyStudentToken(studentToken);

        if (studentPayload) {
            return NextResponse.redirect(
                new URL("/student/account", req.url)
            );
        }

    }

    if (pathname === "/admin" && !token) {
        return NextResponse.next();
    }
    // No token
    if (!token) {
        return NextResponse.redirect(
            new URL("/admin", req.url)
        );
    }

    // Invalid / expired token
    const payload = await verifyToken(token);

    if (!payload) {
        return NextResponse.redirect(
            new URL("/admin", req.url)
        );
    }

    // Admin
    if (payload.role === "أدمن") {
        if (pathname === "/admin" || pathname === "/admin/supervisor") {
            return NextResponse.redirect(
                new URL("/admin/dashboard", req.url)
            );
        }

        return NextResponse.next();
    }

    // Supervisor
    if (payload.role === "مشرف") {
        if (pathname === "/admin") {
            return NextResponse.redirect(
                new URL("/admin/supervisor", req.url)
            );
        }

        const adminOnlyPaths = [
            "/admin/dashboard",
            "/admin/manage",
            "/admin/schedules",
            "/admin/statistics",
            "/admin/settings",
        ];

        if (adminOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
            return NextResponse.redirect(
                new URL("/admin/supervisor", req.url)
            );
        }

        return NextResponse.next();
    }

    // Unknown role
    return NextResponse.redirect(
        new URL("/admin", req.url)
    );
}

export const config = {
    // Widened so the device cookie is issued on page loads (including the
    // registration page). API routes are excluded — /api/students/register
    // issues the cookie itself as a fallback.
    matcher: [
        "/((?!api|_next/static|_next/image|assets|favicon.ico).*)",
    ],
};