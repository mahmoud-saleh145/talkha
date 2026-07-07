// src/app/api/admin/schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { saveScheduleRecord, getAllSchedules } from "@/lib/services/scheduleService";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { ALL_GRADES, Grade } from '@/lib/constants/grades';

const VALID_GRADES = new Set<string>(ALL_GRADES);

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const schedules = await getAllSchedules();
    return apiSuccess(schedules);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب الجداول.";
    return apiError(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { grade, imageUrl, publicId } = body;

    if (!grade || !VALID_GRADES.has(grade)) {
      return apiError("يرجى اختيار الصف الدراسي.", 422);
    }
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
      return apiError("رابط الصورة غير صحيح.", 422);
    }
    if (!publicId || typeof publicId !== "string") {
      return apiError("معرّف الصورة مطلوب.", 422);
    }

    const schedule = await saveScheduleRecord(grade as Grade, imageUrl, publicId);
    return apiSuccess(schedule, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في حفظ الجدول.";
    return apiError(message, 500);
  }
}
