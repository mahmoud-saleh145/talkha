"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Admin {
  _id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
}

export default function AdminManagement() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminUser, setAdminUser] = useState({ name: "", email: "", role: "" });
  const [loadingData, setLoadingData] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);

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

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.status === 401) { router.push("/admin"); return; }
      const json = await res.json();
      if (json.success) setAdmins(json.data);
    } catch {
      showToast("تعذر جلب قائمة الأدمنز.", "error");
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    const logged = sessionStorage.getItem("loggedAdmin");
    if (logged) setAdminUser(JSON.parse(logged));
    fetchAdmins();
  }, [fetchAdmins]);

  const handleLogout = async () => {
    showToast("جاري تسجيل الخروج...", "info");
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("loggedAdmin");
    setTimeout(() => router.push("/admin"), 800);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleAvatarClass = (role: string) => {
    if (role === "مدير عام") return "super";
    if (role === "أدمن") return "admin";
    return "mod";
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === "مدير عام") return "role-super";
    if (role === "أدمن") return "role-admin";
    return "role-mod";
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin({ ...admin });
    setEditPassword("");
    setShowEditModal(true);
  };

  const saveNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      showToast("كلمتا المرور غير متطابقتين!", "error"); return;
    }
    if (newPassword.length < 6) {
      showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "error"); return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole, password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.message ?? "حدث خطأ.", "error"); return;
      }
      showToast(`تم إضافة الأدمن "${newName}" بنجاح!`, "success");
      setShowAddModal(false);
      setNewName(""); setNewEmail(""); setNewRole(""); setNewPassword(""); setNewPasswordConfirm("");
      fetchAdmins();
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    } finally {
      setAddLoading(false);
    }
  };

  const saveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin?._id) return;

    setEditLoading(true);
    try {
      const payload: Record<string, string> = {
        name: editingAdmin.name,
        email: editingAdmin.email,
        role: editingAdmin.role,
        status: editingAdmin.status,
      };
      if (editPassword.trim()) {
        if (editPassword.length < 6) {
          showToast("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.", "error");
          setEditLoading(false); return;
        }
        payload.password = editPassword;
      }

      const res = await fetch(`/api/admin/admins/${editingAdmin._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.message ?? "حدث خطأ.", "error"); return;
      }
      showToast(`تم تعديل حساب "${editingAdmin.name}" بنجاح!`, "success");
      setShowEditModal(false);
      fetchAdmins();
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (admin.email === adminUser.email) {
      showToast("لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول!", "error"); return;
    }
    if (!confirm(`هل أنت متأكد من حذف حساب "${admin.name}"؟`)) return;

    try {
      const res = await fetch(`/api/admin/admins/${admin._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.message ?? "حدث خطأ.", "error"); return;
      }
      showToast(`تم حذف حساب "${admin.name}" بنجاح`, "error");
      fetchAdmins();
    } catch {
      showToast("تعذر الاتصال بالخادم.", "error");
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || admin.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.status === "نشط").length;
  const superAdmins = admins.filter((a) => a.role === "مدير عام").length;

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
            <li className="menu-item active">
              <a href="#" className="menu-link">
                <i className="fa-solid fa-table-cells-large"></i><span>لوحة القيادة</span>
              </a>
            </li>
            <li className="menu-item">
              <Link href="/admin/dashboard" className="menu-link">
                <i className="fa-solid fa-user-group"></i><span>الطلاب</span>
              </Link>
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
              placeholder="بحث عن أدمن باسمه أو بريده..."
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
              <div className="stat-icon-wrapper"><i className="fa-solid fa-user-shield"></i></div>
              <span className="stat-trend trend-up"><i className="fa-solid fa-arrow-trend-up"></i> نشط</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">إجمالي الأدمنز</span>
              <span className="stat-number">{totalAdmins}</span>
            </div>
          </div>
          <div className="stat-card stat-male">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-solid fa-circle-check"></i></div>
              <span className="stat-sub">حسابات فعّالة</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">أدمنز نشطون</span>
              <span className="stat-number">{activeAdmins}</span>
            </div>
          </div>
          <div className="stat-card stat-female">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-solid fa-key"></i></div>
              <span className="stat-sub">صلاحية كاملة</span>
            </div>
            <div className="stat-body">
              <span className="stat-label">مديرون عامون</span>
              <span className="stat-number">{superAdmins}</span>
            </div>
          </div>
          <div className="stat-card stat-today">
            <div className="stat-header">
              <div className="stat-icon-wrapper"><i className="fa-regular fa-calendar-check"></i></div>
            </div>
            <div className="stat-body">
              <span className="stat-label">آخر تسجيل دخول</span>
              <span className="stat-number" style={{ fontSize: "18px" }}>اليوم</span>
            </div>
          </div>
        </section>

        <section className="data-table-container">
          <div className="table-header">
            <h3 className="table-title">
              <i className="fa-solid fa-user-shield" style={{ color: "var(--primary-color)", marginLeft: "8px" }}></i>
              قائمة حسابات الأدمنز
            </h3>
            <div className="table-actions">
              <div className="filter-dropdown-wrapper">
                <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">كل الصلاحيات</option>
                  <option value="مدير عام">مدير عام</option>
                  <option value="أدمن">أدمن</option>
                  <option value="مشرف">مشرف</option>
                </select>
                <i className="fa-solid fa-filter filter-icon"></i>
              </div>
              <button className="add-admin-btn" onClick={() => setShowAddModal(true)}>
                <i className="fa-solid fa-user-plus"></i><span>إضافة أدمن</span>
              </button>
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
                    <th>الصورة</th>
                    <th>الاسم الكامل</th>
                    <th>البريد الإلكتروني</th>
                    <th>الصلاحية</th>
                    <th>الحالة</th>
                    <th>تاريخ الإضافة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin._id ?? admin.email}>
                      <td>
                        <div className="admin-avatar-cell">
                          <div className={`admin-avatar-circle ${getRoleAvatarClass(admin.role)}`}>
                            {getInitials(admin.name)}
                          </div>
                        </div>
                      </td>
                      <td><span className="student-name">{admin.name}</span></td>
                      <td><span className="admin-email">{admin.email}</span></td>
                      <td><span className={`role-badge ${getRoleBadgeClass(admin.role)}`}>{admin.role}</span></td>
                      <td>
                        <span className={`status-badge ${admin.status === "نشط" ? "status-active" : "status-inactive"}`}>
                          {admin.status}
                        </span>
                      </td>
                      <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("ar-EG") : "-"}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn btn-edit" title="تعديل" onClick={() => openEditModal(admin)}>
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button className="action-btn btn-delete" title="حذف" onClick={() => handleDeleteAdmin(admin)}>
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAdmins.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                        لا توجد حسابات أدمن تطابق الفلاتر المحددة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-footer">
            <div className="showing-count">
              عرض {filteredAdmins.length} من أصل {admins.length} أدمن
            </div>
          </div>
        </section>
        <div className="footer">
          <p>جميع الحقوق محفوظة © 2026</p>
          <p>تصميم وبرمجة <a href="https://wa.me/201015508532" target="_blank" rel="noopener noreferrer" >Developers</a></p>
        </div>
      </main>

      {/* ADD ADMIN MODAL */}
      {showAddModal && (
        <div className="modal-overlay" style={{ display: "flex" }}>
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-header-icon" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <div>
                <h3 className="modal-title">إضافة أدمن جديد</h3>
                <p className="modal-subtitle">أدخل بيانات الأدمن الجديد لإضافته للنظام</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form className="modal-form" onSubmit={saveNewAdmin}>
              <div className="modal-form-group">
                <label className="modal-label">الاسم الكامل</label>
                <div className="modal-input-wrapper">
                  <input type="text" className="modal-input" placeholder="اسم الأدمن كاملاً" required value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <i className="fa-regular fa-user modal-input-icon"></i>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">البريد الإلكتروني</label>
                  <div className="modal-input-wrapper">
                    <input type="email" className="modal-input" placeholder="example@2total.com" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    <i className="fa-regular fa-envelope modal-input-icon"></i>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">الصلاحية</label>
                  <div className="modal-select-wrapper">
                    <select className="modal-select" required value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                      <option value="" disabled>اختر الصلاحية</option>
                      <option value="مدير عام">مدير عام</option>
                      <option value="أدمن">أدمن</option>
                      <option value="مشرف">مشرف</option>
                    </select>
                    <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">كلمة المرور</label>
                  <div className="modal-input-wrapper">
                    <input type="password" className="modal-input" placeholder="••••••••" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <i className="fa-solid fa-lock modal-input-icon"></i>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">تأكيد كلمة المرور</label>
                  <div className="modal-input-wrapper">
                    <input type="password" className="modal-input" placeholder="••••••••" required minLength={6} value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                    <i className="fa-solid fa-lock modal-input-icon"></i>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowAddModal(false)}>
                  <i className="fa-solid fa-xmark"></i><span>إلغاء</span>
                </button>
                <button type="submit" className="modal-save-btn" style={{ backgroundColor: "#16a34a", boxShadow: "0 4px 12px rgba(22,163,74,0.2)" }} disabled={addLoading}>
                  {addLoading ? <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري الإضافة...</span></> : <><i className="fa-solid fa-user-plus"></i><span>إضافة الأدمن</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {showEditModal && editingAdmin && (
        <div className="modal-overlay" style={{ display: "flex" }}>
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-header-icon" style={{ backgroundColor: "var(--accent-blue-bg)", color: "var(--bright-blue)" }}>
                <i className="fa-solid fa-user-gear"></i>
              </div>
              <div>
                <h3 className="modal-title">تعديل بيانات الحساب</h3>
                <p className="modal-subtitle">تحديث الصلاحيات أو البيانات الخاصة بالأدمن</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form className="modal-form" onSubmit={saveAdminEdit}>
              <div className="modal-form-group">
                <label className="modal-label">الاسم الكامل</label>
                <div className="modal-input-wrapper">
                  <input type="text" className="modal-input" required value={editingAdmin.name} onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })} />
                  <i className="fa-regular fa-user modal-input-icon"></i>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">البريد الإلكتروني</label>
                  <div className="modal-input-wrapper">
                    <input type="email" className="modal-input" required value={editingAdmin.email} onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })} />
                    <i className="fa-regular fa-envelope modal-input-icon"></i>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">الصلاحية</label>
                  <div className="modal-select-wrapper">
                    <select className="modal-select" value={editingAdmin.role} onChange={(e) => setEditingAdmin({ ...editingAdmin, role: e.target.value })}>
                      <option value="مدير عام">مدير عام</option>
                      <option value="أدمن">أدمن</option>
                      <option value="مشرف">مشرف</option>
                    </select>
                    <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                  </div>
                </div>
              </div>
              <div className="modal-row">
                <div className="modal-form-group">
                  <label className="modal-label">كلمة المرور الجديدة (اختياري)</label>
                  <div className="modal-input-wrapper">
                    <input type="password" className="modal-input" placeholder="اتركه فارغاً للاحتفاظ بالحالية" minLength={6} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                    <i className="fa-solid fa-lock modal-input-icon"></i>
                  </div>
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">الحالة</label>
                  <div className="modal-select-wrapper">
                    <select className="modal-select" value={editingAdmin.status} onChange={(e) => setEditingAdmin({ ...editingAdmin, status: e.target.value })}>
                      <option value="نشط">نشط</option>
                      <option value="غير نشط">غير نشط</option>
                    </select>
                    <i className="fa-solid fa-chevron-down modal-select-arrow"></i>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowEditModal(false)}>
                  <i className="fa-solid fa-xmark"></i><span>إلغاء</span>
                </button>
                <button type="submit" className="modal-save-btn" style={{ backgroundColor: "var(--bright-blue)", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }} disabled={editLoading}>
                  {editLoading ? <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري الحفظ...</span></> : <><i className="fa-solid fa-check"></i><span>حفظ التعديلات</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
