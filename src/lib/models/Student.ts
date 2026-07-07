import mongoose, { Document, Model, Schema } from "mongoose";

// ---------------------------------------------------------------------------
// Grade constants — single source of truth
// ---------------------------------------------------------------------------
import {
  ALL_GRADES,
  Grade,
} from "@/lib/constants/grades";


// ---------------------------------------------------------------------------
// Track constants — only relevant for two specific grades
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IStudent interface
// ---------------------------------------------------------------------------
export interface IStudent extends Document {
  code: string;
  name: string;
  gender: "ذكر" | "أنثى";
  grade: Grade;
  track: string; // "" for grades that have no track; required value for تانية/تالتة ثانوي
  studentPhone: string;
  parentPhone: string;
  school: string;
  parentJob: string;
  createdBy: "student" | "admin";
  ip: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;

}

// ---------------------------------------------------------------------------
// Mongoose schema
// ---------------------------------------------------------------------------
const studentSchema = new Schema<IStudent>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 7, // at least 4 Arabic words
    },
    gender: {
      type: String,
      required: true,
      enum: ["ذكر", "أنثى"],
    },
    grade: {
      type: String,
      required: true,
      trim: true,
      enum: [...ALL_GRADES],
    },
    track: {
      type: String,
      trim: true,
      default: "",
    },
    studentPhone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: [/^01[0125]\d{8}$/, "رقم هاتف الطالب غير صحيح"],
    },
    parentPhone: {
      type: String,
      required: true,
      trim: true,
      match: [/^01[0125]\d{8}$/, "رقم هاتف ولي الأمر غير صحيح"],
    },
    school: {
      type: String,
      required: true,
      trim: true,
    },
    parentJob: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      enum: ["student", "admin"],
      default: "student",
    },
    ip: {
      type: String,
      default: "",
      trim: true,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Text search index
studentSchema.index({ name: "text", code: "text" });

const Student: Model<IStudent> =
  mongoose.models.Student ?? mongoose.model<IStudent>("Student", studentSchema);

export default Student;
