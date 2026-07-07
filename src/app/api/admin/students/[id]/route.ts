import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { updateStudent, deleteStudent } from "@/lib/services/studentService";
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
    const student = await updateStudent(id, body);
    return apiSuccess(student);
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
    await deleteStudent(id);
    return apiSuccess({ message: "تم حذف الطالب بنجاح." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الحذف.";
    return apiError(message, 400);
  }
}
