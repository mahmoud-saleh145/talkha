import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { getStatistics } from "@/lib/services/studentService";
import { apiSuccess, apiError } from "@/lib/utils/response";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const stats = await getStatistics();
    return apiSuccess(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في جلب الإحصائيات.";
    return apiError(message, 500);
  }
}
