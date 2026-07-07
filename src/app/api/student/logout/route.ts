import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "تم تسجيل الخروج." });
  res.cookies.set("student_token", "", { maxAge: 0, path: "/" });
  return res;
}
