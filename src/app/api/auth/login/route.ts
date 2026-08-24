import { NextRequest, NextResponse } from "next/server";
import { loginAdmin } from "@/lib/services/adminService";
import { apiError } from "@/lib/utils/response";
import { connectDB } from "@/lib/db/mongoose";
import { checkRateLimit, clientIp } from "@/lib/utils/rateLimit";

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const ip = clientIp(req);

    // 10 admin login attempts per IP per 10 minutes
    const allowed = await checkRateLimit("admin-login", ip, 10, 600);
    if (!allowed) {
      return apiError("عدد محاولات كبير جداً. يرجى المحاولة بعد قليل.", 429);
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("يرجى تعبئة البريد الإلكتروني وكلمة المرور.", 400);
    }

    const { token, admin } = await loginAdmin(email, password);

    const res = NextResponse.json({ success: true, data: { admin } }, { status: 200 });

    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في تسجيل الدخول.";
    return apiError(message, 401);
  }
}