"use client";

import React, { useState } from "react";
import { ChartNoAxesCombined, RefreshCw, Printer, ListChecks } from "lucide-react";
import { appScriptRequest, escapeHtml } from "@/lib/api";
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
<h2>ติดตามผู้ที่ยังไม่ได้รับการตรวจ</h2>
<div class="sub">วันที่ ${today} · แสดง ${rows.length} ราย</div>
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
</body></html>`;

    printHtmlViaIframe(html);
  }

  // พิมพ์ผ่าน hidden iframe — ทำงานได้ทั้งบนเว็บและใน WebView2
  // (window.open + document.write มักได้หน้าเปล่าใน WebView2)
  function printHtmlViaIframe(html: string) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch { /* ignore */ }
      // ลบ iframe ทิ้งหลัง dialog ปิด
      setTimeout(() => iframe.remove(), 1500);
    };

    // รอให้ content/ฟอนต์ render ก่อนสั่งพิมพ์ (onload + fallback)
    iframe.onload = () => setTimeout(doPrint, 250);
    setTimeout(doPrint, 700);
  }

  // Print All — รายชื่อผู้ที่ "ค่าว่าง" ในแต่ละคอลัมน์ แยกเป็นหัวข้อ (A4 แนวตั้ง)
  function printAll() {
    const source = allRows.length > 0 ? allRows : rows;
    if (source.length === 0) return;

    const today = new Date().toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    });

    // ชื่อหัวข้อแบบอ่านง่าย (header บางตัวเป็นตัวย่อ)
    const DISPLAY: Record<string, string> = {
      PE: "พบแพทย์",
      Urine: "ส่งปัสสาวะ",
    };

    // คอลัมน์รายละเอียด — idx อ้างอิงจาก extraData[hn] = [รหัส, แผนก, ตำแหน่ง, ชั้นปี, สาขา, ห้อง]
    // เรียงลำดับการแสดงผล: รหัส → ชั้นปี → แผนก → สาขา → ตำแหน่ง → ห้อง
    // (ทำให้บริษัทได้ รหัส/แผนก/ตำแหน่ง, สถานศึกษาได้ รหัส/ชั้นปี/แผนก/สาขา/ห้อง โดยอัตโนมัติ)
    const DETAIL_COLS: { idx: number; label: string }[] = [
      { idx: 0, label: "รหัสประจำตัว" },
      { idx: 3, label: "ชั้นปี" },
      { idx: 1, label: "แผนก" },
      { idx: 4, label: "สาขา" },
      { idx: 2, label: "ตำแหน่ง" },
      { idx: 5, label: "ห้อง" },
    ];

    const getExtra = (r: string[]) => extraData[(r[0] || "").trim()] || [];

    // เลือกเฉพาะคอลัมน์รายละเอียดที่ "มีค่า" อย่างน้อย 1 แถวในชุดข้อมูล
    const activeCols = DETAIL_COLS.filter((c) =>
      source.some((r) => ((getExtra(r)[c.idx]) ?? "").trim() !== "")
    );

    // คอลัมน์รายการตรวจ = ตั้งแต่ index 2 เป็นต้นไป (ข้าม HN, ชื่อ)
    const sections: string[] = [];
    for (let ci = 2; ci < CUSTOM_HEADERS.length; ci++) {
      const title = DISPLAY[CUSTOM_HEADERS[ci]] || CUSTOM_HEADERS[ci];
      const missing = source.filter((r) => (r[ci] ?? "").trim() === "");
      if (missing.length === 0) continue;

      const headCells =
        `<th class="c pa-w-num">#</th><th class="pa-w-name">ชื่อ นามสกุล</th>` +
        activeCols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");

      const bodyRows = missing
        .map((r, i) => {
          const name = escapeHtml((r[1] || "").trim());
          const ex = getExtra(r);
          const cells = activeCols
            .map((c) => `<td>${escapeHtml(((ex[c.idx]) ?? "").trim())}</td>`)
            .join("");
          return `<tr><td class="c">${i + 1}</td><td>${name}</td>${cells}</tr>`;
        })
        .join("");

      sections.push(`<div class="pa-section">
        <h3>${escapeHtml(title)} <span class="pa-count">(${missing.length})</span></h3>
        <table class="pa-table">
          <thead><tr>${headCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`);
    }

    if (sections.length === 0) return;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: A4 portrait; margin: 12mm 12mm; }
  body { font-family: 'Sarabun','TH Sarabun New',sans-serif; font-size: 9pt; color:#000; }
  .pa-head { margin-bottom: 5mm; }
  .pa-head h2 { font-size: 13pt; font-weight: 700; }
  .pa-head .pa-date { font-size: 9pt; color: #444; margin-top: 1mm; }
  .pa-section { margin-bottom: 6mm; }
  .pa-section h3 {
    font-size: 11pt; font-weight: 700;
    margin-bottom: 2mm; break-after: avoid;
  }
  .pa-section h3 .pa-count { font-size: 9pt; font-weight: 400; color: #555; }
  .pa-table { width: 100%; border-collapse: collapse; }
  .pa-table th, .pa-table td {
    border: 0.5pt solid #9aa9b2;
    padding: 1mm 1.6mm;
    font-size: 8.5pt;
    text-align: left;
    vertical-align: middle;
  }
  .pa-table th { background: #eef4f6; font-weight: 700; font-size: 8pt; white-space: nowrap; }
  .pa-table td.c, .pa-table th.c { text-align: center; }
  .pa-w-num { width: 8mm; }
  .pa-w-name { width: 38%; }
  .pa-table tr { break-inside: avoid; }
</style>
</head>
<body>
  <div class="pa-head">
    <h2>รายชื่อผู้ที่ยังไม่ได้รับการตรวจ (แยกตามรายการ)</h2>
    <div class="pa-date">วันที่ ${today}</div>
  </div>
  ${sections.join("")}
</body></html>`;

    printHtmlViaIframe(html);
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
                <Printer size={14} />Print
              </button>
            )}
            {allRows.length > 0 && (
              <button
                onClick={printAll}
                style={{ display: "flex", alignItems: "center", gap: 5, height: "var(--btn-h)", padding: "0 12px", borderRadius: 7, border: "1px solid #0c6075", background: "#fff", cursor: "pointer", fontSize: "var(--fs-base)", fontWeight: 600, color: "#0c6075" }}
              >
                <ListChecks size={14} />Print All
              </button>
            )}
          </div>
        </div>

        {loading && <p style={{ color: "var(--muted-color)", fontSize: "var(--fs-small)" }}>กำลังโหลดข้อมูล...</p>}

        {!loading && allRows.length === 0 && (
          <p className="follow-empty">กดปุ่ม "โหลดข้อมูล"</p>
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
