import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRateLimit extends Document {
    key: string;
    count: number;
    expiresAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>({
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
});

// TTL index — MongoDB deletes the document automatically once expiresAt passes
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit: Model<IRateLimit> =
    mongoose.models.RateLimit ??
    mongoose.model<IRateLimit>("RateLimit", rateLimitSchema);

export default RateLimit;