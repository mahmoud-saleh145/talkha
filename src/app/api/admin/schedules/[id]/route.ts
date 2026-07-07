import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { deleteSchedule } from "@/lib/services/scheduleService";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await deleteSchedule(id);
    return apiSuccess({ message: "تم حذف الجدول بنجاح." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الحذف.";
    return apiError(message, 400);
  }
}
