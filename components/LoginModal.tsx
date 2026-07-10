"use client";

import React, { useState } from "react";
import { LogIn, UserPlus, User, Lock, IdCard, Phone, Eye, EyeOff, Cross, LoaderCircle } from "lucide-react";
import { appScriptRequest } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────── */
export interface LoggedInUser {
  username: string;
  stuffName: string;
  tel: string;
}

interface Props {
  open: boolean;
  onSuccess: (user: LoggedInUser) => void;
}

/* ─── Component ─────────────────────────────────────────── */
export function LoginModal({ open, onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [showPw, setShowPw] = useState(false);

  // login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // register fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regStuffName, setRegStuffName] = useState("");
  const [regTel, setRegTel] = useState("");

  if (!open) return null;

  function switchMode(m: "login" | "register") {
    setMode(m);
    setError("");
    setOkMsg("");
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอก Username และ Password");
      return;
    }
    setLoading(true); setError(""); setOkMsg("");
    try {
      const res = await appScriptRequest<{ ok: boolean; message?: string; user?: LoggedInUser }>({
        action: "login",
        username: username.trim(),
        password: password.trim(),
      });
      if (res.ok && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!regUsername.trim() || !regPassword.trim() || !regStuffName.trim()) {
      setError("กรุณากรอก Username, Password และชื่อ");
      return;
    }
    setLoading(true); setError(""); setOkMsg("");
    try {
      const res = await appScriptRequest<{ ok: boolean; message?: string }>({
        action: "registerUser",
        username: regUsername.trim(),
        password: regPassword.trim(),
        stuffName: regStuffName.trim(),
        tel: regTel.trim(),
      });
      if (res.ok) {
        setOkMsg("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
        // prefill login + switch
        setUsername(regUsername.trim());
        setPassword("");
        setRegUsername(""); setRegPassword(""); setRegStuffName(""); setRegTel("");
        setTimeout(() => { setMode("login"); setOkMsg(""); }, 1400);
      } else {
        setError(res.message || "สมัครสมาชิกไม่สำเร็จ");
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  /* ─── shared field style ─── */
  const fieldWrap: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    background: "#f5f8fb", border: "1px solid #dbe5ed", borderRadius: 9,
    padding: "0 12px", height: 42, marginBottom: 10,
  };
  const inputStyle: React.CSSProperties = {
    flex: 1, border: "none", outline: "none", background: "transparent",
    fontSize: "0.82rem", color: "#1a2d3e", fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "linear-gradient(135deg, rgba(12,96,117,0.55), rgba(16,156,190,0.55))",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "min(400px, 96vw)",
        overflow: "hidden", boxShadow: "0 24px 64px rgba(5,30,45,0.4)",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #0c6075, #109cbe)",
          padding: "22px 24px 20px", textAlign: "center",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 10px",
            background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Cross size={26} color="#fff" />
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem" }}>Check Up Flow System</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.68rem", marginTop: 3 }}>
            {mode === "login" ? "เข้าสู่ระบบเพื่อเริ่มใช้งาน" : "สร้างบัญชีผู้ใช้ใหม่"}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #eef2f5" }}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, height: 44, border: "none", cursor: "pointer",
                background: mode === m ? "#fff" : "#f5f8fb",
                color: mode === m ? "#0c6075" : "#8a9baa",
                fontWeight: 700, fontSize: "0.78rem",
                borderBottom: mode === m ? "2.5px solid #0c6075" : "2.5px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              {m === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
              {m === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 22px" }}>
          {mode === "login" ? (
            <>
              <div style={fieldWrap}>
                <User size={16} color="#8a9baa" />
                <input
                  style={inputStyle}
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  autoFocus
                />
              </div>
              <div style={fieldWrap}>
                <Lock size={16} color="#8a9baa" />
                <input
                  style={inputStyle}
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  onClick={() => setShowPw((v) => !v)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#8a9baa", display: "flex", padding: 0 }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={fieldWrap}>
                <User size={16} color="#8a9baa" />
                <input style={inputStyle} placeholder="Username" value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)} autoFocus />
              </div>
              <div style={fieldWrap}>
                <Lock size={16} color="#8a9baa" />
                <input style={inputStyle} type={showPw ? "text" : "password"} placeholder="Password"
                  value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                <button onClick={() => setShowPw((v) => !v)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#8a9baa", display: "flex", padding: 0 }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={fieldWrap}>
                <IdCard size={16} color="#8a9baa" />
                <input style={inputStyle} placeholder="ชื่อ-นามสกุล" value={regStuffName}
                  onChange={(e) => setRegStuffName(e.target.value)} />
              </div>
              <div style={fieldWrap}>
                <Phone size={16} color="#8a9baa" />
                <input style={inputStyle} placeholder="เบอร์โทร (ไม่บังคับ)" value={regTel}
                  onChange={(e) => setRegTel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()} />
              </div>
            </>
          )}

          {/* Error / Success message */}
          {error && (
            <div style={{
              fontSize: "0.7rem", color: "#c63742", background: "#fff5f5",
              border: "1px solid #f5c2c7", borderRadius: 7, padding: "7px 11px", marginBottom: 10,
            }}>
              {error}
            </div>
          )}
          {okMsg && (
            <div style={{
              fontSize: "0.7rem", color: "#0f7a56", background: "#f0faf5",
              border: "1px solid #b2e8d4", borderRadius: 7, padding: "7px 11px", marginBottom: 10,
            }}>
              {okMsg}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={mode === "login" ? handleLogin : handleRegister}
            disabled={loading}
            style={{
              width: "100%", height: 44, borderRadius: 10, border: "none",
              background: loading ? "#7fb3c0" : "linear-gradient(135deg, #0c6075, #109cbe)",
              color: "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: loading ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: "0 4px 12px rgba(12,96,117,0.25)",
            }}
          >
            {loading ? (
              <LoaderCircle size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : mode === "login" ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {loading ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
