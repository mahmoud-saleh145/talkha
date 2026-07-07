import { connectDB } from "@/lib/db/mongoose";
import { NextResponse } from "next/server";

export async function POST() {
  await connectDB();
  const res = NextResponse.json({ success: true, message: "تم تسجيل الخروج." });
  res.cookies.set("admin_token", "", { maxAge: 0, path: "/" });
  return res;
}
