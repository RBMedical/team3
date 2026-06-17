"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  User, ClipboardList, X, RefreshCw,
  CheckCircle2, Circle, Search, Calendar, Clock,
  Hash, Activity, Plus, Check, FlaskConical,
} from "lucide-react";
import { appScriptRequest } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────── */
interface CheckItem {
  รายการ: string;
  specimen: string;
  specimenCode: string;
  จุดบริการ: string;
  done: boolean;
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
}

interface ExtraItem {
  รายการ: string;
  วันที่: string;
}

interface Props {
  open: boolean;
  initialHn?: string;
  onClose: () => void;
}

/* ─── Component ──────────────────────────────────────────── */
export function PersonalDetailModal({ open, initialHn = "", onClose }: Props) {
  const [query, setQuery]           = useState(initialHn);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<PersonalDetailResult | null>(null);
  const [testNames, setTestNames]   = useState<string[]>([]);
  const [extraSaved, setExtraSaved] = useState<ExtraItem[]>([]);

  // Add-extra UI
  const [showAdd, setShowAdd]   = useState(false);
  const [addItems, setAddItems] = useState<string[]>([""]);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  /* Reset on close */
  useEffect(() => {
    if (!open) {
      setResult(null);
      setExtraSaved([]);
      setShowAdd(false);
      setAddItems([""]);
      setSaveMsg("");
    }
  }, [open]);

  /* Sync initialHn */
  useEffect(() => {
    if (open && initialHn) setQuery(initialHn);
  }, [open, initialHn]);

  /* Load test names once */
  useEffect(() => {
    if (open && testNames.length === 0) loadTestNames();
  }, [open]);

  async function loadTestNames() {
    try {
      const res = await appScriptRequest<{ ok: boolean; names?: string[] }>({ action: "getTestNames" });
      if (res.ok) setTestNames(res.names || []);
    } catch {}
  }

  /* ── Search ── */
  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    setExtraSaved([]);
    setSaveMsg("");
    try {
      const [detailRes, extraRes] = await Promise.all([
        appScriptRequest<PersonalDetailResult>({ action: "getPersonalDetail", hn: q }),
        appScriptRequest<{ ok: boolean; items?: ExtraItem[] }>({ action: "getExtraItems", hn: q }),
      ]);
      setResult(detailRes);
      if (extraRes.ok && extraRes.items) setExtraSaved(extraRes.items);
    } catch {
      setResult({ ok: false, message: "เชื่อมต่อไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  }

  /* ── Save extra ── */
  async function saveExtra() {
    const items = addItems.filter(v => v.trim());
    if (!items.length || !data) return;
    setSaving(true); setSaveMsg("");
    try {
      const res = await appScriptRequest<{ ok: boolean; message?: string }>({
        action: "saveExtra",
        hn: data.HN,
        name: data["ชื่อ นามสกุล"],
        items: JSON.stringify(items),
      });
      if (res.ok) {
        setSaveMsg("บันทึกสำเร็จ ✓");
        setShowAdd(false);
        setAddItems([""]);
        // Reload extra
        const fresh = await appScriptRequest<{ ok: boolean; items?: ExtraItem[] }>({
          action: "getExtraItems", hn: data.HN,
        });
        if (fresh.ok && fresh.items) setExtraSaved(fresh.items);
      } else {
        setSaveMsg(res.message || "บันทึกไม่สำเร็จ");
      }
    } catch { setSaveMsg("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  if (!open) return null;

  const data      = result?.data;
  const checkList = result?.checkList || [];
  const doneCount = checkList.filter(c => c.done).length;
  const totalCount = checkList.length;
  const pct       = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  /* unique จุดบริการ */
  const uniqueCheckpoints = (() => {
    const seen = new Set<string>();
    return checkList.filter(item => {
      if (seen.has(item.จุดบริการ)) return false;
      seen.add(item.จุดบริการ);
      return true;
    });
  })();

  /* ── Shared card style ── */
  const S = {
    card: {
      background: "#fff",
      border: "1px solid #e4eaef",
      borderRadius: 10,
      overflow: "hidden",
    } as React.CSSProperties,
    sectionHead: (color: string) => ({
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 12px",
      background: "#f5f8fb",
      borderBottom: "1px solid #e4eaef",
      flexShrink: 0,
    } as React.CSSProperties),
    badge: (bg: string, color: string) => ({
      fontSize: "0.6rem",
      fontWeight: 700,
      background: bg,
      color,
      padding: "1px 8px",
      borderRadius: 999,
    } as React.CSSProperties),
  };

  return (
    <div
      className="modal-backdrop open"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* ══ Modal Box ══ */}
      <div style={{
        background: "#f0f4f8",
        borderRadius: 14,
        width: 900,
        maxWidth: "96vw",
        maxHeight: "94vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 28px 64px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}>

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <div style={{
          background: "linear-gradient(135deg, #0b4f61 0%, #109cbe 100%)",
          padding: "14px 18px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User size={17} color="#fff" />
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.2 }}>Personal Detail</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.6rem", marginTop: 1 }}>
                  ข้อมูลรายบุคคล · รายการตรวจ · ประวัติ
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={15} />
            </button>
          </div>

          {/* Search bar */}
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            background: "rgba(255,255,255,0.14)",
            borderRadius: 9, padding: "7px 12px",
          }}>
            <Search size={14} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="ค้นหาด้วย HN, รหัสประจำตัว หรือ ชื่อ นามสกุล..."
              style={{
                flex: 1, border: "none", outline: "none",
                background: "transparent", color: "#fff", fontSize: "0.82rem",
              } as React.CSSProperties}
            />
            <button onClick={handleSearch} style={{
              height: 27, padding: "0 13px", borderRadius: 7,
              border: "none", background: "#fff", color: "#0c6075",
              fontWeight: 700, fontSize: "0.7rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
            }}>
              <Search size={11} />ค้นหา
            </button>
          </div>
        </div>

        {/* ══ BODY ════════════════════════════════════════════ */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Empty / Loading / Error */}
          {!loading && !result && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a0b0be", gap: 10 }}>
              <Activity size={36} style={{ opacity: 0.2 }} />
              <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>กรอก HN หรือชื่อแล้วกดค้นหา</div>
            </div>
          )}
          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#a0b0be" }}>
              <RefreshCw size={17} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.78rem" }}>กำลังโหลดข้อมูล...</span>
            </div>
          )}
          {!loading && result && !result.ok && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: "2rem" }}>🔍</div>
              <div style={{ color: "#c63742", fontWeight: 600, fontSize: "0.84rem" }}>{result.message || "ไม่พบข้อมูล"}</div>
            </div>
          )}

          {/* ── Main Content ── */}
          {!loading && result?.ok && data && (
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "300px 1fr", overflow: "hidden" }}>

              {/* ══════ LEFT PANEL ══════ */}
              <div style={{
                borderRight: "1px solid #d8e4ec",
                display: "flex", flexDirection: "column",
                overflow: "hidden", background: "#f5f8fb",
              }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}>

                  {/* HN + ชื่อ card */}
                  <div style={{ ...S.card, marginBottom: 10 }}>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {/* Avatar circle */}
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, #109cbe, #0b4f61)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <User size={18} color="#fff" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.62rem", color: "#109cbe", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 3 }}>
                            <Hash size={10} />HN
                          </div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1a2d3e", letterSpacing: "0.02em" }}>{data.HN}</div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#2d4255", marginTop: 1, lineHeight: 1.3 }}>
                            {data["ชื่อ นามสกุล"]}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div style={{ borderTop: "1px solid #e8eef3", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                      {[
                        { label: "โปรแกรม",     value: data.โปรแกรม || "—",                                      icon: <ClipboardList size={10} /> },
                        { label: "วันที่ลง",    value: data["วันที่ลงทะเบียน"] || "—",                          icon: <Calendar size={10} /> },
                        { label: "เวลา / #",    value: `${data.เวลาลงทะเบียน || "—"} · #${data.ลำดับลงทะเบียน || "—"}`, icon: <Clock size={10} /> },
                      ].map((m, i) => (
                        <div key={i} style={{
                          padding: "7px 10px",
                          borderRight: i < 2 ? "1px solid #e8eef3" : "none",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, color: "#788fa0", fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                            {m.icon}{m.label}
                          </div>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#1a2d3e", lineHeight: 1.25 }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress card */}
                  <div style={{ ...S.card, marginBottom: 10 }}>
                    <div style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0f7a56" }}>ความคืบหน้า</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: pct === 100 ? "#18a779" : "#109cbe" }}>
                          {doneCount}/{totalCount} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: "#e0eeea", overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%",
                          background: pct === 100 ? "#18a779" : "linear-gradient(90deg,#109cbe,#18a779)",
                          borderRadius: 4, transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* สถานะจุดตรวจ card */}
                  <div style={{ ...S.card }}>
                    <div style={S.sectionHead("#0c6075")}>
                      <CheckCircle2 size={13} color="#0c6075" />
                      <span style={{ fontWeight: 700, fontSize: "0.72rem", color: "#1a2d3e" }}>สถานะจุดตรวจ</span>
                      <span style={{ ...S.badge("#109cbe", "#fff"), marginLeft: "auto" }}>
                        {doneCount}/{totalCount}
                      </span>
                    </div>
                    <div style={{ padding: "7px" }}>
                      {uniqueCheckpoints.length === 0
                        ? <div style={{ textAlign: "center", color: "#a0b0be", padding: 16, fontSize: "0.72rem" }}>ไม่มีข้อมูล</div>
                        : uniqueCheckpoints.map((item, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 9,
                            padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                            background: item.done ? "#f0faf5" : "#fff",
                            border: `1px solid ${item.done ? "#b2e8d4" : "#e4eaef"}`,
                            transition: "all 0.12s",
                          }}>
                            {/* Checkbox visual */}
                            <div style={{
                              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${item.done ? "#18a779" : "#c8d8e4"}`,
                              background: item.done ? "#18a779" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {item.done && (
                                <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: item.done ? "#0f7a56" : "#1a2d3e" }}>
                                {item.จุดบริการ}
                              </div>
                            </div>
                            <span style={{
                              fontSize: "0.58rem", fontWeight: 700,
                              padding: "2px 8px", borderRadius: 999,
                              background: item.done ? "#18a779" : "#eef2f5",
                              color: item.done ? "#fff" : "#8a98a9",
                            }}>
                              {item.done ? "✓ ผ่านแล้ว" : "ยังไม่ผ่าน"}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                </div>
              </div>

              {/* ══════ RIGHT PANEL ══════ */}
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc", padding: "12px 12px 8px", gap: 10 }}>

                  {/* รายการตรวจ card */}
                  <div style={{ ...S.card, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <div style={S.sectionHead("#0c6075")}>
                      <ClipboardList size={13} color="#0c6075" />
                      <span style={{ fontWeight: 700, fontSize: "0.72rem", color: "#1a2d3e" }}>รายการตรวจ</span>
                      <button
                        onClick={() => { setShowAdd(v => !v); setSaveMsg(""); if (!showAdd) setAddItems([""]); }}
                        title="เพิ่มรายการตรวจ"
                        style={{
                          width: 22, height: 22, borderRadius: 5, border: "none",
                          background: showAdd ? "#0c6075" : "#e8f7fa",
                          color: showAdd ? "#fff" : "#0c6075",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Plus size={13} />
                      </button>
                      <span style={{ ...S.badge("#0c6075", "#fff"), marginLeft: "auto" }}>{totalCount} รายการ</span>
                    </div>

                    {/* checklist items */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "7px" }}>
                      {checkList.length === 0
                        ? <div style={{ textAlign: "center", color: "#a0b0be", padding: 18, fontSize: "0.72rem" }}>ไม่มีรายการ</div>
                        : checkList.map((item, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 9,
                            padding: "7px 10px", borderRadius: 8, marginBottom: 4,
                            background: item.done ? "#f0faf5" : "#fff",
                            border: `1px solid ${item.done ? "#b2e8d4" : "#e4eaef"}`,
                            transition: "all 0.12s",
                          }}>
                            {item.done
                              ? <CheckCircle2 size={14} color="#18a779" style={{ flexShrink: 0 }} />
                              : <Circle size={14} color="#c8d8e4" style={{ flexShrink: 0 }} />
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: "0.72rem", fontWeight: 600,
                                color: item.done ? "#0f7a56" : "#1a2d3e",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                                {item.รายการ}
                              </div>
                              <div style={{ fontSize: "0.6rem", color: "#788fa0", marginTop: 2, display: "flex", gap: 5 }}>
                                <span style={{ background: "#e8f7fa", color: "#0c6075", padding: "0 5px", borderRadius: 3, fontWeight: 600 }}>
                                  {item.specimen}
                                </span>
                                <span>{item.จุดบริการ}</span>
                              </div>
                            </div>
                            <span style={{
                              fontSize: "0.58rem", fontWeight: 700, padding: "2px 7px",
                              borderRadius: 999, flexShrink: 0,
                              background: item.done ? "#18a779" : "#eef2f5",
                              color: item.done ? "#fff" : "#8a98a9",
                            }}>
                              {item.done ? "✓ เสร็จ" : "รอ"}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* ── รายการตรวจเพิ่ม (Extra) card ── */}
                  <div style={{ ...S.card, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    {/* Header */}
                    <div style={S.sectionHead("#7c3aed")}>
                      <FlaskConical size={13} color="#7c3aed" />
                      <span style={{ fontWeight: 700, fontSize: "0.72rem", color: "#1a2d3e" }}>รายการตรวจเพิ่ม</span>
                      {extraSaved.length > 0 && (
                        <span style={{ ...S.badge("#7c3aed", "#fff"), marginLeft: "auto" }}>
                          {extraSaved.length} รายการ
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: "7px" }}>

                      {/* Saved extra items */}
                      {extraSaved.length === 0 && !showAdd && (
                        <div style={{ textAlign: "center", color: "#a0b0be", padding: "12px 8px", fontSize: "0.7rem" }}>
                          ยังไม่มีรายการตรวจเพิ่ม
                        </div>
                      )}

                      {extraSaved.map((ex, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 9,
                          padding: "7px 10px", borderRadius: 8, marginBottom: 4,
                          background: "#faf5ff", border: "1px solid #e0d0f8",
                        }}>
                          <FlaskConical size={13} color="#9b6fe0" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4a2d80", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {ex.รายการ}
                            </div>
                            {ex.วันที่ && (
                              <div style={{ fontSize: "0.58rem", color: "#9b79c8", marginTop: 1 }}>{ex.วันที่}</div>
                            )}
                          </div>
                          <span style={{ fontSize: "0.56rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#ede8fc", color: "#6b3fbb" }}>
                            extra
                          </span>
                        </div>
                      ))}

                      {/* Add form */}
                      {showAdd && (
                        <div style={{
                          background: "#f9f5ff", border: "1px dashed #c4b0ee",
                          borderRadius: 8, padding: "9px 10px", marginTop: extraSaved.length > 0 ? 4 : 0,
                        }}>
                          <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "#7c3aed", marginBottom: 7, display: "flex", alignItems: "center", gap: 4 }}>
                            <Plus size={10} />เพิ่มรายการตรวจ
                          </div>
                          {addItems.map((val, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 5, marginBottom: 5, alignItems: "center" }}>
                              <select
                                value={val}
                                onChange={e => setAddItems(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                                style={{
                                  flex: 1, padding: "5px 8px", borderRadius: 6,
                                  border: `1px solid ${val ? "#7c3aed" : "#c8d8e4"}`,
                                  fontSize: "0.7rem", outline: "none", cursor: "pointer",
                                  background: val ? "#f3eeff" : "#fff",
                                  color: val ? "#4a2d80" : "#667789",
                                }}
                              >
                                <option value="">— เลือกรายการตรวจ —</option>
                                {testNames.map((n, ni) => <option key={ni} value={n}>{n}</option>)}
                              </select>
                              <button
                                onClick={() => setAddItems(prev => prev.filter((_, i) => i !== idx))}
                                style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "#fee", color: "#c63742", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
                              >×</button>
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                            <button
                              onClick={() => setAddItems(prev => [...prev, ""])}
                              style={{ flex: 1, height: 27, borderRadius: 6, border: "1px dashed #c4b0ee", background: "#fff", color: "#7c3aed", cursor: "pointer", fontSize: "0.68rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                            >
                              <Plus size={11} />เพิ่มอีก
                            </button>
                            <button
                              onClick={saveExtra}
                              disabled={saving || !addItems.some(v => v.trim())}
                              style={{ flex: 1, height: 27, borderRadius: 6, border: "none", background: saving ? "#ccc" : "#7c3aed", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                            >
                              <Check size={11} />{saving ? "กำลังบันทึก..." : "ยืนยัน"}
                            </button>
                          </div>
                          {saveMsg && (
                            <div style={{ fontSize: "0.63rem", color: saveMsg.includes("✓") ? "#18a779" : "#c63742", marginTop: 5, textAlign: "center" }}>
                              {saveMsg}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

              </div>

            </div>
          )}
        </div>

        {/* ══ FOOTER ══════════════════════════════════════════ */}
        <div style={{
          padding: "8px 14px", borderTop: "1px solid #d8e4ec",
          background: "#fff", display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: "0.65rem", color: "#8a9baa" }}>
            {data
              ? `${data["ชื่อ นามสกุล"]} · โปรแกรม ${data.โปรแกรม}`
              : "กรอก HN เพื่อค้นหาข้อมูล"}
          </span>
          {data?.หมายเหตุ && (
            <span style={{ fontSize: "0.63rem", color: "#92680a", background: "#fffbeb", border: "1px solid #f5e0a0", borderRadius: 5, padding: "2px 8px" }}>
              หมายเหตุ: {data.หมายเหตุ}
            </span>
          )}
          <button onClick={onClose} style={{
            height: 29, padding: "0 13px", borderRadius: 7,
            border: "1px solid #dbe5ed", background: "#fff",
            color: "#1a2d3e", cursor: "pointer", fontSize: "0.7rem",
            fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
          }}>
            <X size={12} />ปิด
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.45) !important; }
      `}</style>
    </div>
  );
}
