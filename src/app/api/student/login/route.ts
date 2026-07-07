import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Student from "@/lib/models/Student";
import { signStudentToken } from "@/lib/utils/jwt";
import { apiError } from "@/lib/utils/response";

const EG_PHONE = /^01[0125]\d{8}$/;
const QUADRUPLE_NAME = /^\S+(\s+\S+){3,}/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    // Basic validation
    if (!name || !QUADRUPLE_NAME.test(name)) {
      return apiError("يرجى إدخال الاسم رباعياً على الأقل (4 كلمات).", 422);
    }
    if (!phone || !EG_PHONE.test(phone)) {
      return apiError("رقم الهاتف غير صحيح. يجب أن يبدأ بـ 01 ويتكون من 11 رقماً.", 422);
    }

    await connectDB();

    // Look up student by name AND phone — both must match
    const student = await Student.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      studentPhone: phone,
    }).lean();

    if (!student) {
      return apiError(
        "لم يتم العثور على طالب بهذا الاسم ورقم الهاتف. تأكد من البيانات أو تواصل مع الإدارة.",
        401
      );
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

    res.cookies.set("student_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في تسجيل الدخول.";
    return apiError(message, 500);
  }
}
