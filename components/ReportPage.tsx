"use client";

import React, { useState } from "react";
import { ChartNoAxesCombined, RefreshCw, Printer } from "lucide-react";
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

  // extraData: map HN → { รหัส, แผนก, ตำแหน่ง, ชั้นปี, สาขา, ห้อง }
  const [extraData, setExtraData] = useState<Record<string, string[]>>({});

  async function loadDataWithExtra() {
    setLoading(true);
    setCheckedCols(new Set());
    try {
      const [followRes, extraRes] = await Promise.all([
        appScriptRequest<FollowDataResponse>({ action: "getFollowData" }),
        appScriptRequest<{ ok: boolean; rows?: string[][] }>({ action: "getReportExtra" }),
      ]);
      if (!followRes.ok) return;
      const filtered = (followRes.rows || []).filter(row =>
        row.some(cell => cell.trim() !== "")
      );
      setAllRows(filtered);
      setRows(filtered);

      // build extraData map
      const map: Record<string, string[]> = {};
      if (extraRes.ok && extraRes.rows) {
        extraRes.rows.forEach(r => {
          const hn = String(r[0] || "").trim();
          if (hn) map[hn] = r.slice(1); // [รหัส, แผนก, ตำแหน่ง, ชั้นปี, สาขา, ห้อง]
        });
      }
      setExtraData(map);
    } catch {}
    finally { setLoading(false); }
  }

  function printReport() {
    if (rows.length === 0) return;
    const today = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const EXTRA_HEADERS = ["รหัส", "แผนก", "ตำแหน่ง", "ชั้นปี", "สาขา", "ห้อง"];

    const tableRows = rows.map(row => {
      const hn   = row[0] || "";
      const name = row[1] || "";
      const extra = extraData[hn] || ["", "", "", "", "", ""];
      return `<tr>
        <td>${hn}</td>
        <td>${name}</td>
        <td>${extra[0] || ""}</td>
        <td>${extra[1] || ""}</td>
        <td>${extra[2] || ""}</td>
        <td>${extra[3] || ""}</td>
        <td>${extra[4] || ""}</td>
        <td>${extra[5] || ""}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: A4 landscape; margin: 12mm 12mm 12mm 12mm; }
  body { font-family: 'Sarabun','TH Sarabun New',sans-serif; font-size: 10pt; color:#000; }
  h2 { font-size: 14pt; font-weight: 700; text-align: center; margin-bottom: 2mm; }
  .sub { text-align: center; font-size: 9pt; color: #444; margin-bottom: 5mm; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #0c6075; color: #fff;
    padding: 3mm 2mm; font-size: 9.5pt; font-weight: 600;
    text-align: center; border: 0.5pt solid #0c6075;
  }
  td {
    padding: 2mm 2mm; font-size: 9pt;
    border: 0.5pt solid #c8d8e4;
    vertical-align: middle;
  }
  tr:nth-child(even) td { background: #f5fbfc; }
  .col-hn   { width: 8%; text-align: center; }
  .col-name { width: 22%; }
  .col-code { width: 9%; text-align: center; }
  .col-dept { width: 12%; }
  .col-pos  { width: 13%; }
  .col-yr   { width: 7%; text-align: center; }
  .col-br   { width: 15%; }
  .col-rm   { width: 10%; text-align: center; }
</style>
</head>
<body>
<h2>รายชื่อผู้ัที่ยังไม่ได้เข้าตรวจ</h2>
<div class="sub">วันที่ ${today} · แสดง ${rows.length} รายการ</div>
<table>
  <thead>
    <tr>
      <th class="col-hn">HN</th>
      <th class="col-name">ชื่อ นามสกุล</th>
      <th class="col-code">รหัส</th>
      <th class="col-dept">แผนก</th>
      <th class="col-pos">ตำแหน่ง</th>
      <th class="col-yr">ชั้นปี</th>
      <th class="col-br">สาขา</th>
      <th class="col-rm">ห้อง</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>
<script>window.onload = function() { window.print(); };</script>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=800");
    if (w) { w.document.write(html); w.document.close(); }
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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={loadDataWithExtra}
              style={{ display: "flex", alignItems: "center", gap: 5, height: "var(--btn-h)", padding: "0 12px", borderRadius: 7, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", fontSize: "var(--fs-base)", fontWeight: 600, color: "var(--ink)" }}
            >
              <RefreshCw size={14} />โหลดข้อมูล
            </button>
            {rows.length > 0 && (
              <button
                onClick={printReport}
                style={{ display: "flex", alignItems: "center", gap: 5, height: "var(--btn-h)", padding: "0 12px", borderRadius: 7, border: "1px solid #0c6075", background: "#0c6075", cursor: "pointer", fontSize: "var(--fs-base)", fontWeight: 600, color: "#fff" }}
              >
                <Printer size={14} />พิมพ์รายงาน
              </button>
            )}
          </div>
        </div>

        {loading && <p style={{ color: "var(--muted-color)", fontSize: "var(--fs-small)" }}>กำลังโหลดข้อมูล...</p>}

        {!loading && allRows.length === 0 && (
          <p className="follow-empty">กดปุ่ม "โหลดข้อมูล" เพื่อดึงข้อมูลจาก Google Sheets</p>
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
