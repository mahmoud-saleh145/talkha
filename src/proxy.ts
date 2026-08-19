import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";

export async function proxy(req: NextRequest) {
    const token = req.cookies.get("admin_token")?.value;

    if (token) {
        const payload = await verifyToken(token);

        if (req.nextUrl.pathname === "/admin") {
            if (payload?.role === "أدمن") {
                return NextResponse.redirect(
                    new URL("/admin/dashboard", req.url)
                );
            }
            if (payload && payload.role == "مشرف") {
                return NextResponse.redirect(
                    new URL("/admin/supervisor", req.url)
                );
            }
        }

        if (payload?.role === "أدمن") {

            if (req.nextUrl.pathname === "/admin/supervisor") {
                return NextResponse.redirect(
                    new URL("/admin/dashboard", req.url)
                );
            }
        }

        if (payload?.role == "مشرف") {

            if (req.nextUrl.pathname === "/admin/dashboard" ||
                req.nextUrl.pathname === "/admin/manage" ||
                req.nextUrl.pathname === "/admin/schedules" ||
                req.nextUrl.pathname === "/admin/statistics" ||
                req.nextUrl.pathname === "/admin/settings") {
                return NextResponse.redirect(
                    new URL("/admin/supervisor", req.url)
                );
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};