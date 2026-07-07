import { connectDB } from "@/lib/db/mongoose";
import Admin, { IAdmin } from "@/lib/models/Admin";
import { signToken } from "@/lib/utils/jwt";

export interface CreateAdminDTO {
  name: string;
  email: string;
  password: string;
  role: "مدير عام" | "أدمن" | "مشرف";
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ token: string; admin: Partial<IAdmin> }> {
  await connectDB();

  const admin = await Admin.findOne({
    email: email.toLowerCase().trim(),
    status: "نشط",
  });

  if (!admin) {
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  }

  const valid = await admin.comparePassword(password);
  if (!valid) {
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  }

  const token = await signToken({
    sub: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
  });

  return {
    token,
    admin: {
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

export async function createAdmin(dto: CreateAdminDTO): Promise<IAdmin> {
  await connectDB();

  const existing = await Admin.findOne({
    email: dto.email.toLowerCase().trim(),
  });
  if (existing) {
    throw new Error("هذا البريد الإلكتروني مسجل مسبقاً.");
  }

  const admin = new Admin(dto);
  await admin.save();
  return admin;
}

export async function getAdmins() {
  await connectDB();
  return Admin.find().select("-password").sort("-createdAt").lean();
}

export async function updateAdmin(
  id: string,
  dto: Partial<CreateAdminDTO> & { status?: "نشط" | "غير نشط" }
) {
  await connectDB();

  // Check for email conflicts
  if (dto.email) {
    const conflict = await Admin.findOne({
      email: dto.email.toLowerCase().trim(),
      _id: { $ne: id },
    });
    if (conflict) throw new Error("البريد الإلكتروني مسجل بالفعل.");
  }

  const admin = await Admin.findById(id);
  if (!admin) throw new Error("الأدمن غير موجود.");

  if (dto.name) admin.name = dto.name;
  if (dto.email) admin.email = dto.email.toLowerCase().trim();
  if (dto.role) admin.role = dto.role;
  if (dto.status) admin.status = dto.status;
  if (dto.password && dto.password.length >= 6) admin.password = dto.password;

  await admin.save();
  return admin;
}

export async function deleteAdmin(id: string, requesterId: string) {
  await connectDB();
  if (id === requesterId) {
    throw new Error("لا يمكنك حذف حسابك الخاص أثناء تسجيل الدخول.");
  }
  const admin = await Admin.findByIdAndDelete(id);
  if (!admin) throw new Error("الأدمن غير موجود.");
  return admin;
}

export async function seedInitialAdmin() {
  await connectDB();
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({
      name: "أحمد المنصور",
      email: "ahmed@Talkha.com",
      password: "admin123",
      role: "مدير عام",
      status: "نشط",
    });
    console.log("✅ Initial admin seeded");
  }
}
