"use client";

import React, { useState, useRef } from "react";
import {
  User, ClipboardList, TestTube2, X, RefreshCw,
  CheckCircle2, Circle, Search, Calendar, Clock,
  Hash, ChevronRight, Activity
} from "lucide-react";
import { appScriptRequest } from "@/lib/api";

interface CheckItem {
  รายการ: string;
  specimen: string;
  specimenCode: string;
  จุดบริการ: string;
  done: boolean;
}

interface SpecimenLog {
  specimenType: string;
  specimenGroup: string;
  dateTime: string;
}

interface PersonalData {
  HN: string;
  "ชื่อ นามสกุล": string;
  โปรแกรม: string;
  ลำดับลงทะเบียน: string;
  "วันที่ลงทะเบียน": string;
  เวลาลงทะเบียน: string;
  หมายเหตุ: string;
  [key: string]: string;
}

interface PersonalDetailResult {
  ok: boolean;
  message?: string;
  data?: PersonalData;
  checkList?: CheckItem[];
  specimenLog?: SpecimenLog[];
}

interface Props {
  open: boolean;
  initialHn?: string;
  onClose: () => void;
}

export function PersonalDetailModal({ open, initialHn = "", onClose }: Props) {
  const [query, setQuery]   = useState(initialHn);
  const [loading, setLoading] = useState(false);
  const [result, setResult]  = useState<PersonalDetailResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await appScriptRequest<PersonalDetailResult>({
        action: "getPersonalDetail",
        hn: q,
      });
      setResult(res);
    } catch {
      setResult({ ok: false, message: "เชื่อมต่อไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const data       = result?.data;
  const checkList  = result?.checkList || [];
  const specLog    = result?.specimenLog || [];
  const doneCount  = checkList.filter(c => c.done).length;
  const totalCount = checkList.length;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div
      className="modal-backdrop open"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff",
        borderRadius: 16,
        width: 860,
        maxWidth: "96vw",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
        overflow: "hidden",
      }}>

        {/* ══ Header ══ */}
        <div style={{
          background: "linear-gradient(135deg, #0b4f61 0%, #109cbe 100%)",
          padding: "16px 20px 0",
          flexShrink: 0,
        }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <User size={18} color="#fff" />
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>Personal Detail</div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.65rem", marginTop: 2 }}>
                  ข้อมูลรายบุคคล · รายการตรวจ · ประวัติ
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Search bar */}
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "10px 10px 0 0",
            padding: "10px 14px",
          }}>
            <Search size={15} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="ค้นหาด้วย HN, รหัสประจำตัว หรือ ชื่อ นามสกุล..."
              style={{
                flex: 1, border: "none", outline: "none",
                background: "transparent", color: "#fff",
                fontSize: "0.85rem",
                "::placeholder": { color: "rgba(255,255,255,0.5)" },
              } as React.CSSProperties}
            />
            <button onClick={handleSearch} style={{
              height: 30, padding: "0 14px", borderRadius: 7,
              border: "none", background: "#fff", color: "#0c6075",
              fontWeight: 700, fontSize: "0.75rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
              flexShrink: 0,
            }}>
              <Search size={13} />ค้นหา
            </button>
          </div>
        </div>

        {/* ══ Body ══ */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Empty state */}
          {!loading && !result && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "var(--muted-color)", gap: 12, padding: 40
            }}>
              <Activity size={40} style={{ opacity: 0.25 }} />
              <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>กรอก HN หรือชื่อแล้วกดค้นหา</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, color: "var(--muted-color)"
            }}>
              <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.8rem" }}>กำลังโหลดข้อมูล...</span>
            </div>
          )}

          {/* Error */}
          {!loading && result && !result.ok && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8
            }}>
              <div style={{ fontSize: "2rem" }}>🔍</div>
              <div style={{ color: "#c63742", fontWeight: 600 }}>{result.message || "ไม่พบข้อมูล"}</div>
            </div>
          )}

          {/* Content */}
          {!loading && result?.ok && data && (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Info cards */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
                gap: 0, borderBottom: "1px solid #e8ecf0", flexShrink: 0,
              }}>
                {[
                  { label: "HN", value: data.HN, icon: <Hash size={11} />, accent: "#109cbe" },
                  { label: "ชื่อ นามสกุล", value: data["ชื่อ นามสกุล"], icon: <User size={11} />, accent: "#0c6075" },
                  { label: "โปรแกรม", value: data.โปรแกรม, icon: <ClipboardList size={11} />, accent: "#087d86" },
                  { label: "วันที่ลงทะเบียน", value: data["วันที่ลงทะเบียน"] || "—", icon: <Calendar size={11} />, accent: "#6c757d" },
                  { label: "เวลา / ลำดับ", value: `${data.เวลาลงทะเบียน || "—"} · #${data.ลำดับลงทะเบียน || "—"}`, icon: <Clock size={11} />, accent: "#6c757d" },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: "10px 14px",
                    borderRight: i < 4 ? "1px solid #e8ecf0" : "none",
                    background: i < 3 ? "#fafcfe" : "#f5f8fb",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: item.accent, fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                      {item.icon}{item.label}
                    </div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1b2d3f", lineHeight: 1.2 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{
                padding: "10px 16px", background: "#f0faf5",
                borderBottom: "1px solid #cce8d8",
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0f7a56", whiteSpace: "nowrap" }}>
                  ความคืบหน้า
                </div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#cce8d8", overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: pct === 100 ? "#18a779" : "linear-gradient(90deg, #109cbe, #18a779)",
                    borderRadius: 4, transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: pct === 100 ? "#18a779" : "#109cbe", whiteSpace: "nowrap" }}>
                  {doneCount}/{totalCount} ({pct}%)
                </div>
              </div>

              {/* Two columns */}
              <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>

                {/* ── Left: Checklist ── */}
                <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid #e8ecf0", overflow: "hidden" }}>
                  <div style={{
                    padding: "9px 14px",
                    background: "#f5f8fb",
                    borderBottom: "1px solid #e8ecf0",
                    display: "flex", alignItems: "center", gap: 6,
                    flexShrink: 0,
                  }}>
                    <ClipboardList size={14} color="#0c6075" />
                    <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "#1b2d3f" }}>
                      รายการตรวจ
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: "0.62rem", fontWeight: 700,
                      background: "#0c6075", color: "#fff",
                      padding: "2px 8px", borderRadius: 999,
                    }}>
                      {totalCount} รายการ
                    </span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                    {checkList.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--muted-color)", padding: 24, fontSize: "0.75rem" }}>ไม่มีรายการ</div>
                    ) : checkList.map((item, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                        background: item.done ? "#f0faf5" : "#fff",
                        border: `1px solid ${item.done ? "#b2e8d4" : "#e2eaf0"}`,
                        transition: "all 0.15s",
                      }}>
                        {item.done
                          ? <CheckCircle2 size={16} color="#18a779" style={{ flexShrink: 0 }} />
                          : <Circle size={16} color="#c8d8e4" style={{ flexShrink: 0 }} />
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "0.72rem", fontWeight: 600,
                            color: item.done ? "#0f7a56" : "#1b2d3f",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                          }}>
                            {item.รายการ}
                          </div>
                          <div style={{ fontSize: "0.62rem", color: "#667789", marginTop: 2, display: "flex", gap: 6 }}>
                            <span style={{ background: "#e8f7fa", color: "#0c6075", padding: "0 5px", borderRadius: 3, fontWeight: 600 }}>
                              {item.specimen}
                            </span>
                            <span>{item.จุดบริการ}</span>
                          </div>
                        </div>
                        <span style={{
                          fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px",
                          borderRadius: 999, flexShrink: 0,
                          background: item.done ? "#18a779" : "#e8ecf0",
                          color: item.done ? "#fff" : "#8a98a9",
                        }}>
                          {item.done ? "✓ เสร็จ" : "รอ"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Right: จุดตรวจ + checkbox ── */}
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{
                    padding: "9px 14px",
                    background: "#f5f8fb",
                    borderBottom: "1px solid #e8ecf0",
                    display: "flex", alignItems: "center", gap: 6,
                    flexShrink: 0,
                  }}>
                    <CheckCircle2 size={14} color="#0c6075" />
                    <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "#1b2d3f" }}>
                      สถานะจุดตรวจ
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: "0.62rem", fontWeight: 700,
                      background: "#109cbe", color: "#fff",
                      padding: "2px 8px", borderRadius: 999,
                    }}>
                      {doneCount}/{totalCount}
                    </span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                    {/* unique จุดบริการ จาก checkList */}
                    {(() => {
                      const seen = new Set<string>();
                      const unique = checkList.filter(item => {
                        if (seen.has(item.จุดบริการ)) return false;
                        seen.add(item.จุดบริการ);
                        return true;
                      });
                      return unique.map((item, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: 8, marginBottom: 4,
                          background: item.done ? "#f0faf5" : "#fff",
                          border: `1px solid ${item.done ? "#b2e8d4" : "#e2eaf0"}`,
                          transition: "all 0.15s",
                        }}>
                          {/* Checkbox visual */}
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            border: `2px solid ${item.done ? "#18a779" : "#c8d8e4"}`,
                            background: item.done ? "#18a779" : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {item.done && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: "0.78rem", fontWeight: 700,
                              color: item.done ? "#0f7a56" : "#1b2d3f",
                            }}>
                              {item.จุดบริการ}
                            </div>
                          </div>
                          <span style={{
                            fontSize: "0.62rem", fontWeight: 700,
                            padding: "2px 10px", borderRadius: 999,
                            background: item.done ? "#18a779" : "#f0f4f8",
                            color: item.done ? "#fff" : "#8a98a9",
                          }}>
                            {item.done ? "✓ ตรวจแล้ว" : "ยังไม่ตรวจ"}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Remark */}
              {data.หมายเหตุ && (
                <div style={{
                  padding: "8px 16px", borderTop: "1px solid #e8ecf0",
                  background: "#fffbeb", fontSize: "0.72rem", color: "#92680a",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}>
                  <span style={{ fontWeight: 700 }}>หมายเหตุ:</span>
                  <span>{data.หมายเหตุ}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ Footer ══ */}
        <div style={{
          padding: "10px 16px", borderTop: "1px solid #e8ecf0",
          background: "#fafbfc", display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: "0.68rem", color: "var(--muted-color)" }}>
            {data ? `${data["ชื่อ นามสกุล"]} · โปรแกรม ${data.โปรแกรม}` : "กรอก HN เพื่อค้นหาข้อมูล"}
          </span>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: "0 14px", borderRadius: 7,
              border: "1px solid #dbe5ed", background: "#fff",
              color: "#1b2d3f", cursor: "pointer", fontSize: "0.75rem",
              fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <X size={13} />ปิด
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.5) !important; }
      `}</style>
    </div>
  );
}
