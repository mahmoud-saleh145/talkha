"use client";

import Link from "next/link";
import React, { useState } from "react";

export default function StudentRegistration() {
  const [studentName, setStudentName] = useState("");
  const [parentJob, setParentJob] = useState("");
  const [customJob, setCustomJob] = useState("");
  const [showCustomJob, setShowCustomJob] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [parentPhone, setParentPhone] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentSchool, setStudentSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState("");
  const [track, setTrack] = useState("");
  // Popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [copied, setCopied] = useState(false);

  const GRADE_TRACKS: Record<string, string[]> = {
    "تانية ثانوي": [
      "مسار الطب و علوم الحياة",
      "مسار الهندسة و علوم الحاسب",
      "مسار الأعمال",
      "مسار الأدب و الفنون",
    ],
    "تالتة ثانوي": ["علمي رياضة", "علمي علوم", "أدبي"],
  };

  const tracksForGrade = GRADE_TRACKS[grade] ?? [];
  const showTrack = tracksForGrade.length > 0;

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGrade(e.target.value);
    setTrack(""); // reset track whenever grade changes
  };
  const handleJobSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setParentJob(val);
    setShowCustomJob(val === "أخرى");
    if (val !== "أخرى") setCustomJob("");
  };

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    const existing = document.getElementById("custom-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "custom-toast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "24px", left: "24px",
      padding: "14px 24px", borderRadius: "10px", color: "#ffffff",
      fontSize: "14px", fontWeight: "700", fontFamily: "Cairo, sans-serif",
      boxShadow: "0 10px 20px rgba(0,0,0,0.15)", zIndex: "10000",
      direction: "rtl", display: "flex", alignItems: "center", gap: "8px",
      transition: "all 0.3s ease",
      backgroundColor: type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#5820cc",
    });

    const icon = type === "success"
      ? '<i class="fa-solid fa-circle-check"></i>'
      : type === "error"
        ? '<i class="fa-solid fa-triangle-exclamation"></i>'
        : '<i class="fa-solid fa-circle-info"></i>';

    toast.innerHTML = `${icon} <span>${msg}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const nameWords = studentName.trim().split(/\s+/).filter(Boolean);
    if (nameWords.length < 4) {
      showToast("يرجى إدخال الاسم رباعياً على الأقل (4 كلمات).", "error");
      return;
    }

    let finalParentJob = parentJob;
    if (parentJob === "أخرى") {
      if (!customJob.trim()) {
        showToast("يرجى إدخال وظيفة ولي الأمر.", "error");
        return;
      }
      finalParentJob = customJob.trim();
    }

    setLoading(true);

    try {
      const res = await fetch("/api/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName.trim(),
          gender: gender === "male" ? "ذكر" : "أنثى",
          studentPhone: studentPhone.trim(),
          parentPhone: parentPhone.trim(),
          school: studentSchool.trim(),
          parentJob: finalParentJob,
          grade,
          track,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.message ?? "حدث خطأ. حاول مرة أخرى.", "error");
        return;
      }

      const loginRes = await fetch("/api/student/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: studentName.trim(),
          phone: studentPhone.trim(),
        }),
      });

      const loginJson = await loginRes.json();

      if (!loginRes.ok || !loginJson.success) {
        showToast("تم التسجيل ولكن تعذر تسجيل الدخول تلقائياً.", "error");
        return;
      }

      setGeneratedCode(json.data.code);
      setRegisteredName(json.data.name);
      setShowSuccessPopup(true);

    } catch {
      showToast("تعذر الاتصال بالخادم. تحقق من اتصالك.", "error");
    } finally {
      setLoading(false);
    }
  };

  // const copyStudentCode = () => {
  //   navigator.clipboard.writeText(generatedCode).then(() => {
  //     setCopied(true);
  //     setTimeout(() => setCopied(false), 2500);
  //   });
  // };

  const resetForm = () => {
    setShowSuccessPopup(false);
    setStudentName("");
    setParentJob("");
    setCustomJob("");
    setShowCustomJob(false);
    setGender("male");
    setParentPhone("");
    setStudentPhone("");
    setStudentSchool("");
    setGeneratedCode("");
    setRegisteredName("");
    setGrade("");
    setTrack("");
  };

  return (
    <div className="register-body min-h-screen ">
      <div className="register-card">
        <i className="fa-solid fa-book-open card-watermark"></i>

        <div className="logo-container">
          <img src="/assets/img/WhatsApp Image 2026-06-25 at 4.52.17 PM.jpeg" alt="2TOTAL STARS Logo" className="logo-img" />
          <img src="/assets/img/WhatsApp Image 2026-07-07 at 2.48.41 AM.jpeg" alt="2TOTAL CENTER Logo" className="logo-img" />
        </div>

        <div className="form-header">
          <h1 className="form-title">تسجيل بيانات الطالب</h1>
          <h2 className="form-subtitle">الحكاية بدأت من هنا</h2>
          <p className="form-desc">يرجى إكمال البيانات التالية بدقة للانضمام إلى سنترنـــــا</p>
        </div>

        <form className="form-grid" onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="student-name">اسم الطالب رباعي</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="student-name"
                className="input-field"
                placeholder="أدخل اسمك كما هو مكتوب في شهادة الميلاد"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
              <i className="fa-regular fa-user input-icon"></i>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="parent-job">وظيفة ولي الأمر</label>
            <div className="form-row">
              <div className="select-wrapper">
                <select
                  id="parent-job"
                  className="select-field"
                  required
                  value={parentJob}
                  onChange={handleJobSelectChange}
                >
                  <option value="" disabled>اختر الوظيفة...</option>
                  <option value="مهندس">مهندس </option>
                  <option value="طبيبة"> طبيب</option>
                  <option value="رجل أعمال">رجل أعمال</option>
                  <option value="معلم">معلم</option>
                  <option value="أخرى">أخرى</option>
                </select>
                <i className="fa-solid fa-user-group input-icon"></i>
                <i className="fa-solid fa-chevron-down select-arrow"></i>
              </div>
              {showCustomJob && (
                <div className="input-wrapper" >
                  <input
                    type="text"
                    id="parent-job-custom"
                    className="input-field"
                    placeholder="أدخل وظيفة ولي الأمر بالتفصيل..."
                    required
                    value={customJob}
                    onChange={(e) => setCustomJob(e.target.value)}
                  />
                  <i className="fa-solid fa-briefcase input-icon"></i>
                </div>
              )}
            </div>
          </div>


          <div className="form-group">
            <label className="form-label">النوع</label>
            <div className="gender-group">
              <button
                type="button"
                className={`gender-option ${gender === "male" ? "male-selected" : ""}`}
                onClick={() => setGender("male")}
              >
                <i className="fa-solid fa-mars"></i>
                <span>ذكر</span>
              </button>
              <button
                type="button"
                className={`gender-option ${gender === "female" ? "female-selected" : ""}`}
                onClick={() => setGender("female")}
              >
                <i className="fa-solid fa-venus"></i>
                <span>أنثى</span>
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="parent-phone">رقم ولي الأمر (واتساب)</label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  id="parent-phone"
                  className="input-field"
                  placeholder="01xxxxxxxxx"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                />
                <i className="fa-solid fa-mobile-screen-button input-icon"></i>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="student-phone">رقم الطالب (واتساب)</label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  id="student-phone"
                  className="input-field"
                  placeholder="01xxxxxxxxx"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                />
                <i className="fa-regular fa-comment-dots input-icon"></i>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="student-school">مدرسة الطالب</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="student-school"
                className="input-field"
                placeholder="أدخل اسم المدرسة المقيد بها حالياً"
                required
                value={studentSchool}
                onChange={(e) => setStudentSchool(e.target.value)}
              />
              <i className="fa-solid fa-school input-icon"></i>
            </div>
          </div>

          {/* Grade field */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-grade">الصف الدراسي</label>
            <div className="select-wrapper">
              <select
                id="student-grade"
                className="select-field"
                required
                value={grade}
                onChange={handleGradeChange}
              >
                <option value="" disabled>اختر الصف...</option>
                <option value="3 ابتدائي">3 ابتدائي</option>
                <option value="4 ابتدائي">4 ابتدائي</option>
                <option value="5 ابتدائي">5 ابتدائي</option>
                <option value="6 ابتدائي">6 ابتدائي</option>
                <option value="أولى إعدادي">أولى إعدادي</option>
                <option value="تانية إعدادي">تانية إعدادي</option>
                <option value="تالتة إعدادي">تالتة إعدادي</option>
                <option value="أولى ثانوي">أولى ثانوي</option>
                <option value="تانية ثانوي">تانية ثانوي</option>
                <option value="تالتة ثانوي">تالتة ثانوي</option>
              </select>
              <i className="fa-solid fa-graduation-cap input-icon"></i>
              <i className="fa-solid fa-chevron-down select-arrow"></i>
            </div>
          </div>

          {/* Track field — only shown for تانية ثانوي and تالتة ثانوي */}
          {showTrack && (
            <div className="form-group">
              <label className="form-label" htmlFor="student-track">
                {grade === "تانية ثانوي" ? "المسار" : "الشعبة"}
              </label>
              <div className="select-wrapper">
                <select
                  id="student-track"
                  className="select-field"
                  required
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                >
                  <option value="" disabled>
                    {grade === "تانية ثانوي" ? "اختر المسار..." : "اختر الشعبة..."}
                  </option>
                  {tracksForGrade.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <i className="fa-solid fa-code-branch input-icon"></i>
                <i className="fa-solid fa-chevron-down select-arrow"></i>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري التسجيل...</span></>
            ) : (
              <><i className="fa-solid fa-user-plus"></i><span>تسجيل البيانات</span></>
            )}
          </button>
        </form>
        <Link
          href="/student/account"

          style={{ marginTop: "12px", color: "#5820cc", textDecoration: "underline", textAlign: "center", display: "block" }}
        >
          <span>تسجيل الدخول</span>
        </Link>
      </div>

      {showSuccessPopup && (
        <div className="popup-overlay" style={{ display: "flex" }}>
          <div className="popup-card">
            <div>
              <button
                type="button"
                className="popup-close-btn"
                onClick={resetForm}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="popup-check-icon">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h3 className="popup-title">تم تسجيل البيانات بنجاح!</h3>
            <div className="popup-info-box">
              <div className="popup-info-item">
                <span className="popup-info-label">اسم الطالب:</span>
                <span className="popup-info-value">{registeredName}</span>
              </div>
              <div className="popup-info-item">
                <span className="popup-info-label">كود الطالب الجديد:</span>
                <span className="popup-info-value code-value">{generatedCode}</span>
              </div>
            </div>

            <button
              type="button"
              className="popup-btn"
              onClick={() => {
                const phone = studentPhone.replace(/^0/, "20");

                const message = `مرحباً *${registeredName}* \n\nكود الطالب الخاص بك هو: *${generatedCode}*`;

                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

                window.open(whatsappUrl, "_blank");
              }}
              style={{ marginTop: "12px", backgroundColor: "#25D366" }}
            >
              <i className="fa-brands fa-whatsapp"></i>
              <span>إرسال الكود عبر واتساب</span>
            </button>
            <Link
              href="/student/account"
              type="button"
              className="popup-btn"
              style={{ marginTop: "12px", backgroundColor: "#5820cc" }}
            >
              <span>تابع للصفحة الرئيسية</span>
            </Link>
          </div>
        </div>
      )}

      <div className="footer">
        <p>جميع الحقوق محفوظة © 2026</p>
        <p>تصميم وبرمجة <a href="https://wa.me/201015508532" target="_blank" rel="noopener noreferrer" >Developers</a></p>
      </div>
    </div>

  );
}
