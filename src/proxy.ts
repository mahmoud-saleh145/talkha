import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";

export async function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const token = req.cookies.get("admin_token")?.value;

    if (pathname === "/admin") {
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
    matcher: ["/admin/:path*"],
};