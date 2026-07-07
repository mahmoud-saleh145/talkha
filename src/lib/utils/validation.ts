import { ALL_BRANCHES, ALL_GRADES, SECONDARY_2_TRACKS, SECONDARY_3_TRACKS } from "../constants/grades";

const EG_PHONE = /^01[0125]\d{8}$/;
const QUADRUPLE_NAME = /^\S+(\s+\S+){3,}/;
const NAME_REGEX = /^[\p{L}\p{M}\s.'-]+$/u;

const VALID_GRADES = new Set<string>(ALL_GRADES);
const S2_TRACKS = new Set<string>(SECONDARY_2_TRACKS);
const S3_TRACKS = new Set<string>(SECONDARY_3_TRACKS);
const VALID_BRANCHES = new Set<string>(ALL_BRANCHES);

export function validateStudentInput(body: Record<string, unknown>) {
  const errors: string[] = [];

  // Name — at least 4 words
  if (!body.name || !QUADRUPLE_NAME.test(String(body.name).trim())) {
    errors.push("يرجى إدخال الاسم رباعياً على الأقل (4 كلمات).");
  }
  // Name — only letters, spaces, and certain punctuation
  else if (!NAME_REGEX.test(String(body.name).trim())) {
    errors.push("الاسم يحتوي على أحرف غير صالحة.");
  }

  // Gender
  if (!body.gender || !["ذكر", "أنثى"].includes(String(body.gender))) {
    errors.push("الجنس غير صحيح.");
  }

  // Student phone
  if (!body.studentPhone || !EG_PHONE.test(String(body.studentPhone).trim())) {
    errors.push("رقم هاتف الطالب غير صحيح.");
  }

  // Parent phone
  if (!body.parentPhone || !EG_PHONE.test(String(body.parentPhone).trim())) {
    errors.push("رقم هاتف ولي الأمر غير صحيح.");
  }

  // School
  if (!body.school || String(body.school).trim().length < 2) {
    errors.push("اسم المدرسة مطلوب.");
  }

  // Parent job
  if (!body.parentJob || String(body.parentJob).trim().length < 2) {
    errors.push("وظيفة ولي الأمر مطلوبة.");
  }

  // Grade — required, must be one of the 10 defined values
  const grade = String(body.grade ?? "").trim();
  if (!grade || !VALID_GRADES.has(grade)) {
    errors.push("يرجى اختيار الصف الدراسي.");
  }

  // Track — conditional on grade
  const track = String(body.track ?? "").trim();

  if (grade === "تانية ثانوي") {
    if (!track || !S2_TRACKS.has(track)) {
      errors.push("يرجى اختيار المسار لطلاب تانية ثانوي.");
    }
  } else if (grade === "تالتة ثانوي") {
    if (!track || !S3_TRACKS.has(track)) {
      errors.push("يرجى اختيار الشعبة لطلاب تالتة ثانوي.");
    }
  } else if (track) {
    // All other grades must NOT have a track
    errors.push("لا يوجد مسار أو شعبة لهذا الصف.");
  }

  // Branch — required, must be one of the defined branches
  const branch = String(body.branch ?? "").trim();
  if (!branch || !VALID_BRANCHES.has(branch)) {
    errors.push("يرجى اختيار الفرع / المركز.");
  }

  return errors;
}

export function validateAdminInput(body: Record<string, unknown>) {
  const errors: string[] = [];

  if (!body.name || String(body.name).trim().length < 3) {
    errors.push("الاسم مطلوب.");
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    errors.push("البريد الإلكتروني غير صحيح.");
  }
  if (body.password !== undefined && String(body.password).length < 6) {
    errors.push("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
  }
  if (
    body.role &&
    !["مدير عام", "أدمن", "مشرف"].includes(String(body.role))
  ) {
    errors.push("الصلاحية غير صحيحة.");
  }

  return errors;
}
