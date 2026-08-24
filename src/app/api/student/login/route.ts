import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Student from "@/lib/models/Student";
import { signStudentToken, verifyToken } from "@/lib/utils/jwt";
import { apiError } from "@/lib/utils/response";
import { checkRateLimit, clientIp } from "@/lib/utils/rateLimit";

const EG_PHONE = /^01[0125]\d{8}$/;
const QUADRUPLE_NAME = /^\S+(\s+\S+){3,}/;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const adminToken = req.cookies.get("admin_token")?.value;
    const adminPayload = adminToken ? await verifyToken(adminToken) : null;
    console.log("adminToken", adminToken);
    console.log("adminPayload", adminPayload);

    if (!adminPayload) {
      // 10 login attempts per IP per 10 minutes
      const allowed = await checkRateLimit("student-login", ip, 10, 600);
      if (!allowed) {
        return apiError("عدد محاولات كبير جداً. يرجى المحاولة بعد قليل.", 429);
      }
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    // Basic validation
    if (!name || name.length > 100 || !QUADRUPLE_NAME.test(name)) {
      return apiError("يرجى إدخال الاسم رباعياً على الأقل (4 كلمات).", 422);
    }
    if (!phone || !EG_PHONE.test(phone)) {
      return apiError("رقم الهاتف غير صحيح. يجب أن يبدأ بـ 01 ويتكون من 11 رقماً.", 422);
    }

    await connectDB();

    // Exact match — no dynamic RegExp. Arabic has no letter case, so the
    // previous case-insensitive regex added nothing but a full collection scan
    // and let user input build the pattern.
    const student = await Student.findOne({
      name: name,
      studentPhone: phone,
    }).lean();

    if (!student) {
      return apiError(
        "لم يتم العثور على طالب بهذا الاسم ورقم الهاتف. تأكد من البيانات أو تواصل مع الإدارة.",
        401
      );
    }

    if (adminToken) {
      if (adminPayload) {
        return NextResponse.json(
          {
            success: true,
            data: {
              name: student.name,
              code: student.code,
              grade: student.grade,
            },
          },
          { status: 200 }
        );
      }
    }

    // Sign student JWT
    const token = await signStudentToken({
      sub: String(student._id),
      name: student.name,
      phone: student.studentPhone,
      type: "student",
    });

    const res = NextResponse.json(
      {
        success: true,
        data: {
          name: student.name,
          code: student.code,
          grade: student.grade,
        },
      },
      { status: 200 }
    );
    if (!adminPayload) {

      res.cookies.set("student_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return res;
  } catch (err) {
    console.error("student login error:", err);
    return apiError("خطأ في تسجيل الدخول.", 500);
  }
}