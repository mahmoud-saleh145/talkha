import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { getAllStudentsForExport } from "@/lib/services/studentService";
import * as XLSX from "xlsx-js-style";
import { connectDB } from "@/lib/db/mongoose";
const gradeMap: Record<string, string> = {
  "3 ابتدائي": "3ب",
  "4 ابتدائي": "4ب",
  "5 ابتدائي": "5ب",
  "6 ابتدائي": "6ب",

  "أولى إعدادي": "1ع",
  "تانية إعدادي": "2ع",
  "تالتة إعدادي": "3ع",

  "أولى ثانوي": "1ث",
  "تانية ثانوي": "2ث",
  "تالتة ثانوي": "3ث",
};

const formatGrade = (grade: string) => gradeMap[grade] ?? grade;
export async function GET(req: NextRequest) {
  await connectDB();
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const gender = req.nextUrl.searchParams.get("gender");

    const students = await getAllStudentsForExport(
      gender === "ذكر" || gender === "أنثى"
        ? gender
        : undefined
    );
    console.log(students);

    const rows = students.map((s) => ({
      "وظيفه ولي الأمر": s.parentJob,
      مدرسه: s.school,
      " تليفون الطالب": s.studentPhone,
      "تليفون ولي الأمر": s.parentPhone,
      الشعبه: s.track || "-",
      الصف: formatGrade(s.grade),
      النوع: s.gender,
      "الاسم ثلاثي": s.name,
      "كود ": s.code,
    }));

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(rows);
    (ws as any)["!rtl"] = true;
    // عرض الأعمدة
    ws["!cols"] = [
      { wch: 18 }, // وظيفة ولي الأمر
      { wch: 15 }, // المدرسة
      { wch: 20 }, // هاتف الطالب
      { wch: 20 }, // هاتف ولي الأمر
      { wch: 12 }, // شعبة
      { wch: 8 }, // الصف
      { wch: 8 }, // النوع
      { wch: 30 }, // الاسم
      { wch: 8 }, // كود الطالب
    ];


    // تجميد الصف الأول
    ws["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };


    // Auto Filter
    if (ws["!ref"]) {
      ws["!autofilter"] = {
        ref: ws["!ref"],
      };
    }

    // تنسيق الـ Header
    if (!ws["!ref"]) {
      throw new Error("Worksheet range is undefined");
    }
    const headerRange = XLSX.utils.decode_range(ws["!ref"]);

    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: 0,
        c: col,
      });

      ws[cellAddress].s = {
        fill: {
          fgColor: {
            rgb: "000000",
          },
        },
        font: {
          bold: true,
          color: {
            rgb: "FFFFFF",
          },
          sz: 12,
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "FFFFFF" } },
          bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        },
      };
    }


    // تنسيق كل البيانات
    for (let row = 1; row <= headerRange.e.r; row++) {
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {

        const cellAddress = XLSX.utils.encode_cell({
          r: row,
          c: col,
        });

        if (!ws[cellAddress]) continue;

        ws[cellAddress].s = {
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
          border: {
            top: { style: "thin", color: { rgb: "808080" } },
            bottom: { style: "thin", color: { rgb: "808080" } },
            left: { style: "thin", color: { rgb: "808080" } },
            right: { style: "thin", color: { rgb: "808080" } },
          },
          font: {
            sz: 10,
          },
        };
      }
    }


    // ارتفاع الصفوف
    ws["!rows"] = [
      {
        hpt: 25,
      },
    ];


    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="students_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "خطأ في تصدير البيانات." },
      { status: 500 }
    );
  }
}
