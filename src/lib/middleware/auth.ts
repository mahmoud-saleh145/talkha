import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload, verifyStudentToken, StudentJWTPayload } from "@/lib/utils/jwt";

// ---------------------------------------------------------------------------
// Admin guard
// ---------------------------------------------------------------------------
export async function requireAdmin(
  req: NextRequest
): Promise<JWTPayload | NextResponse> {
  const token =
    req.cookies.get("admin_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { success: false, message: "غير مصرح. يرجى تسجيل الدخول." },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "الجلسة منتهية. يرجى تسجيل الدخول مجدداً." },
      { status: 401 }
    );
  }


  return payload;
}

// ---------------------------------------------------------------------------
// Student guard
// ---------------------------------------------------------------------------
export async function requireStudent(
  req: NextRequest
): Promise<StudentJWTPayload | NextResponse> {
  const token =
    req.cookies.get("student_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { success: false, message: "يرجى تسجيل دخول الطالب أولاً." },
      { status: 401 }
    );
  }

  const payload = await verifyStudentToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "الجلسة منتهية. يرجى تسجيل الدخول مجدداً." },
      { status: 401 }
    );
  }

  return payload;
}
