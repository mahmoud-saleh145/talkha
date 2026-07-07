// src/app/admin/schedules/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ALL_GRADES } from "@/lib/constants/grades";

interface Schedule {
  _id: string;
  grade: string;
  imageUrl: string;
  publicId: string;
  createdAt: string;
}

export default function AdminSchedulesPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState({ name: "", role: "" });
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Upload form state
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "signing" | "uploading" | "saving">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter
  const [filterGrade, setFilterGrade] = useState("all");

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

  const fetchSchedules = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/schedules");
      if (res.status === 401) { router.push("/admin"); return; }
      const json = await res.json();
      if (json.success) setSchedules(json.data);
    } catch {
      showToast("تعذر جلب الجداول.", "error");
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    const logged = sessionStorage.getItem("loggedAdmin");
    if (logged) setAdminUser(JSON.parse(logged));
    fetchSchedules();
  }, [fetchSchedules]);

  const handleLogout = async () => {
    showToast("جاري تسجيل الخروج...", "info");
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("loggedAdmin");
    setTimeout(() => router.push("/admin"), 800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedGrade("");
    setPreviewUrl("");
    setUploadProgress("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !selectedGrade) {
      showToast("يرجى اختيار الصف والصورة.", "error");
      return;
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE_MB = 10;
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      showToast("صيغة الصورة غير مدعومة. يُسمح بـ JPG, PNG, WebP, GIF فقط.", "error");
      return;
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`حجم الصورة يجب أن لا يتجاوز ${MAX_SIZE_MB}MB.`, "error");
      return;
    }

    setUploadLoading(true);

    try {
      // Step 1 — Get signed upload params from our API
      setUploadProgress("signing");
      const signRes = await fetch("/api/admin/schedules/sign");
      const signJson = await signRes.json();
      if (!signRes.ok || !signJson.success) {
        showToast(signJson.message ?? "فشل توليد التوقيع.", "error");
        return;
      }
      const { signature, timestamp, folder, cloudName, apiKey } = signJson.data;

      // Step 2 — Upload directly to Cloudinary from the browser
      setUploadProgress("uploading");
      const cloudFd = new FormData();
      cloudFd.append("file", selectedFile);
      cloudFd.append("api_key", apiKey);
      cloudFd.append("timestamp", String(timestamp));
      cloudFd.append("signature", signature);
      cloudFd.append("folder", folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: cloudFd }
      );
      const cloudJson = await cloudRes.json();

      if (!cloudRes.ok || !cloudJson.secure_url) {
        showToast("فشل رفع الصورة إلى Cloudinary.", "error");
        return;
      }

      // Step 3 — Save imageUrl + publicId to MongoDB via our API
      setUploadProgress("saving");
      const saveRes = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          imageUrl: cloudJson.secure_url,
          publicId: cloudJson.public_id,
        }),
      });
      const saveJson = await saveRes.json();

      if (!saveRes.ok || !saveJson.success) {
        showToast(saveJson.message ?? "خطأ في حفظ الجدول.", "error");
        return;
      }

      showToast("تم رفع الجدول بنجاح!", "success");
      resetForm();
      fetchSchedules();
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    } finally {
      setUploadLoading(false);
      setUploadProgress("idle");
    }
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`هل أنت متأكد من حذف جدول "${schedule.grade}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/schedules/${schedule._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) { showToast(json.message ?? "خطأ في الحذف.", "error"); return; }
      showToast("تم حذف الجدول بنجاح.", "error");
      fetchSchedules();
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    }
  };

  const progressLabel: Record<string, string> = {
    signing: "جاري التوقيع...",
    uploading: "جاري الرفع إلى Cloudinary...",
    saving: "جاري الحفظ...",
  };

  const filtered = filterGrade === "all"
    ? schedules
    : schedules.filter(s => s.grade === filterGrade);

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
            <li className="menu-item">
              <Link href="/admin/dashboard" className="menu-link">
                <i className="fa-solid fa-user-group"></i><span>الطلاب</span>
              </Link>
            </li>
            <li className="menu-item active">
              <a href="#" className="menu-link">
                <i className="fa-solid fa-calendar-days"></i><span>الجداول</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--royal-blue)" }}>
              جداول المعلمين
            </h2>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              رفع وإدارة صور جداول المعلمين لكل صف
            </span>
          </div>
          <div className="profile-actions">
            <div className="header-profile-box">
              <div className="profile-info">
                <span className="profile-name">{adminUser.name}</span>
                <span className="profile-role">{adminUser.role}</span>
              </div>
              <i className="fa-solid fa-circle-user" style={{ fontSize: "30px", color: "var(--primary-color)" }}></i>
            </div>
          </div>
        </header>

        {/* Upload card */}
        <section className="data-table-container">
          <div className="table-header">
            <h3 className="table-title">
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: "var(--primary-color)", marginLeft: "8px" }}></i>
              رفع جدول جديد
            </h3>
          </div>

          <form onSubmit={handleUpload} className="sched-upload-form">
            <div className="sched-upload-fields">
              {/* Grade select */}
              <div className="modal-form-group" style={{ flex: "1", minWidth: "200px" }}>
                <label className="modal-label">الصف الدراسي</label>
                <div className="modal-select-wrapper">
                  <select
                    className="modal-select"
                    required
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    disabled={uploadLoading}
                  >
                    <option value="" disabled>اختر الصف...</option>
                    {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                </div>
              </div>

              {/* File input */}
              <div className="modal-form-group" style={{ flex: "2", minWidth: "260px" }}>
                <label className="modal-label">صورة الجدول</label>
                <div className="sched-file-input-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sched-file-input"
                    onChange={handleFileChange}
                    required
                    disabled={uploadLoading}
                  />
                  <div className="sched-file-label">
                    {selectedFile ? (
                      <><i className="fa-solid fa-image"></i><span>{selectedFile.name}</span></>
                    ) : (
                      <><i className="fa-solid fa-cloud-arrow-up"></i><span>اضغط لاختيار صورة (JPG, PNG, WebP)</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="sched-preview">
                <img src={previewUrl} alt="معاينة الجدول" className="sched-preview-img" />
              </div>
            )}

            <button
              type="submit"
              className="modal-save-btn"
              style={{ maxWidth: "260px" }}
              disabled={uploadLoading}
            >
              {uploadLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>{progressLabel[uploadProgress] ?? "جاري المعالجة..."}</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>رفع الجدول</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Existing schedules */}
        <section className="data-table-container">
          <div className="table-header">
            <h3 className="table-title">
              <i className="fa-solid fa-images" style={{ color: "var(--primary-color)", marginLeft: "8px" }}></i>
              الجداول المرفوعة
            </h3>
            <div className="table-actions">
              <div className="filter-dropdown-wrapper">
                <select
                  className="filter-select"
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                >
                  <option value="all">كل الصفوف</option>
                  {ALL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <i className="fa-solid fa-filter filter-icon"></i>
              </div>
            </div>
          </div>

          {loadingData ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px" }}></i>
              <p style={{ marginTop: "12px" }}>جاري تحميل الجداول...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              لا توجد جداول مرفوعة لهذا الصف.
            </div>
          ) : (
            <div className="sched-grid">
              {filtered.map((s) => (
                <div key={s._id} className="sched-card">
                  <div className="sched-card-img-wrap">
                    <img src={s.imageUrl} alt={`جدول ${s.grade}`} className="sched-card-img" />
                  </div>
                  <div className="sched-card-body">
                    <span className="sched-grade-badge">{s.grade}</span>
                    <span className="sched-card-date">
                      {new Date(s.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                    <button
                      className="action-btn btn-delete"
                      style={{ width: "auto", padding: "6px 14px", gap: "6px", display: "flex", alignItems: "center" }}
                      onClick={() => handleDelete(s)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                      <span style={{ fontSize: "12px" }}>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="table-footer">
            <div className="showing-count">
              {filtered.length} جدول {filterGrade !== "all" ? `لـ ${filterGrade}` : ""}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
