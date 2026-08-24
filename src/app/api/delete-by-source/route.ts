import { NextRequest, NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import Student from "@/lib/models/Student";
import { apiSuccess, apiError } from "@/lib/utils/response";

export async function DELETE(req: NextRequest) {
    const auth = await requireAdminOnly(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);

        const ip = searchParams.get("ip")?.trim();
        const school = searchParams.get("school")?.trim();

        // لازم تبعت واحد على الأقل
        if (!ip && !school) {
            return apiError("يجب إرسال IP أو اسم المدرسة.", 400);
        }

        await connectDB();

        const query: Record<string, string> = {};

        if (ip) {
            query.ip = ip;
        }

        if (school) {
            query.school = school;
        }

        const result = await Student.deleteMany(query);

        return apiSuccess({
            message: "تم حذف الطلاب بنجاح.",
            deletedCount: result.deletedCount,
            filters: query,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "خطأ في حذف الطلاب.";

        return apiError(message, 500);
    }
}