"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface StudentProfile {
  _id: string;
  code: string;
  name: string;
  gender: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
  school: string;
  parentJob: string;
  createdAt: string;
}

interface Schedule {
  _id: string;
  grade: string;
  imageUrl: string;
  createdAt: string;
}

// Locked nav items use this consistent "coming soon" toast — same pattern
// as the admin pages in this project
function useToast() {
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const existing = document.getElementById("custom-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "custom-toast";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      left: "24px",
      padding: "14px 24px",
      borderRadius: "10px",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "700",
      fontFamily: "Cairo, sans-serif",
      boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
      zIndex: "10000",
      direction: "rtl",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.3s ease",
      backgroundColor:
        type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#5820cc",
    });
    const icon =
      type === "success"
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
  return showToast;
}

export default function StudentAccountPage() {
  const router = useRouter();
  const showToast = useToast();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedOpen, setSchedOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string>("");
  const [viewerZoom, setViewerZoom] = useState(1);

  useEffect(() => {
    fetch("/api/student/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/student/login");
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json?.success) setStudent(json.data);
      })
      .catch(() => showToast("تعذر تحميل بيانات الحساب.", "error"))
      .finally(() => setLoading(false));
    // showToast/router are stable — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch schedules for the student's grade (only after student data loads)
  useEffect(() => {
    if (!student) return;
    fetch("/api/student/schedules")
      .then(r => r.json())
      .then(json => { if (json.success) setSchedules(json.data); })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student]);

  const handleLogout = async () => {
    await fetch("/api/student/logout", { method: "POST" });
    router.push("/student/login");
  };

  const copyCode = () => {
    if (!student) return;
    navigator.clipboard.writeText(student.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    });
  };

  // First name only for the welcome greeting
  const firstName = student?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="student-page-body">
      {/* ── Top Navigation Bar ─────────────────────────────────────── */}
      <nav className="student-navbar">
        {/* Brand */}
        <div className="student-navbar-brand">
          <div className="student-navbar-logo-box">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <div className="student-navbar-brand-text">
            <span className="student-navbar-title">Talkha</span>
            <span className="student-navbar-sub">بوابة الطالب</span>
          </div>
        </div>

        {/* Nav links */}
        <ul className="student-navbar-links">
          {/* Active: My Account */}
          <li className="student-nav-item student-nav-active">
            <a href="#" className="student-nav-link">
              <i className="fa-solid fa-user-circle"></i>
              <span>حسابي</span>
            </a>
          </li>

          {/* Locked: Courses */}
          <li className="student-nav-item student-nav-locked">
            <a
              href="#"
              className="student-nav-link"
              onClick={(e) => {
                e.preventDefault();
                showToast("الدروس قيد التطوير قريباً", "info");
              }}
            >
              <i className="fa-solid fa-book-open"></i>
              <span>دروسي</span>
              <span className="student-nav-lock-badge">
                <i className="fa-solid fa-lock"></i>
              </span>
            </a>
          </li>

          {/* Locked: Schedule */}
          <li className="student-nav-item student-nav-locked">
            <a
              href="#"
              className="student-nav-link"
              onClick={(e) => {
                e.preventDefault();
                showToast("الجدول قيد التطوير قريباً", "info");
              }}
            >
              <i className="fa-solid fa-calendar-days"></i>
              <span>جدولي</span>
              <span className="student-nav-lock-badge">
                <i className="fa-solid fa-lock"></i>
              </span>
            </a>
          </li>

          {/* Locked: Results */}
          <li className="student-nav-item student-nav-locked">
            <a
              href="#"
              className="student-nav-link"
              onClick={(e) => {
                e.preventDefault();
                showToast("النتائج قيد التطوير قريباً", "info");
              }}
            >
              <i className="fa-solid fa-chart-bar"></i>
              <span>نتائجي</span>
              <span className="student-nav-lock-badge">
                <i className="fa-solid fa-lock"></i>
              </span>
            </a>
          </li>
        </ul>

        {/* Right side actions */}
        <div className="student-navbar-actions">
          <button
            className="student-navbar-icon-btn"
            onClick={() => showToast("لا توجد إشعارات جديدة حالياً", "info")}
            title="الإشعارات"
          >
            <i className="fa-regular fa-bell"></i>
          </button>
          <button
            onClick={handleLogout}
            className="student-navbar-back-btn"
            title="تسجيل الخروج"
            type="button"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="student-main">
        {loading ? (
          <div className="student-loading-state">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>جاري تحميل بيانات الحساب...</span>
          </div>
        ) : student ? (
          <>
            {/* ── Welcome Banner ─────────────────────────────────── */}
            <section className="student-welcome-banner">
              {/* Text side */}
              <div className="student-welcome-text">
                <p className="student-welcome-sub">أهلاً بك في</p>
                <h1 className="student-welcome-title">
                  مركز <span className="student-welcome-highlight">Talkha</span>
                </h1>
                <p className="student-welcome-greeting">
                  يسعدنا وجودك معنا يا{" "}
                  <strong>{firstName}</strong> 🎉
                </p>
                <p className="student-welcome-desc">
                  هنا تجد كل ما يخص رحلتك الدراسية في مكان واحد.
                  استمر في التميز!
                </p>
              </div>

              {/* Illustration side */}
              <div className="student-welcome-illustration" aria-hidden="true">
                <div className="student-illustration-circle student-illustration-circle--outer" />
                <div className="student-illustration-circle student-illustration-circle--inner" />
                <div className="student-illustration-icon">
                  <i className="fa-solid fa-user-graduate"></i>
                </div>
              </div>
            </section>

            {/* ── Content grid ───────────────────────────────────── */}
            <div className="student-content-grid">
              {/* ── Student Code Card ──────────────────────────── */}
              <div className="student-code-card">
                <div className="student-code-card-header">
                  <div className="student-code-icon-box">
                    <i className="fa-solid fa-id-card"></i>
                  </div>
                  <div>
                    <h3 className="student-code-card-title">كود الطالب</h3>
                    <p className="student-code-card-sub">
                      كودك الشخصي في سنتر Talkha
                    </p>
                  </div>
                </div>

                <div className="student-code-display">
                  <span className="student-code-value">{student.code}</span>
                </div>

                <button
                  className={`student-code-copy-btn ${codeCopied ? "student-code-copy-btn--copied" : ""}`}
                  onClick={copyCode}
                >
                  {codeCopied ? (
                    <>
                      <i className="fa-solid fa-circle-check"></i>
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-regular fa-copy"></i>
                      <span>نسخ الكود</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="popup-btn"
                  onClick={() => {
                    const phone = student.studentPhone.replace(/^0/, "20");

                    const message = `مرحباً *${student.name}* \n\nكود الطالب الخاص بك هو: *${student.code}*`;

                    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

                    window.open(whatsappUrl, "_blank");
                  }}
                  style={{ backgroundColor: "#25D366" }}
                >
                  <i className="fa-brands fa-whatsapp"></i>
                  <span>إرسال الكود عبر واتساب</span>
                </button>

                <p className="student-code-hint">
                  <i className="fa-solid fa-circle-info"></i>
                  احتفظ بهذا الكود — ستحتاجه للتواصل مع الإدارة
                </p>
              </div>

              {/* ── Profile Info Card ──────────────────────────── */}
              <div className="student-profile-card">
                {/* Card header with avatar */}
                <div className="student-profile-hero">
                  <div
                    className={`student-profile-avatar ${student.gender === "أنثى" ? "student-profile-avatar--female" : ""}`}
                  >
                    <i className="fa-solid fa-user-graduate"></i>
                  </div>
                  <div className="student-profile-hero-text">
                    <h2 className="student-profile-name">{student.name}</h2>
                    <span className="student-profile-grade-badge">
                      {student.grade}
                    </span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="student-profile-info-grid">
                  <div className="student-profile-info-row">
                    <div className="student-profile-info-icon gender">
                      <i className="fa-solid fa-venus-mars"></i>
                    </div>
                    <div className="student-profile-info-content">
                      <span className="student-profile-info-label">الجنس</span>
                      <span className="student-profile-info-value">
                        {student.gender}
                      </span>
                    </div>
                  </div>

                  <div className="student-profile-info-row">
                    <div className="student-profile-info-icon school">
                      <i className="fa-solid fa-school"></i>
                    </div>
                    <div className="student-profile-info-content">
                      <span className="student-profile-info-label">المدرسة</span>
                      <span className="student-profile-info-value">
                        {student.school}
                      </span>
                    </div>
                  </div>

                  <div className="student-profile-info-row">
                    <div className="student-profile-info-icon phone">
                      <i className="fa-regular fa-comment-dots"></i>
                    </div>
                    <div className="student-profile-info-content">
                      <span className="student-profile-info-label">
                        رقم الواتساب
                      </span>
                      <span
                        className="student-profile-info-value"
                        style={{ direction: "ltr", display: "block" }}
                      >
                        {student.studentPhone}
                      </span>
                    </div>
                  </div>

                  <div className="student-profile-info-row">
                    <div className="student-profile-info-icon parent">
                      <i className="fa-solid fa-mobile-screen-button"></i>
                    </div>
                    <div className="student-profile-info-content">
                      <span className="student-profile-info-label">
                        رقم ولي الأمر
                      </span>
                      <span
                        className="student-profile-info-value"
                        style={{ direction: "ltr", display: "block" }}
                      >
                        {student.parentPhone}
                      </span>
                    </div>
                  </div>

                  <div className="student-profile-info-row student-profile-info-row--full">
                    <div className="student-profile-info-icon job">
                      <i className="fa-solid fa-briefcase"></i>
                    </div>
                    <div className="student-profile-info-content">
                      <span className="student-profile-info-label">
                        وظيفة ولي الأمر
                      </span>
                      <span className="student-profile-info-value">
                        {student.parentJob}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Joined date */}
                <p className="student-profile-joined">
                  <i className="fa-regular fa-calendar-check"></i>
                  انضممت في{" "}
                  {new Date(student.createdAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* ── Teacher Schedules Accordion ─────────────────── */}
              <div className="sched-accordion" style={{ gridColumn: "1 / -1" }}>
                <button
                  className="sched-accordion-trigger"
                  onClick={() => setSchedOpen(o => !o)}
                  aria-expanded={schedOpen}
                >
                  <span className="sched-accordion-title">
                    <span className="sched-accordion-icon-box">
                      <i className="fa-solid fa-calendar-days"></i>
                    </span>
                    جداول المعلمين — {student.grade}
                  </span>
                  <span className={`sched-accordion-chevron ${schedOpen ? "sched-accordion-chevron--open" : ""}`}>
                    <i className="fa-solid fa-chevron-down"></i>
                  </span>
                </button>

                <div className={`sched-accordion-body ${schedOpen ? "sched-accordion-body--open" : ""}`}>
                  {schedules.length === 0 ? (
                    <p className="sched-empty">لا توجد جداول متاحة لصفك الدراسي حالياً.</p>
                  ) : (
                    <div className="sched-images">
                      {schedules.map((s) => (
                        <div key={s._id} className="sched-image-item">
                          <img
                            src={s.imageUrl}
                            alt={`جدول ${s.grade}`}
                            className="sched-image"
                            onClick={() => { setViewerImage(s.imageUrl); setViewerZoom(1); }}
                          />
                          <button
                            className="sched-view-btn"
                            onClick={() => { setViewerImage(s.imageUrl); setViewerZoom(1); }}
                          >
                            <i className="fa-solid fa-expand"></i>
                            <span>عرض بالحجم الكامل</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Image Viewer Modal ──────────────────────────────── */}
              {viewerImage && (
                <div className="sched-viewer-overlay" onClick={() => setViewerImage("")}>
                  <div className="sched-viewer-toolbar" onClick={e => e.stopPropagation()}>
                    <button className="sched-viewer-btn" onClick={() => setViewerZoom(z => Math.min(z + 0.25, 4))} title="تكبير">
                      <i className="fa-solid fa-magnifying-glass-plus"></i>
                    </button>
                    <span className="sched-viewer-zoom-label">{Math.round(viewerZoom * 100)}%</span>
                    <button className="sched-viewer-btn" onClick={() => setViewerZoom(z => Math.max(z - 0.25, 0.5))} title="تصغير">
                      <i className="fa-solid fa-magnifying-glass-minus"></i>
                    </button>
                    <button className="sched-viewer-btn sched-viewer-btn--close" onClick={() => setViewerImage("")} title="إغلاق">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <div className="sched-viewer-scroll" onClick={e => e.stopPropagation()}>
                    <img
                      src={viewerImage}
                      alt="جدول المعلم"
                      className="sched-viewer-img"
                      style={{ transform: `scale(${viewerZoom})` }}
                    />
                  </div>
                </div>
              )}

              {/* ── Locked feature cards (coming soon) ─────────── */}
              <div className="student-locked-card">
                <div className="student-locked-icon">
                  <i className="fa-solid fa-book-open"></i>
                </div>
                <h4 className="student-locked-title">دروسي</h4>
                <p className="student-locked-desc">
                  تابع دروسك ومحاضراتك في مكان واحد
                </p>
                <span className="student-locked-badge">
                  <i className="fa-solid fa-lock"></i> قريباً
                </span>
              </div>

              <div className="student-locked-card">
                <div className="student-locked-icon">
                  <i className="fa-solid fa-calendar-days"></i>
                </div>
                <h4 className="student-locked-title">جدولي</h4>
                <p className="student-locked-desc">
                  اعرف مواعيد حصصك أسبوعاً بأسبوع
                </p>
                <span className="student-locked-badge">
                  <i className="fa-solid fa-lock"></i> قريباً
                </span>
              </div>

              <div className="student-locked-card">
                <div className="student-locked-icon">
                  <i className="fa-solid fa-chart-bar"></i>
                </div>
                <h4 className="student-locked-title">نتائجي</h4>
                <p className="student-locked-desc">
                  تابع تقدمك ونتائج اختباراتك بسهولة
                </p>
                <span className="student-locked-badge">
                  <i className="fa-solid fa-lock"></i> قريباً
                </span>
              </div>

            </div>
            <div className="footer">
              <p>جميع الحقوق محفوظة © 2026</p>
              <p>تصميم وبرمجة <a href="https://wa.me/201015508532" target="_blank" rel="noopener noreferrer" >Developers</a></p>
            </div>
          </>
        ) : (
          <div className="student-loading-state">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>تعذر تحميل بيانات الحساب. يرجى المحاولة مرة أخرى.</span>
          </div>
        )}
      </main>
    </div>
  );
}
