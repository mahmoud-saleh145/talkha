import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Two roles only:
// "أدمن"   — full access (merges previous "مدير عام" + "أدمن")
// "مشرف"   — supervisor: search + add student only

export type AdminRole = "أدمن" | "مشرف";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
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
      enum: ["أدمن", "مشرف"],
      default: "مشرف",
    },
    status: {
      type: String,
      enum: ["نشط", "غير نشط"],
      default: "نشط",
    },
  },
  { timestamps: true }
);

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

adminSchema.set("toJSON", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    delete ret.password;
    return ret;
  },
});

const Admin: Model<IAdmin> =
  mongoose.models.Admin ?? mongoose.model<IAdmin>("Admin", adminSchema);

export default Admin;
