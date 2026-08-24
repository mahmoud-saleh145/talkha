import { NextRequest } from "next/server";
import { createStudent } from "@/lib/services/studentService";
import { validateStudentInput } from "@/lib/utils/validation";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { Branch, Grade } from "@/lib/constants/grades";
import { checkRateLimit, clientIp } from "@/lib/utils/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);

    // 5 registrations per IP per 10 minutes
    // const allowed = await checkRateLimit("register", ip, 5, 600);
    // if (!allowed) {
    //   return apiError("عدد محاولات كبير جداً. يرجى المحاولة بعد قليل.", 429);
    // }

    if (ip === "156.197.219.113") {
      return apiError("blocked")
    }
    const body = await req.json();
    const userAgent = req.headers.get("user-agent") ?? "";

    const errors = validateStudentInput(body);
    if (errors.length > 0) {
      return apiError(errors[0], 422);
    }

    const student = await createStudent({
      name: String(body.name).trim(),
      gender: body.gender as "ذكر" | "أنثى",
      grade: String(body.grade).trim() as Grade,
      track: body.track ? String(body.track).trim() : "",
      studentPhone: String(body.studentPhone).trim(),
      parentPhone: String(body.parentPhone).trim(),
      branch: String(body.branch).trim() as Branch,
      school: String(body.school).trim(),
      parentJob: String(body.parentJob).trim(),
      createdBy: "student",
      ip,
      userAgent,
    });

    return apiSuccess({ code: student.code, name: student.name }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في تسجيل الطالب.";
    return apiError(message, 400);
  }
}
