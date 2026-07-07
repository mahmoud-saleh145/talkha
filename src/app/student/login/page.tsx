"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !phone.trim()) {
      setErrorMsg("يرجى تعبئة جميع الحقول.");
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoading(false);
        setErrorMsg(json.message ?? "بيانات غير صحيحة. يرجى المحاولة مجدداً.");
        triggerShake();
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/student/account"), 800);
    } catch {
      setLoading(false);
      setErrorMsg("تعذر الاتصال بالخادم. تحقق من اتصالك وأعد المحاولة.");
      triggerShake();
    }
  };

  return (
    <div className="student-login-body">
      {/* Logos above card — matches design */}
      <div className="student-login-logos">
        <img
          src="/assets/img/WhatsApp Image 2026-06-25 at 4.52.17 PM.jpeg"
          alt="2TOTAL STARS"
          className="student-login-logo-img"
        />
        <img
          src="/assets/img/WhatsApp Image 2026-07-07 at 2.48.41 AM.jpeg"
          alt="2TOTAL CENTER"
          className="student-login-logo-img"
        />
      </div>

      {/* Login card */}
      <div className={`student-login-card ${shake ? "student-login-shake" : ""}`}>
        <div className="student-login-card-header">
          <h1 className="student-login-title">تسجيل دخول الطالب</h1>
          <p className="student-login-subtitle">
            قم بإدخال الاسم ورقم الهاتف الذي سجلت به مسبقاً.
          </p>
        </div>

        <form className="student-login-form" onSubmit={handleSubmit}>
          {/* Full name field */}
          <div className="student-login-field">
            <label className="student-login-label" htmlFor="student-name">
              الاسم الرباعي
            </label>
            <div className="student-login-input-wrap">
              <input
                id="student-name"
                type="text"
                className="student-login-input"
                placeholder="أدخل اسمك الرباعي كاملاً"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => { setName(e.target.value); setErrorMsg(""); }}
              />
              <i className="fa-regular fa-user student-login-input-icon"></i>
            </div>
          </div>

          {/* Phone field */}
          <div className="student-login-field">
            <label className="student-login-label" htmlFor="student-phone">
              رقم الهاتف
            </label>
            <div className="student-login-input-wrap">
              <input
                id="student-phone"
                type="tel"
                className="student-login-input"
                placeholder="01xxxxxxxxx"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrorMsg(""); }}
              />
              <i className="fa-solid fa-mobile-screen-button student-login-input-icon"></i>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="student-login-error">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="student-login-btn"
            disabled={loading || success}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i><span>جاري التحقق...</span></>
            ) : success ? (
              <><i className="fa-solid fa-circle-check"></i><span>تم الدخول بنجاح!</span></>
            ) : (
              <><span>تسجيل الدخول</span><i className="fa-solid fa-arrow-left"></i></>
            )}
          </button>
        </form>

        {/* Info note — matches design */}
        <div className="student-login-note">
          <i className="fa-solid fa-circle-info"></i>
          <span>
            سيتم التحقق من هويتك باستخدام الاسم ورقم الهاتف
            الذي سجلت به في سنتر Talkha.
          </span>
        </div>

        {/* Divider */}
        <div className="student-login-divider" />

        {/* Help link */}
        <p className="student-login-help">
          واجهت مشكلة؟{" "}
          <a
            href="https://wa.me/201095356006" target="_blank" rel="noopener noreferrer"
          >
            تواصل مع الدعم الفني
          </a>
        </p>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>جميع الحقوق محفوظة © 2026</p>
        <p>تصميم وبرمجة <a href="https://wa.me/201015508532" target="_blank" rel="noopener noreferrer" >Developers</a></p>
      </div>

      {/* Back link */}
      <Link href="/" className="student-login-back">
        <i className="fa-solid fa-arrow-right"></i>
        العودة للرئيسية
      </Link>

      <style jsx global>{`
        @keyframes student-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .student-login-shake {
          animation: student-shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
