// src/app/api/admin/schedules/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { v2 as cloudinary } from "cloudinary";
import { apiSuccess, apiError } from "@/lib/utils/response";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "2total/schedules";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const timestamp = Math.round(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: FOLDER },
      process.env.CLOUDINARY_API_SECRET!
    );

    return apiSuccess({
      signature,
      timestamp,
      folder: FOLDER,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في توليد التوقيع.";
    return apiError(message, 500);
  }
}
