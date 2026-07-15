// src/app/api/admin/students/missing-codes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { getMissingCodes } from "@/lib/services/studentService";
import { apiSuccess, apiError } from "@/lib/utils/response";

export async function GET(req: NextRequest) {
  // const auth = await requireAdmin(req);
  // if (auth instanceof NextResponse) return auth;

  try {
    const missingCodes = await getMissingCodes();
    return apiSuccess({ missingCodes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب الأكواد المفقودة.";
    return apiError(message, 500);
  }
}
