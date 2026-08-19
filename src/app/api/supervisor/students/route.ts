// src/app/api/supervisor/students/route.ts
// Accessible by both أدمن and مشرف — requireAdmin (not requireAdminOnly)
// Returns only students matching the search query.
// Supervisors must always provide a search term — no search = empty results.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import Student from "@/lib/models/Student";
import { apiSuccess, apiError } from "@/lib/utils/response";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";

  // Supervisors must provide a search term
  if (!query) {
    return apiSuccess({ students: [], total: 0 });
  }

  try {
    await connectDB();

    const regex = new RegExp(query, "i");
    const students = await Student.find({
      $or: [
        { name: regex },
        { code: regex },
        { studentPhone: regex },
        { parentPhone: regex },
      ],
    })
      .sort("-createdAt")
      .limit(50)
      .lean();

    return apiSuccess({ students, total: students.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في البحث.";
    return apiError(message, 500);
  }
}
