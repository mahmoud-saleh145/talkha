// src/lib/services/scheduleService.ts
import { connectDB } from "@/lib/db/mongoose";
import Schedule from "@/lib/models/Schedule";
import { v2 as cloudinary } from "cloudinary";
import { Grade } from "../constants/grades";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Called after the frontend has already uploaded directly to Cloudinary.
// Only saves the resulting URL and publicId to MongoDB.
export async function saveScheduleRecord(
  grade: Grade,
  imageUrl: string,
  publicId: string
) {
  await connectDB();
  const schedule = await Schedule.create({ grade, imageUrl, publicId });
  return schedule;
}

export async function getSchedulesByGrade(grade: Grade) {
  await connectDB();
  return Schedule.find({ grade }).sort({ createdAt: -1 }).lean();
}

export async function getAllSchedules() {
  await connectDB();
  return Schedule.find().sort({ grade: 1, createdAt: -1 }).lean();
}

export async function deleteSchedule(id: string) {
  await connectDB();
  const schedule = await Schedule.findByIdAndDelete(id);
  if (!schedule) throw new Error("الجدول غير موجود.");

  try {
    await cloudinary.uploader.destroy(schedule.publicId);
  } catch {
    // Non-fatal — record is already removed from DB
  }

  return schedule;
}
