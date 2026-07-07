import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "مدير عام" | "أدمن" | "مشرف";
  status: "نشط" | "غير نشط";
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      required: true,
      enum: ["مدير عام", "أدمن", "مشرف"],
      default: "أدمن",
    },
    status: {
      type: String,
      enum: ["نشط", "غير نشط"],
      default: "نشط",
    },
  },
  { timestamps: true }
);

// Hash password before save
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Remove password from JSON output
// Omit password from serialization via virtuals instead of toJSON transform
adminSchema.methods.toSafeObject = function () {
  const obj = this.toObject() as Record<string, unknown>;
  delete obj.password;
  return obj;
};

const Admin: Model<IAdmin> =
  mongoose.models.Admin ?? mongoose.model<IAdmin>("Admin", adminSchema);

export default Admin;
