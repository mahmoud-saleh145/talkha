import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";

export async function proxy(req: NextRequest) {
    const token = req.cookies.get("admin_token")?.value;

    if (req.nextUrl.pathname === "/admin") {
        if (token) {
            const payload = await verifyToken(token);

            if (payload) {
                return NextResponse.redirect(
                    new URL("/admin/dashboard", req.url)
                );
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin"],
};