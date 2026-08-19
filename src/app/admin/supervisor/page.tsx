// src/app/admin/supervisor/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Student {
  _id: string;
  code: string;
  name: string;
  gender: string;
  grade: string;
  track?: string;
  branch: string;
  studentPhone: string;
  parentPhone: string;
  school: string;
  parentJob: string;
  createdAt: string;
}

export default function SupervisorPage() {
  const router = useRouter();
  const [supervisorUser, setSupervisorUser] = useState({ name: "", role: "" });

  // Search
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // View modal
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

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

  useEffect(() => {
    const logged = sessionStorage.getItem("loggedAdmin");
    if (!logged) { router.push("/admin"); return; }
    const parsed = JSON.parse(logged);
    // Admins should not be on this page
    if (parsed.role === "أدمن") { router.push("/admin/manage"); return; }
    setSupervisorUser(parsed);
  }, [router]);

  const doSearch = async (q: string) => {
    if (!q.trim()) {
      setStudents([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/supervisor/students?q=${encodeURIComponent(q.trim())}`);
      if (res.status === 401) { router.push("/admin"); return; }
      const json = await res.json();
      if (json.success) setStudents(json.data.students);
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 450);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  const handleLogout = async () => {
    showToast("جاري تسجيل الخروج...", "info");
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("loggedAdmin");
    setTimeout(() => router.push("/admin"), 800);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="logo-icon-box"><i className="fa-solid fa-graduation-cap"></i></div>
            <div>
              <h2 className="logo-title">Stars</h2>
              <span className="logo-sub">لوحة المشرف</span>
            </div>
          </div>
          <ul className="sidebar-menu">
            <li className="menu-item active">
              <a href="" className="menu-link">
                <i className="fa-solid fa-magnifying-glass"></i>
                <span>بحث الطلاب</span>
              </a>
            </li>

          </ul>
        </div>
        <div className="sidebar-bottom">
          <Link href="/" className="register-shortcut-btn">
            <i className="fa-solid fa-user-plus"></i>
            <span>تسجيل طالب جديد</span>
          </Link>
          <a href="#" className="logout-btn" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>تسجيل الخروج</span>
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="dashboard-header">
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--royal-blue)" }}>
              بحث الطلاب
            </h2>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              ابحث بالكود أو الاسم أو رقم الهاتف
            </span>
          </div>
          <div className="profile-actions">
            <div className="header-profile-box">
              <div className="profile-info">
                <span className="profile-name">{supervisorUser.name}</span>
                <span className="profile-role">مشرف</span>
              </div>

            </div>
          </div>
        </header>

        {/* Search card */}
        <section className="data-table-container">
          <div className="table-header">
            <h3 className="table-title">
              <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--primary-color)", marginLeft: "8px" }}></i>
              البحث عن طالب
            </h3>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="supervisor-search-form">
            <div className="supervisor-search-wrap">
              <input
                type="text"
                className="supervisor-search-input"
                placeholder="ابحث بالكود (A0001) أو الاسم أو رقم الهاتف..."
                value={query}
                onChange={handleSearchChange}
                autoFocus
              />
              <button type="submit" className="supervisor-search-btn" disabled={loading}>
                {loading
                  ? <i className="fa-solid fa-spinner fa-spin"></i>
                  : <i className="fa-solid fa-magnifying-glass"></i>
                }
              </button>
            </div>
          </form>

          {/* Results */}
          <div className="table-responsive">
            {!searched ? (
              <div className="supervisor-empty-state">
                <i className="fa-solid fa-magnifying-glass supervisor-empty-icon"></i>
                <p>أدخل كوداً أو اسماً أو رقم هاتف للبحث عن طالب</p>
              </div>
            ) : loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px" }}></i>
                <p style={{ marginTop: "12px" }}>جاري البحث...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="supervisor-empty-state">
                <i className="fa-solid fa-user-slash supervisor-empty-icon"></i>
                <p>لا توجد نتائج مطابقة لـ «{query}»</p>
              </div>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الاسم</th>
                    <th>الجنس</th>
                    <th>الصف</th>
                    <th>الفرع</th>
                    <th>هاتف الطالب</th>
                    <th>هاتف ولي الأمر</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td><span className="student-code">{s.code}</span></td>
                      <td><span className="student-name">{s.name}</span></td>
                      <td>{s.gender}</td>
                      <td>{s.grade}</td>
                      <td>{s.branch}</td>
                      <td style={{ direction: "ltr" }}>{s.studentPhone}</td>
                      <td style={{ direction: "ltr" }}>{s.parentPhone}</td>
                      <td>
                        <button
                          className="action-btn btn-view"
                          title="عرض"
                          onClick={() => setViewingStudent(s)}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {searched && students.length > 0 && (
            <div className="table-footer">
              <div className="showing-count">
                {students.length} نتيجة مطابقة لـ «{query}»
              </div>
            </div>
          )}
        </section>
      </main>

      {/* View Student Modal */}
      {viewingStudent && (
        <div className="modal-overlay" style={{ display: "flex" }}>
          <div className="modal-card view-modal-card">
            <div className="modal-header">
              <div className="modal-header-icon view-icon">
                <i className="fa-solid fa-eye"></i>
              </div>
              <div>
                <h3 className="modal-title">بيانات الطالب</h3>
                <p className="modal-subtitle">عرض كامل لملف الطالب</p>
              </div>
              <button className="modal-close-btn" onClick={() => setViewingStudent(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="view-student-hero">
              <div className={`view-avatar ${viewingStudent.gender === "أنثى" ? "female-avatar" : ""}`}>
                <i className="fa-solid fa-user-graduate"></i>
              </div>
              <div className="view-hero-info">
                <h2 className="view-student-name">{viewingStudent.name}</h2>
                <span className="view-code-badge">{viewingStudent.code}</span>
              </div>
            </div>

            <div className="view-info-grid">
              <div className="view-info-card">
                <div className="view-info-icon gender-icon"><i className="fa-solid fa-venus-mars"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">الجنس</span>
                  <span className="view-info-value">{viewingStudent.gender}</span>
                </div>
              </div>
              <div className="view-info-card">
                <div className="view-info-icon school-icon"><i className="fa-solid fa-graduation-cap"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">الصف</span>
                  <span className="view-info-value">{viewingStudent.grade}{viewingStudent.track ? ` — ${viewingStudent.track}` : ""}</span>
                </div>
              </div>
              <div className="view-info-card">
                <div className="view-info-icon phone-icon"><i className="fa-regular fa-comment-dots"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">هاتف الطالب</span>
                  <span className="view-info-value ltr-val">{viewingStudent.studentPhone}</span>
                </div>
              </div>
              <div className="view-info-card">
                <div className="view-info-icon parent-icon"><i className="fa-solid fa-mobile-screen-button"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">هاتف ولي الأمر</span>
                  <span className="view-info-value ltr-val">{viewingStudent.parentPhone}</span>
                </div>
              </div>
              <div className="view-info-card full-width-card">
                <div className="view-info-icon school-icon"><i className="fa-solid fa-school"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">المدرسة</span>
                  <span className="view-info-value">{viewingStudent.school}</span>
                </div>
              </div>
              <div className="view-info-card full-width-card">
                <div className="view-info-icon job-icon"><i className="fa-solid fa-briefcase"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">وظيفة ولي الأمر</span>
                  <span className="view-info-value">{viewingStudent.parentJob}</span>
                </div>
              </div>
              <div className="view-info-card full-width-card">
                <div className="view-info-icon" style={{ backgroundColor: "#f0fdf4", color: "#16a34a", width: "40px", height: "40px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                  <i className="fa-solid fa-location-dot"></i>
                </div>
                <div className="view-info-content">
                  <span className="view-info-label">الفرع / المركز</span>
                  <span className="view-info-value">{viewingStudent.branch}</span>
                </div>
              </div>
            </div>

            <button className="modal-close-full-btn" onClick={() => setViewingStudent(null)}>
              <i className="fa-solid fa-xmark"></i><span>إغلاق</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
