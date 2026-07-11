"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pagination from "@/lib/utils/usePagination";

interface Student {
  _id: string;
  code: string;
  name: string;
  gender: string;
  studentPhone: string;
  parentPhone: string;
  school: string;
  parentJob: string;
  grade: string;
  branch: string;
  track?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  males: number;
  females: number;
  todayCount: number;
}

interface StudentsResponse {
  students: Student[];
  total: number;
  page: number;
  pages: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, males: 0, females: 0, todayCount: 0 });
  const [adminUser, setAdminUser] = useState({ name: "", role: "" });
  const [loadingData, setLoadingData] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [sort, setSort] = useState("-code");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [exportLoading, setExportLoading] = useState(false);

  const GRADE_TRACKS: Record<string, string[]> = {
    "تانية ثانوي": [
      "مسار الطب و علوم الحياة",
      "مسار الهندسة و علوم الحاسب",
      "مسار الأعمال",
      "مسار الأدب و الفنون",
    ],
    "تالتة ثانوي": ["علمي رياضة", "علمي علوم", "أدبي"],
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

  const fetchStudents = useCallback(async (page = 1, search = "", gender = "", sortValue = "code") => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        search,
        gender: gender === "all" ? "" : gender,
        sort: sortValue,
      });
      const res = await fetch(`/api/admin/students?${params}`);
      if (res.status === 401) { router.push("/admin"); return; }
      const json = await res.json();
      if (json.success) {
        const data: StudentsResponse = json.data;
        setStudents(data.students);
        setTotalCount(data.total);
        setTotalPages(data.pages);
        setCurrentPage(data.page);
      }
    } catch {
      showToast("تعذر جلب بيانات الطلاب.", "error");
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/statistics");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStats(json.data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const logged = sessionStorage.getItem("loggedAdmin");
    if (logged) setAdminUser(JSON.parse(logged));
    fetchStudents(1, "", "all", sort);
    fetchStats();
  }, [fetchStudents, fetchStats]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1, searchQuery, genderFilter, sort);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, genderFilter, fetchStudents, sort]);

  const handleLogout = async () => {
    showToast("جاري تسجيل الخروج...", "info");
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("loggedAdmin");
    setTimeout(() => router.push("/admin"), 800);
  };

  const exportToExcel = async () => {
    setExportLoading(true);
    showToast("جاري تصدير البيانات إلى Excel...", "info");

    try {
      const params = new URLSearchParams();

      if (genderFilter !== "all") {
        params.append("gender", genderFilter);
      }

      const res = await fetch(
        `/api/admin/students/export?${params.toString()}`
      );

      if (!res.ok) {
        showToast("حدث خطأ أثناء التصدير.", "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      const name =
        genderFilter === "ذكر"
          ? "boys"
          : genderFilter === "أنثى"
            ? "girls"
            : "students";

      a.download = `${name}_${Date.now()}.xlsx`;

      a.click();

      URL.revokeObjectURL(url);

      showToast("تم تصدير الملف بنجاح!", "success");
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف بيانات الطالب "${student.name}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/students/${student._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) { showToast(json.message ?? "حدث خطأ.", "error"); return; }
      showToast(`تم حذف الطالب "${student.name}" بنجاح`, "error");
      fetchStudents(currentPage, searchQuery, genderFilter, sort);
      fetchStats();
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent({ ...student });
    setShowEditModal(true);
  };

  const saveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const words = editingStudent.name.trim().split(/\s+/).filter(Boolean);
    if (words.length < 4) { showToast("يرجى إدخال الاسم رباعياً على الأقل.", "error"); return; }

    const egPhone = /^01[0125]\d{8}$/;
    if (!egPhone.test(editingStudent.studentPhone.trim())) { showToast("رقم هاتف الطالب غير صحيح.", "error"); return; }
    if (!egPhone.test(editingStudent.parentPhone.trim())) { showToast("رقم هاتف ولي الأمر غير صحيح.", "error"); return; }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${editingStudent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingStudent.name.trim(),
          gender: editingStudent.gender,
          studentPhone: editingStudent.studentPhone.trim(),
          parentPhone: editingStudent.parentPhone.trim(),
          school: editingStudent.school.trim(),
          parentJob: editingStudent.parentJob.trim(),
          grade: editingStudent.grade,
          track: editingStudent.track ?? "",
          branch: editingStudent.branch ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { showToast(json.message ?? "حدث خطأ.", "error"); return; }
      showToast(`تم تحديث بيانات الطالب "${editingStudent.name}" بنجاح`, "success");
      setShowEditModal(false);
      fetchStudents(currentPage, searchQuery, genderFilter);
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const openViewModal = (student: Student) => {
    setViewingStudent(student);
    setShowViewModal(true);
  };

  const malesPercent = stats.total > 0 ? Math.round((stats.males / stats.total) * 100) : 0;
  const femalesPercent = stats.total > 0 ? Math.round((stats.females / stats.total) * 100) : 0;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="logo-icon-box"><i className="fa-solid fa-graduation-cap"></i></div>
            <div>
              <h2 className="logo-title">نظام التسجيل</h2>
              <span className="logo-sub">إدارة الطلاب</span>
            </div>
          </div>
          <ul className="sidebar-menu">
            <li className="menu-item">
              <Link href="/admin/manage" className="menu-link">
                <i className="fa-solid fa-table-cells-large"></i><span>لوحة القيادة</span>
              </Link>
            </li>
            <li className="menu-item active">
              <a href="#" className="menu-link">
                <i className="fa-solid fa-user-group"></i><span>الطلاب</span>
              </a>
            </li>
            <li className="menu-item">
              <Link href="/admin/schedules" className="menu-link">
                <i className="fa-solid fa-calendar-days"></i><span>الجداول</span>
              </Link>
            </li>
            <li className="menu-item">
              <a href="#" className="menu-link" onClick={(e) => { e.preventDefault(); showToast("صفحة التقارير قيد التطوير قريباً", "info"); }}>
                <i className="fa-solid fa-chart-simple"></i><span>التقارير</span>
              </a>
            </li>
            <li className="menu-item">
              <a href="#" className="menu-link" onClick={(e) => { e.preventDefault(); showToast("صفحة الإعدادات قيد التطوير قريباً", "info"); }}>
                <i className="fa-solid fa-gear"></i><span>الإعدادات</span>
              </a>
            </li>
          </ul>
        </div>
        <div className="sidebar-bottom">
          <Link href="/" className="register-shortcut-btn">
            <i className="fa-solid fa-user-plus"></i><span>تسجيل طالب جديد</span>
          </Link>
          <a href="#" className="logout-btn" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
            <i className="fa-solid fa-right-from-bracket"></i><span>تسجيل الخروج</span>
          </a>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="بحث عن طالب، كود، أو هاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
          </div>
          <div className="profile-actions">
            <button className="header-icon-btn" onClick={() => showToast("لا توجد إشعارات جديدة حالياً", "info")}>
              <i className="fa-regular fa-bell"></i>
            </button>
            <div className="header-profile-box">
              <div className="profile-info">
                <span className="profile-name">{adminUser.name}</span>
                <span className="profile-role">{adminUser.role}</span>
              </div>
              <i className="fa-solid fa-circle-user" style={{ fontSize: "30px", color: "var(--primary-color)" }}></i>

            </div>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-solid fa-users"></i></div>
              <span className="stat-trend trend-up"><i className="fa-solid fa-arrow-trend-up"></i> +12%</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">إجمالي الطلاب</span>
              <span className="stat-number">{stats.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card stat-male">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-solid fa-user"></i></div>
              <span className="stat-sub">{malesPercent}% من الإجمالي</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">عدد الذكور</span>
              <span className="stat-number">{stats.males.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card stat-female">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-solid fa-user"></i></div>
              <span className="stat-sub">{femalesPercent}% من الإجمالي</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">عدد الإناث</span>
              <span className="stat-number">{stats.females.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card stat-today">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-regular fa-calendar-check"></i></div>
              <span className="stat-trend trend-down"><i className="fa-solid fa-arrow-trend-down"></i> اليوم</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">عدد التسجيلات اليوم</span>
              <span className="stat-number">{stats.todayCount}</span>
            </div>
          </div>
        </section>

        <section className="data-table-container">
          <div className="table-header">
            <h3 className="table-title">قائمة الطلاب المسجلين</h3>
            <div className="table-actions">
              <button className="export-btn" onClick={exportToExcel} disabled={exportLoading}>
                {exportLoading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري التصدير...</span></>
                  : <><i className="fa-solid fa-download"></i><span>تصدير Excel</span></>
                }
              </button>
              <div className="table-actions">
                <div className="filter-dropdown-wrapper">
                  <select
                    className="filter-select"
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                  >
                    <option value="all">كل الأجناس</option>
                    <option value="ذكر">ذكور</option>
                    <option value="أنثى">إناث</option>
                  </select>
                  <i className="fa-solid fa-filter filter-icon"></i>
                </div>

                <div className="filter-dropdown-wrapper">
                  <select
                    className="filter-select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="-code">الاحدث</option>
                    <option value="code">الأقدم </option>

                  </select>
                  <i className="fa-solid fa-filter filter-icon"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            {loadingData ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px" }}></i>
                <p style={{ marginTop: "12px" }}>جاري تحميل البيانات...</p>
              </div>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>كود الطالب</th>
                    <th>الاسم الكامل</th>
                    <th>الجنس</th>
                    <th>هاتف الطالب</th>
                    <th>هاتف ولي الأمر</th>
                    <th>المدرسة</th>
                    <th>وظيفة ولي الأمر</th>
                    <th>الفرع</th>
                    <th>الصف</th>
                    <th>المسار / الشعبة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td><span className="student-code">{student.code}</span></td>
                      <td><span className="student-name">{student.name}</span></td>
                      <td>{student.gender}</td>
                      <td>{student.studentPhone}</td>
                      <td>{student.parentPhone}</td>
                      <td><div className="student-school">{student.school}</div></td>
                      <td>{student.parentJob}</td>
                      <td>{student.branch}</td>
                      <td>{student.grade}</td>
                      <td>{student.track || "-"}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn btn-edit" title="تعديل" onClick={() => openEditModal(student)}>
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button className="action-btn btn-view" title="عرض" onClick={() => openViewModal(student)}>
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          <button className="action-btn btn-delete" title="حذف" onClick={() => handleDeleteStudent(student)}>
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => {
                              const phone = student.studentPhone.replace(/^0/, "20");

                              const whatsappUrl = `https://wa.me/${phone}`;

                              window.open(whatsappUrl, "_blank");
                            }}
                            style={{ backgroundColor: "#25D366" }}
                          >
                            <i className="fa-brands fa-whatsapp"></i>
                            <span style={{ fontSize: "8px" }}> </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                        لا توجد نتائج تطابق خيارات البحث الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-footer">
            <div className="showing-count">
              عرض {students.length} من أصل {totalCount} طالب
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => fetchStudents(page, searchQuery, genderFilter, sort)}
            />
          </div>
        </section>
      </main>

      {/* EDIT STUDENT MODAL */}
      {showEditModal && editingStudent && (
        <div className="modal-overlay" style={{ display: "flex" }}>
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-header-icon edit-icon"><i className="fa-solid fa-pen-to-square"></i></div>
              <div>
                <h3 className="modal-title">تعديل بيانات الطالب</h3>
                <p className="modal-subtitle">يمكنك تعديل أي حقل ثم حفظ التغييرات</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form className="modal-form" onSubmit={saveStudentEdit}>
              <div className="modal-form-group">
                <label className="modal-label">كود الطالب</label>
                <div className="modal-input-wrapper">
                  <input type="text" className="modal-input readonly-input" readOnly value={editingStudent.code} />
                  <i className="fa-solid fa-hashtag modal-input-icon"></i>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">اسم الطالب رباعي</label>
                <div className="modal-input-wrapper">
                  <input type="text" className="modal-input" required value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} />
                  <i className="fa-regular fa-user modal-input-icon"></i>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">الجنس</label>
                  <div className="modal-select-wrapper">
                    <select className="modal-select" value={editingStudent.gender}
                      onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                    <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">المدرسة</label>
                  <div className="modal-input-wrapper">
                    <input type="text" className="modal-input" required value={editingStudent.school}
                      onChange={(e) => setEditingStudent({ ...editingStudent, school: e.target.value })} />
                    <i className="fa-solid fa-school modal-input-icon"></i>
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">هاتف الطالب</label>
                  <div className="modal-input-wrapper">
                    <input type="tel" className="modal-input" required value={editingStudent.studentPhone}
                      onChange={(e) => setEditingStudent({ ...editingStudent, studentPhone: e.target.value })} />
                    <i className="fa-regular fa-comment-dots modal-input-icon"></i>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">هاتف ولي الأمر</label>
                  <div className="modal-input-wrapper">
                    <input type="tel" className="modal-input" required value={editingStudent.parentPhone}
                      onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })} />
                    <i className="fa-solid fa-mobile-screen-button modal-input-icon"></i>
                  </div>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">وظيفة ولي الأمر</label>
                <div className="modal-input-wrapper">
                  <input type="text" className="modal-input" required value={editingStudent.parentJob}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentJob: e.target.value })} />
                  <i className="fa-solid fa-briefcase modal-input-icon"></i>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">الفرع / المركز</label>
                <div className="modal-select-wrapper">
                  <select
                    className="modal-select"
                    required
                    value={editingStudent.branch}
                    onChange={(e) => setEditingStudent({ ...editingStudent, branch: e.target.value })}
                  >
                    <option value="فورجي الكاكولا">فورجي الكاكولا</option>
                    <option value="ستارز فرينش بيكر">ستارز فرينش بيكر</option>

                  </select>
                  <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">الصف الدراسي</label>
                  <div className="modal-select-wrapper">
                    <select
                      className="modal-select"
                      required
                      value={editingStudent.grade}
                      onChange={(e) => setEditingStudent({
                        ...editingStudent,
                        grade: e.target.value,
                        track: "", // reset track when grade changes
                      })}
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
                    <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                  </div>
                </div>

                {(GRADE_TRACKS[editingStudent.grade] ?? []).length > 0 && (
                  <div className="modal-form-group">
                    <label className="modal-label">
                      {editingStudent.grade === "تانية ثانوي" ? "المسار" : "الشعبة"}
                    </label>
                    <div className="modal-select-wrapper">
                      <select
                        className="modal-select"
                        required
                        value={editingStudent.track ?? ""}
                        onChange={(e) => setEditingStudent({ ...editingStudent, track: e.target.value })}
                      >
                        <option value="" disabled>اختر...</option>
                        {(GRADE_TRACKS[editingStudent.grade] ?? []).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowEditModal(false)}>
                  <i className="fa-solid fa-xmark"></i><span>إلغاء</span>
                </button>
                <button type="submit" className="modal-save-btn" disabled={editLoading}>
                  {editLoading
                    ? <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري الحفظ...</span></>
                    : <><i className="fa-solid fa-floppy-disk"></i><span>حفظ التغييرات</span></>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STUDENT MODAL */}
      {showViewModal && viewingStudent && (
        <div className="modal-overlay" style={{ display: "flex" }}>
          <div className="modal-card view-modal-card">
            <div className="modal-header">
              <div className="modal-header-icon view-icon"><i className="fa-solid fa-eye"></i></div>
              <div>
                <h3 className="modal-title">بيانات الطالب</h3>
                <p className="modal-subtitle">عرض كامل لملف الطالب</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
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
                <div className="view-info-icon school-icon"><i className="fa-solid fa-school"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">المدرسة</span>
                  <span className="view-info-value">{viewingStudent.school}</span>
                </div>
              </div>
              <div className="view-info-card">
                <div className="view-info-icon" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
                  <i className="fa-solid fa-graduation-cap"></i>
                </div>
                <div className="view-info-content">
                  <span className="view-info-label">الصف الدراسي</span>
                  <span className="view-info-value">{viewingStudent.grade}</span>
                </div>
              </div>

              {viewingStudent.track && (
                <div className="view-info-card">
                  <div className="view-info-icon" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                    <i className="fa-solid fa-code-branch"></i>
                  </div>
                  <div className="view-info-content">
                    <span className="view-info-label">المسار / الشعبة</span>
                    <span className="view-info-value">{viewingStudent.track}</span>
                  </div>
                </div>
              )}
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
                <div className="view-info-icon job-icon"><i className="fa-solid fa-briefcase"></i></div>
                <div className="view-info-content">
                  <span className="view-info-label">وظيفة ولي الأمر</span>
                  <span className="view-info-value">{viewingStudent.parentJob}</span>
                </div>
              </div>
              <div className="view-info-content">
                <span className="view-info-label">الفرع / المركز</span>
                <span className="view-info-value">{viewingStudent.branch}</span>
              </div>
            </div>
            <button className="modal-close-full-btn" onClick={() => setShowViewModal(false)}>
              <i className="fa-solid fa-xmark"></i><span>إغلاق</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
