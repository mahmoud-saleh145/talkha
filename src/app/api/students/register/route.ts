import { NextRequest, NextResponse } from "next/server";
import { createStudent } from "@/lib/services/studentService";
import { validateStudentInput } from "@/lib/utils/validation";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { Branch, Grade } from "@/lib/constants/grades";
import { checkRateLimit, clientIp } from "@/lib/utils/rateLimit";
import { verifyToken } from "@/lib/utils/jwt";
import { getOrCreateDeviceId, setDeviceCookie } from "@/lib/utils/deviceId";
import {
  claimDailyDeviceSlot,
  releaseDailyDeviceSlot,
  DAILY_DEVICE_REGISTRATION_LIMIT,
} from "@/lib/services/deviceLimitService";

export async function POST(req: NextRequest) {
  // Resolve device identity first so every response can carry the cookie
  const { deviceId, issued } = await getOrCreateDeviceId(req);
  const withDevice = (res: NextResponse) => {
    if (issued) setDeviceCookie(res, issued);
    return res;
  };

  try {
    const ip = clientIp(req);
    const token = req.cookies.get("admin_token")?.value;

    let isAdmin = false;

    if (token) {
      try {
        const payload = await verifyToken(token);

        if (payload?.role === "أدمن" || payload?.role === "مشرف") {
          isAdmin = true;
        }
      } catch {
        // Token غير صالح → يعامل كـ guest
        isAdmin = false;
      }
    }

    // IP rate limiting — unchanged
    if (!isAdmin) {
      const allowed = await checkRateLimit("register", ip, 10, 86400);
      if (!allowed) {
        return withDevice(
          apiError("عدد محاولات كبير جداً. يرجى المحاولة بعد قليل.", 429)
        );
      }
    }

    if (ip === "156.197.217.180") {
      return withDevice(apiError("blocked"));
    }

    const body = await req.json();
    const userAgent = req.headers.get("user-agent") ?? "";

    const errors = validateStudentInput(body);
    if (errors.length > 0) {
      return withDevice(apiError(errors[0], 422));
    }

    // One successful registration per device per calendar day.
    // Admins and supervisors are fully exempt.
    // Claimed atomically BEFORE creating the student, so two concurrent
    // requests from the same device can never both succeed.
    let slotClaimed = false;
    if (!isAdmin) {
      slotClaimed = await claimDailyDeviceSlot(deviceId);
      if (!slotClaimed) {
        return withDevice(
          apiError(
            `لا يمكن تسجيل أكثر من ${DAILY_DEVICE_REGISTRATION_LIMIT} طلاب من نفس الجهاز في اليوم الواحد. يمكنك المحاولة غداً أو التواصل مع الإدارة.`,
            429
          )
        );
      }
    }

    try {
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

      return withDevice(
        apiSuccess({ code: student.code, name: student.name }, 201)
      );
    } catch (err) {
      // Creation failed — release the slot so the device isn't locked out
      if (slotClaimed) await releaseDailyDeviceSlot(deviceId);
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في تسجيل الطالب.";
    return withDevice(apiError(message, 400));
  }
}