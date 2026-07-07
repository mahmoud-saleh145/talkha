import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import Student from "@/lib/models/Student";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { getSchedulesByGrade } from "@/lib/services/scheduleService";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    // Fetch the student's grade from DB (source of truth, not the token)
    const student = await Student.findById(auth.sub).select("grade").lean();
    if (!student) return apiError("الطالب غير موجود.", 404);

    const schedules = await getSchedulesByGrade(student.grade);
    return apiSuccess(schedules);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب الجداول.";
    return apiError(message, 500);
  }
}
