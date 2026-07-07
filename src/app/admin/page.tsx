"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [shake, setShake] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("يرجى تعبئة جميع الحقول.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoading(false);
        setErrorMsg(json.message ?? "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      // Store admin info in sessionStorage for display
      sessionStorage.setItem("loggedAdmin", JSON.stringify(json.data.admin));

      setShowSuccessFlash(true);
      setTimeout(() => router.push("/admin/manage"), 900);
    } catch {
      setLoading(false);
      setErrorMsg("تعذر الاتصال بالخادم. تحقق من اتصالك.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="admin-login-body min-h-screen">
      <div className={`login-success-flash ${showSuccessFlash ? "show" : ""}`}>
        <img
          src="/assets/img/WhatsApp Image 2026-07-07 at 2.48.41 AM.jpeg"
          alt="Center Logo"
          className="success-flash-logo"
        />
      </div>

      <div className={`admin-login-card ${shake ? "shake-animation" : ""}`}>
        <div className="admin-logo-row">
          <img
            src="/assets/img/WhatsApp Image 2026-07-07 at 2.48.41 AM.jpeg"
            alt="2TOTAL STARS Logo"
            className="admin-logo-img"
          />
          <img
            src="/assets/img/WhatsApp Image 2026-06-25 at 4.52.17 PM.jpeg"
            alt="2TOTAL CENTER Logo"
            className="admin-logo-img"
          />
        </div>

        <h1 className="admin-login-title">تسجيل دخول الأدمن</h1>
        <p className="admin-login-subtitle">أدخل بيانات حسابك للوصول إلى لوحة التحكم</p>

        <form className="admin-form" onSubmit={handleLogin}>
          <div className="admin-form-group">
            <label className="admin-label" htmlFor="login-email">البريد الإلكتروني</label>
            <div className="admin-input-wrapper">
              <input
                type="email"
                id="login-email"
                className="admin-input"
                placeholder="example@2total.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
              />
              <i className="fa-regular fa-envelope admin-input-icon-right"></i>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-label" htmlFor="login-password">كلمة المرور</label>
            <div className="admin-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                className="admin-input"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
              />
              <i className="fa-solid fa-lock admin-input-icon-right"></i>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={showPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye"}></i>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="admin-error-msg show">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className={`admin-login-btn ${loading ? "loading" : ""}`}
            disabled={loading || showSuccessFlash}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري التحقق...</span></>
            ) : showSuccessFlash ? (
              <><i className="fa-solid fa-circle-check"></i><span>تم تسجيل الدخول بنجاح!</span></>
            ) : (
              <><i className="fa-solid fa-right-to-bracket"></i><span>دخول إلى لوحة التحكم</span></>
            )}
          </button>
        </form>

        <Link href="/" className="admin-back-link">
          <i className="fa-solid fa-arrow-right"></i>
          <span>العودة إلى صفحة التسجيل</span>
        </Link>
      </div>


      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .shake-animation { animation: shake 0.4s ease-in-out; }
      `}</style>

      <div className="footer">
        <p>جميع الحقوق محفوظة © 2026</p>
        <p>تصميم وبرمجة <a href="https://wa.me/201015508532" target="_blank" rel="noopener noreferrer" >Developers</a></p>
      </div>
    </div>
  );
}
