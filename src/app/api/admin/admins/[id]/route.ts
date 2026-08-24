import { NextRequest, NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/middleware/auth";
import { updateAdmin, deleteAdmin } from "@/lib/services/adminService";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { connectDB } from "@/lib/db/mongoose";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  await connectDB();
  const auth = await requireAdminOnly(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();

    // Allow-list the fields an admin may change — never trust the raw body
    const payload: Parameters<typeof updateAdmin>[1] = {};
    if (typeof body.name === "string") payload.name = body.name.trim();
    if (typeof body.email === "string") payload.email = body.email.trim();
    if (body.role === "أدمن" || body.role === "مشرف") payload.role = body.role;
    if (body.status === "نشط" || body.status === "غير نشط") payload.status = body.status;
    if (typeof body.password === "string" && body.password.length >= 6) {
      payload.password = body.password;
    }

    const admin = await updateAdmin(id, payload);
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
  const auth = await requireAdminOnly(req);
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