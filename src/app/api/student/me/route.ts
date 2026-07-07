import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import Student from "@/lib/models/Student";
import { apiSuccess, apiError } from "@/lib/utils/response";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const student = await Student.findById(auth.sub).lean();
    if (!student) return apiError("الطالب غير موجود.", 404);
    return apiSuccess(student);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب بيانات الطالب.";
    return apiError(message, 500);
  }
}
