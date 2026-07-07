import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, seedInitialAdmin } from "@/lib/services/adminService";
import { apiError } from "@/lib/utils/response";
import { connectDB } from "@/lib/db/mongoose";

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    await seedInitialAdmin();

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
