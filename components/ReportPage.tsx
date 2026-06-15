"use client";

import React, { useState } from "react";
import { ChartNoAxesCombined, RefreshCw } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import type { FollowDataResponse } from "@/types";

const CUSTOM_HEADERS = [
  "HN", "ชื่อ นามสกุล", "ลงทะเบียน",
  "เจาะเลือด", "PE", "X-Ray", "EKG",
  "Audiogram", "ตรวจตา", "Spirometry",
  "Urine", "Stool", "กล้ามเนื้อ"
];

export function ReportPage() {
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [rows, setRows]       = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  // checkedCols: set of column indices ที่ติ๊กกรอง "ว่าง"
  const [checkedCols, setCheckedCols] = useState<Set<number>>(new Set());

  async function loadData() {
    setLoading(true);
    setCheckedCols(new Set());
    try {
      const result = await appScriptRequest<FollowDataResponse>({ action: "getFollowData" });
      if (!result.ok) return;
      const filtered = (result.rows || []).filter(row =>
        row.some(cell => cell.trim() !== "")
      );
      setAllRows(filtered);
      setRows(filtered);
    } catch {}
    finally { setLoading(false); }
  }

  function toggleCol(ci: number, checked: boolean) {
    const next = new Set(checkedCols);
    if (checked) next.add(ci); else next.delete(ci);
    setCheckedCols(next);
    // กรอง: แสดงแถวที่ column ที่ติ๊กทุกอัน "ว่าง"
    if (next.size === 0) {
      setRows(allRows);
    } else {
      setRows(allRows.filter(row =>
        Array.from(next).every(col => (row[col] ?? "").trim() === "")
      ));
    }
  }

  return (
    <div className="placeholder-page">
      <div className="follow-wrap">
        <div className="follow-header">
          <h2><ChartNoAxesCombined size={18} />รายงาน/ติดตาม</h2>
          <button
            onClick={loadData}
            style={{ display: "flex", alignItems: "center", gap: 5, height: "var(--btn-h)", padding: "0 12px", borderRadius: 7, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", fontSize: "var(--fs-base)", fontWeight: 600, color: "var(--ink)" }}
          >
            <RefreshCw size={14} />โหลดข้อมูล
          </button>
        </div>

        {loading && <p style={{ color: "var(--muted-color)", fontSize: "var(--fs-small)" }}>กำลังโหลดข้อมูล...</p>}

        {!loading && allRows.length === 0 && (
          <p className="follow-empty">กดปุ่ม "โหลดข้อมูล" เพื่อดึงข้อมูล</p>
        )}

        {allRows.length > 0 && (
          <>
            <div className="follow-table-scroll">
              <table className="follow-table">
                <thead>
                  {/* แถวหัวตาราง */}
                  <tr>
                    {CUSTOM_HEADERS.map((h, i) => (
                      <th key={i} style={{
                        minWidth: i === 0 ? 60 : i === 1 ? 140 : 52,
                        width:    i === 0 ? 60 : i === 1 ? 140 : 52,
                        fontSize: "0.65rem",
                        padding: "4px 3px",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                  {/* แถว checkbox กรอง "ว่าง" */}
                  <tr style={{ background: "#f0fbfc" }}>
                    {CUSTOM_HEADERS.map((_, i) => (
                      <th key={i} style={{ padding: "3px", textAlign: "center", fontWeight: "normal" }}>
                        {i >= 2 ? (
                          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", fontSize: "0.6rem", color: checkedCols.has(i) ? "var(--teal)" : "var(--muted-color)" }}>
                            <input
                              type="checkbox"
                              checked={checkedCols.has(i)}
                              onChange={e => toggleCol(i, e.target.checked)}
                              style={{ width: 11, height: 11, accentColor: "var(--teal)", cursor: "pointer" }}
                            />
                            ว่าง
                          </label>
                        ) : (
                          <span style={{ fontSize: "0.6rem", color: "var(--muted-color)" }}>
                            {i === 0 ? "" : ""}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={CUSTOM_HEADERS.length} className="follow-empty">ไม่พบข้อมูล</td></tr>
                    : rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={ci >= 3 && cell.trim().toLowerCase() === "x" ? "mark-x" : ""}
                              style={{
                                fontSize: "0.65rem",
                                padding: "3px",
                                minWidth: ci === 0 ? 60 : ci === 1 ? 140 : 52,
                                width:    ci === 0 ? 60 : ci === 1 ? 140 : 52,
                                whiteSpace: ci === 1 ? "normal" : "nowrap",
                                overflow: "hidden",
                                textAlign: ci >= 2 ? "center" : "left",
                                background: checkedCols.has(ci) && (cell ?? "").trim() === "" ? "#fff8e1" : undefined,
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "var(--fs-small)", color: "var(--muted-color)", marginTop: 4 }}>
              แสดง {rows.length} / {allRows.length} รายการ
              {checkedCols.size > 0 && ` · กรองคอลัมน์ว่าง: ${checkedCols.size} คอลัมน์`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
