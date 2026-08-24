import mongoose, { Document, Model, Schema } from "mongoose";

// Pool of student codes that were generated but whose student was deleted.
// createStudent() pops the lowest one before touching the counter.
export interface IReleasedCode extends Document {
    code: string;
    releasedAt: Date;
}

const releasedCodeSchema = new Schema<IReleasedCode>({
    code: { type: String, required: true, unique: true, trim: true },
    releasedAt: { type: Date, default: Date.now },
});

// Lexicographic order == natural order for the LNNNN format,
// so { code: 1 } always yields the lowest available code first.
releasedCodeSchema.index({ code: 1 });

const ReleasedCode: Model<IReleasedCode> =
    mongoose.models.ReleasedCode ??
    mongoose.model<IReleasedCode>("ReleasedCode", releasedCodeSchema);

export default ReleasedCode;