import { Branch, Grade } from "@/lib/constants/grades";
import { createStudentWithCode } from "@/lib/services/studentService";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { validateStudentInput } from "@/lib/utils/validation";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    // const auth = await requireAdmin(req);
    // if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const ip =
        (req.headers.get("x-forwarded-for") ?? "")
            .split(",")[0]
            .trim() || "unknown";
    const userAgent = req.headers.get("user-agent") ?? "";

    const errors = validateStudentInput(body);
    if (errors.length > 0) return apiError(errors[0], 422);
    const student = await createStudentWithCode(
        {
            name: String(body.name).trim(),
            gender: body.gender as "ذكر" | "أنثى",
            studentPhone: String(body.studentPhone).trim(),
            parentPhone: String(body.parentPhone).trim(),
            school: String(body.school).trim(),
            parentJob: String(body.parentJob).trim(),
            branch: String(body.branch).trim() as Branch,
            grade: String(body.grade).trim() as Grade,
            track: body.track ? String(body.track).trim() : "",
            createdBy: "student",
            ip,
            userAgent,
        },
        body.code
    );

    return apiSuccess(student, 201);
}