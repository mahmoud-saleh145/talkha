import { connectDB } from "@/lib/db/mongoose";
import Student, { IStudent } from "@/lib/models/Student";

import Counter from "@/lib/models/Counter";
import ReleasedCode from "../models/ReleasedCode";
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
//
// Gap recycling — two layers, both automatic:
//   1. deleteStudent() pushes the freed code into the ReleasedCode pool.
//   2. When the pool runs dry, createStudent() re-scans for any missing
//      code (including old gaps and rows deleted directly in the database)
//      and refills the pool. That scan is throttled by SCAN_MIN_INTERVAL_MS
//      because it reads every student code.
// ---------------------------------------------------------------------------

const COUNTER_NAME = "student_global";
const CODES_PER_LETTER = 9999;
const MAX_RECYCLE_ATTEMPTS = 5;

// Throttle marker for the gap scan — stored in the Counter collection,
// where `seq` holds the epoch-ms timestamp of the last scan.
const SCAN_MARKER = "released_pool_scan";
const SCAN_MIN_INTERVAL_MS = 1000 * 60 * 60 * 6; // at most one scan per 6h
const MAX_BACKFILL_INSERT = 5000; // lowest N gaps per scan, keeps inserts small

async function generateStudentCode(): Promise<{ code: string; seq: number }> {
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

  return { code: `${letter}${paddedNumber}`, seq: n };
}

// ---------------------------------------------------------------------------
// Released-code pool helpers
// ---------------------------------------------------------------------------

/** True when the error is an E11000 duplicate-key error on the given field. */
function isDuplicateKeyOn(err: unknown, field: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  return e.code === 11000 && !!e.keyPattern && field in e.keyPattern;
}

/**
 * Atomically removes and returns the lowest available released code.
 * findOneAndDelete is a single MongoDB operation, so two concurrent
 * registrations can never receive the same code.
 */
async function takeReleasedCode(): Promise<string | null> {
  const doc = await ReleasedCode.findOneAndDelete(
    {},
    { sort: { code: 1 } }
  ).lean();

  return doc?.code ?? null;
}

/** Returns a code to the pool (on delete, or when a reuse attempt fails). */
async function releaseCode(code: string): Promise<void> {
  try {
    await ReleasedCode.updateOne(
      { code },
      { $setOnInsert: { code, releasedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    // Already in the pool — nothing to do
    if (!isDuplicateKeyOn(err, "code")) throw err;
  }
}

/**
 * Drains the pool, lowest code first, and creates the student with it.
 * Returns null when the pool is empty. The unique index on Student.code is
 * the final arbiter — a stale pool entry is discarded and the next tried.
 */
async function tryCreateWithReleasedCode(
  dto: CreateStudentDTO
): Promise<IStudent | null> {
  for (let attempt = 0; attempt < MAX_RECYCLE_ATTEMPTS; attempt++) {
    const recycled = await takeReleasedCode();
    if (!recycled) return null;

    try {
      const student = new Student({ ...dto, code: recycled });
      await student.save();
      return student;
    } catch (err) {
      // Code was actually taken — discard the stale entry, try the next one
      if (isDuplicateKeyOn(err, "code")) continue;

      // Any other failure: put the code back so it isn't lost
      await releaseCode(recycled);
      throw err;
    }
  }

  return null;
}

/**
 * Claims and runs a gap scan, at most once per SCAN_MIN_INTERVAL_MS across
 * all serverless instances. Returns true when new codes entered the pool.
 */
async function scanForMissingCodes(): Promise<boolean> {
  const now = Date.now();
  const threshold = now - SCAN_MIN_INTERVAL_MS;

  // Atomically claim the scan — only one instance wins
  const claimed = await Counter.findOneAndUpdate(
    { name: SCAN_MARKER, seq: { $lt: threshold } },
    { $set: { seq: now } },
    { new: true }
  );

  if (!claimed) {
    // Marker missing entirely → this is the very first scan
    try {
      await Counter.create({ name: SCAN_MARKER, seq: now });
    } catch (err) {
      // Marker exists and was scanned recently, or another instance won
      if (isDuplicateKeyOn(err, "name")) return false;
      throw err;
    }
  }

  try {
    const { inserted } = await backfillReleasedCodes();
    return inserted > 0;
  } catch (err) {
    // Let the next registration retry instead of waiting out the interval
    await Counter.updateOne({ name: SCAN_MARKER }, { $set: { seq: 0 } });
    throw err;
  }
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
  ip?: string;
  school?: string;
  from?: string;
  to?: string;
  userAgent?: string;
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

  // 1) Reuse the lowest gap code already known to the pool
  const recycled = await tryCreateWithReleasedCode(dto);
  if (recycled) return recycled;

  // 2) Pool empty → look for gaps anywhere in the database (throttled),
  //    then retry once. Covers old deletions and manual DB deletes.
  if (await scanForMissingCodes()) {
    const refilled = await tryCreateWithReleasedCode(dto);
    if (refilled) return refilled;
  }

  // 3) No gaps at all — existing counter logic, unchanged
  const { code, seq } = await generateStudentCode();

  try {
    const student = new Student({ ...dto, code });
    await student.save();
    return student;
  } catch (err) {
    // Roll the counter back so a failed save doesn't permanently burn a code.
    // The { seq } filter makes this a no-op if another request already
    // advanced the counter — so it stays safe under concurrency.
    await Counter.updateOne(
      { name: COUNTER_NAME, seq },
      { $inc: { seq: -1 } }
    );
    throw err;
  }
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
    ip = "",
    userAgent = "",
    school = "",
    from = "",
    to = "",

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
  if (ip) {
    query.ip = ip.trim();
  }

  if (userAgent) {
    query.userAgent = new RegExp(userAgent.trim(), "i");
  }

  if (school) {
    query.school = new RegExp(school.trim(), "i");
  }

  if (from || to) {
    query.createdAt = {};

    if (from) {
      (query.createdAt as Record<string, Date>).$gte = new Date(from);
    }

    if (to) {
      (query.createdAt as Record<string, Date>).$lte = new Date(to);
    }
  }
  const skip = (page - 1) * limit;
  const [students, total] = await Promise.all([
    Student.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Student.countDocuments(query),
  ]);
  console.log(students)

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

  // Return the freed code to the pool so the next registration reuses it
  await releaseCode(student.code);

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


// ---------------------------------------------------------------------------
// Missing codes — codes that were once generated but whose students were
// deleted. Uses the same algorithm as generateStudentCode() to reconstruct
// every code from 1..seq, then diffs against existing codes.
// ---------------------------------------------------------------------------

// Pure function — mirrors generateStudentCode() exactly, no DB side effects.
function codeFromPosition(n: number): string {
  const CODES_PER = 9999;
  const letterIndex = Math.floor((n - 1) / CODES_PER);
  const number = ((n - 1) % CODES_PER) + 1;
  const letter = String.fromCharCode(65 + letterIndex);
  return `${letter}${String(number).padStart(4, "0")}`;
}

export async function getMissingCodes(): Promise<string[]> {
  await connectDB();

  // Read the counter — if it doesn't exist yet there are no missing codes
  const counter = await Counter.findOne({ name: COUNTER_NAME }).lean();
  if (!counter || counter.seq === 0) return [];

  const seq = counter.seq;

  // Build the complete set of codes that should exist (1 … seq)
  const allExpected = new Set<string>();
  for (let n = 1; n <= seq; n++) {
    allExpected.add(codeFromPosition(n));
  }

  // Fetch every existing student code in one query
  const existingDocs = await Student.find({}, { code: 1, _id: 0 }).lean();
  const existingCodes = new Set(existingDocs.map((d) => d.code));

  // Return codes that were generated but no longer have a student
  const missing: string[] = [];
  for (const code of allExpected) {
    if (!existingCodes.has(code)) {
      missing.push(code);
    }
  }

  // Sort naturally: A0001, A0002 … A9999, B0001 …
  missing.sort();
  return missing;
}

/**
 * Idempotent: seeds the ReleasedCode pool with the lowest unused codes found
 * anywhere in the database. Called automatically by createStudent() when the
 * pool runs dry, and manually via POST /api/admin/students/missing-codes.
 */
export async function backfillReleasedCodes(): Promise<{
  found: number;
  inserted: number;
}> {
  await connectDB();

  const missing = await getMissingCodes();
  if (missing.length === 0) return { found: 0, inserted: 0 };

  // The pool is small in practice — read it whole rather than a huge $in
  const pooledDocs = await ReleasedCode.find({}, { code: 1, _id: 0 }).lean();
  const pooled = new Set(pooledDocs.map((d) => d.code));

  // missing is sorted ascending, so slicing takes the LOWEST gaps first
  const toInsert = missing
    .filter((code) => !pooled.has(code))
    .slice(0, MAX_BACKFILL_INSERT)
    .map((code) => ({ code, releasedAt: new Date() }));

  if (toInsert.length === 0) return { found: missing.length, inserted: 0 };

  try {
    await ReleasedCode.insertMany(toInsert, { ordered: false });
  } catch (err) {
    // ordered:false still writes the non-colliding documents
    if (!isDuplicateKeyOn(err, "code")) throw err;
  }

  return { found: missing.length, inserted: toInsert.length };
}


export async function createStudentWithCode(
  dto: CreateStudentDTO,
  code: string
): Promise<IStudent> {
  await connectDB();

  const existingPhone = await Student.findOne({
    studentPhone: dto.studentPhone,
  });

  if (existingPhone) {
    throw new Error("هذا الطالب مسجل مسبقاً.");
  }

  const existingCode = await Student.findOne({ code });

  if (existingCode) {
    throw new Error("هذا الكود مستخدم بالفعل.");
  }

  const student = new Student({
    ...dto,
    code,
  });

  await student.save();

  // If an admin manually claimed a gap code, drop it from the pool
  await ReleasedCode.deleteOne({ code });

  return student;
}