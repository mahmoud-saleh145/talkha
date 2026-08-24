import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeviceRegistration extends Document {
    deviceId: string;
    day: string; // YYYY-MM-DD in Africa/Cairo
    count: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const deviceRegistrationSchema = new Schema<IDeviceRegistration>(
    {
        deviceId: { type: String, required: true, trim: true },
        day: { type: String, required: true, trim: true },
        count: { type: Number, required: true, default: 0 },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// Unique compound index — this is what makes the daily limit race-proof.
// Two concurrent upserts from the same device: one inserts, the other gets E11000.
deviceRegistrationSchema.index({ deviceId: 1, day: 1 }, { unique: true });

// TTL index — MongoDB removes the claim automatically once expiresAt passes
deviceRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DeviceRegistration: Model<IDeviceRegistration> =
    mongoose.models.DeviceRegistration ??
    mongoose.model<IDeviceRegistration>(
        "DeviceRegistration",
        deviceRegistrationSchema
    );

export default DeviceRegistration;