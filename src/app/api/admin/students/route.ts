import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { getStudents, createStudent, } from "@/lib/services/studentService";
import { validateStudentInput } from "@/lib/utils/validation";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { Grade } from "@/lib/constants/grades";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const result = await getStudents({
      search: searchParams.get("search") ?? "",
      gender: searchParams.get("gender") ?? "",
      page: Number(searchParams.get("page") ?? 1),
      limit: Number(searchParams.get("limit") ?? 20),
      sort: searchParams.get("sort") ?? "-createdAt",
    });
    return apiSuccess(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب الطلاب.";
    return apiError(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const ip =
      (req.headers.get("x-forwarded-for") ?? "")
        .split(",")[0]
        .trim() || "unknown";
    const userAgent = req.headers.get("user-agent") ?? "";

    const errors = validateStudentInput(body);
    if (errors.length > 0) return apiError(errors[0], 422);

    const student = await createStudent({
      name: String(body.name).trim(),
      gender: body.gender as "ذكر" | "أنثى",
      studentPhone: String(body.studentPhone).trim(),
      parentPhone: String(body.parentPhone).trim(),
      school: String(body.school).trim(),
      parentJob: String(body.parentJob).trim(),
      grade: String(body.grade).trim() as Grade,
      track: body.track ? String(body.track).trim() : "",
      createdBy: "student",
      ip,
      userAgent,
    });

    return apiSuccess(student, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في إضافة الطالب.";
    return apiError(message, 400);
  }
}
