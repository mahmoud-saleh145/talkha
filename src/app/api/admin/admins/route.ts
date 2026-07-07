import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createAdmin, getAdmins } from "@/lib/services/adminService";
import { validateAdminInput } from "@/lib/utils/validation";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { connectDB } from "@/lib/db/mongoose";

export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const admins = await getAdmins();
    return apiSuccess(admins);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب الأدمنز.";
    return apiError(message, 500);
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    // Require password on creation
    if (!body.password) {
      return apiError("كلمة المرور مطلوبة.", 422);
    }

    const errors = validateAdminInput(body);
    if (errors.length > 0) return apiError(errors[0], 422);

    const admin = await createAdmin({
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      password: String(body.password),
      role: body.role ?? "أدمن",
    });

    return apiSuccess(
      { name: admin.name, email: admin.email, role: admin.role },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في إضافة الأدمن.";
    return apiError(message, 400);
  }
}
