import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { updateAdmin, deleteAdmin } from "@/lib/services/adminService";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { connectDB } from "@/lib/db/mongoose";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const admin = await updateAdmin(id, body);
    return apiSuccess({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في التحديث.";
    return apiError(message, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await deleteAdmin(id, auth.sub);
    return apiSuccess({ message: "تم حذف الحساب بنجاح." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الحذف.";
    return apiError(message, 400);
  }
}
