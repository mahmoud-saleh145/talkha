import { connectDB } from "@/lib/db/mongoose";
import Student, { IStudent } from "@/lib/models/Student";

import Counter from "@/lib/models/Counter";
import { Grade, Branch } from "../constants/grades";

// ---------------------------------------------------------------------------
// Universal student code generation — A0001 … A9999 → B0001 … B9999 → …
//
// One MongoDB counter document named "student_global" tracks the total
// number of students ever created.  Each atomic increment gives a unique
// position n (1-based).  That position maps to:
//
//   letter index  = Math.floor((n - 1) / 9999)   → 0=A, 1=B, 2=C …
//   number within = ((n - 1) % 9999) + 1          → 1 … 9999
//
// Examples:
//   n=1    → A0001       n=9999  → A9999
//   n=10000 → B0001      n=19998 → B9999
//   n=19999 → C0001
//
// Atomicity: findOneAndUpdate with $inc is a single MongoDB operation,
// so concurrent requests always receive different values.
// ---------------------------------------------------------------------------

const COUNTER_NAME = "student_global";
const CODES_PER_LETTER = 9999;

async function generateStudentCode(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { name: COUNTER_NAME },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const n = counter.seq; // 1-based position
  const letterIndex = Math.floor((n - 1) / CODES_PER_LETTER);
  const number = ((n - 1) % CODES_PER_LETTER) + 1;

  const letter = String.fromCharCode(65 + letterIndex); // 65 = 'A'
  const paddedNumber = String(number).padStart(4, "0");

  return `${letter}${paddedNumber}`;
}

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------
export interface CreateStudentDTO {
  name: string;
  gender: "ذكر" | "أنثى";
  grade: Grade;
  track: string; // "" for grades without a track
  branch: Branch;
  studentPhone: string;
  parentPhone: string;
  school: string;
  parentJob: string;
  createdBy: "student" | "admin";
  ip: string;
  userAgent: string;
}

export interface StudentFilters {
  search?: string;
  gender?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// ---------------------------------------------------------------------------
// Student creation
// ---------------------------------------------------------------------------
export async function createStudent(dto: CreateStudentDTO): Promise<IStudent> {
  await connectDB();

  // Prevent duplicate registration by phone number
  const existing = await Student.findOne({
    studentPhone: dto.studentPhone
  });

  if (existing) {
    throw new Error("هذا الطالب مسجل مسبقاً في النظام.");
  }

  const code = await generateStudentCode();
  const student = new Student({ ...dto, code });
  await student.save();
  return student;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export async function getStudents(filters: StudentFilters) {
  await connectDB();

  const {
    search = "",
    gender = "",
    page = 1,
    limit = 20,
    sort = "-code",
  } = filters;

  const query: Record<string, unknown> = {};

  if (search) {
    const regex = new RegExp(search, "i");
    query.$or = [
      { name: regex },
      { code: regex },
      { studentPhone: regex },
      { parentPhone: regex },
    ];
  }

  if (gender && ["ذكر", "أنثى"].includes(gender)) {
    query.gender = gender;
  }

  const skip = (page - 1) * limit;
  const [students, total] = await Promise.all([
    Student.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Student.countDocuments(query),
  ]);

  return { students, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getStudentById(id: string) {
  await connectDB();
  return Student.findById(id).lean();
}

export async function updateStudent(
  id: string,
  dto: Partial<CreateStudentDTO>
) {
  await connectDB();
  const student = await Student.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  });
  if (!student) throw new Error("الطالب غير موجود.");
  return student;
}

export async function deleteStudent(id: string) {
  await connectDB();
  const student = await Student.findByIdAndDelete(id);
  if (!student) throw new Error("الطالب غير موجود.");
  return student;
}

export async function getStatistics() {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, males, females, todayCount] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ gender: "ذكر" }),
    Student.countDocuments({ gender: "أنثى" }),
    Student.countDocuments({ createdAt: { $gte: today } }),
  ]);

  return { total, males, females, todayCount };
}

export async function getAllStudentsForExport(
  gender?: "ذكر" | "أنثى"
) {
  await connectDB();

  return Student.find(
    gender ? { gender } : {}
  )
    .sort("code")
    .lean();
}