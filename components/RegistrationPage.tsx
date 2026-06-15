"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Pencil, Trash2, UserPlus, UserCheck, Printer, ChevronRight, RefreshCw,
} from "lucide-react";
import {
  appScriptRequest, formatSequence, formatHn, buildBarcodeValue, formatStickerDate,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddNewModal } from "@/components/AddNewModal";
import { EditModal } from "@/components/EditModal";
import { toast } from "@/hooks/use-toast";
import type {
  EmployeeRow, StickerItem, QueueRow, SearchResponse, RegisterResponse, QueueResponse,
} from "@/types";

declare global {
  interface Window {
    JsBarcode?: (el: SVGElement, value: string, options: object) => void;
    chrome?: {
      webview?: {
        postMessage: (msg: string) => void;
      };
    };
  }
}

const FIELDS: (keyof EmployeeRow)[] = [
  "HN","ชื่อ นามสกุล","รหัสประจำตัว","เลขบัตรประชาชน",
  "แผนก","ตำแหน่ง","ชั้นปี","สาขา","ห้อง","โปรแกรม","Customer",
  "ลำดับลงทะเบียน","วันที่ลงทะเบียน","เวลาลงทะเบียน","หมายเหตุ",
];

interface Props {
  onCountsUpdate: (counts: Record<string, number>) => void;
}

export function RegistrationPage({ onCountsUpdate }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentRow, setCurrentRow] = useState<EmployeeRow | null>(null);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [status, setStatus] = useState<{ msg: string; ok: boolean }>({ msg: "พร้อมใช้งาน", ok: true });
  const [registerCount, setRegisterCount] = useState(0);
  const [addNewCount, setAddNewCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [notFoundDialog, setNotFoundDialog] = useState(false);
  const [addNewModal, setAddNewModal] = useState(false);
  const [addNewPrefill, setAddNewPrefill] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [printDialog, setPrintDialog] = useState(false);

  const statusEl = useRef<HTMLDivElement>(null);

  function setStatusMsg(msg: string, ok = true) {
    setStatus({ msg, ok });
    if (statusEl.current) {
      statusEl.current.style.color = ok ? "#087d86" : "#c63742";
      statusEl.current.style.borderColor = ok ? "#bee1e8" : "#ffc3c7";
    }
  }

  const loadQueue = useCallback(async () => {
    try {
      const result = await appScriptRequest<QueueResponse>({ action: "queue" });
      if (!result.ok) return;
      setQueueRows(result.rows || []);
      setRegisterCount(result.count || 0);
      setAddNewCount(result.addNewCount || 0);
    } catch {}
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const result = await appScriptRequest<{ ok: boolean; counts?: Record<string, number> }>({
        action: "getSpecimenData"
      });
      if (result.ok && result.counts) {
        setCounts(result.counts);
        onCountsUpdate(result.counts);
      }
    } catch {}
  }, [onCountsUpdate]);

  useEffect(() => {
    loadQueue();
    loadCounts();
    const interval = setInterval(() => {
      loadQueue();
      loadCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadQueue, loadCounts]);

  // Draw barcodes — retry until JsBarcode CDN script is loaded
  useEffect(() => {
    if (!stickers.length) return;

    let attempts = 0;
    const MAX = 20;

    function renderAll() {
      document.querySelectorAll<SVGElement>(".barcode-svg").forEach((el) => {
        const value = el.dataset.barcode || "";
        if (!value) return;
        console.log("[barcode] rendering:", value, "length:", value.length);
        try {
          if (window.JsBarcode) {
            window.JsBarcode(el, value, {
              format: "CODE39",
              displayValue: false,
              margin: 0,
              width: 1.25,
              height: 30,
            });
          } else {
            drawFallbackBarcode(el, value);
          }
        } catch (e) {
          console.error("[barcode] error for value:", value, e);
          drawFallbackBarcode(el, value);
        }
      });
    }

    function tryRender() {
      attempts++;
      if (window.JsBarcode) {
        renderAll();
        return;
      }
      if (attempts < MAX) {
        setTimeout(tryRender, 100);
      } else {
        renderAll();
      }
    }

    setTimeout(tryRender, 80);
  }, [stickers]);

  function drawFallbackBarcode(svg: SVGElement, value: string) {
    const ns = "http://www.w3.org/2000/svg";
    const width = 316, height = 72;
    const encoded = `110100${String(value).split("").map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join("")}10011`;
    const unit = width / encoded.length;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML = "";
    let cursor = 0;
    for (const bit of encoded) {
      if (bit === "1") {
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(cursor));
        rect.setAttribute("y", "0");
        rect.setAttribute("width", String(Math.max(unit * 0.85, 1)));
        rect.setAttribute("height", String(height));
        rect.setAttribute("fill", "#000");
        svg.appendChild(rect);
      }
      cursor += unit;
    }
  }

  async function handleSearch() {
    if (!query.trim()) return setStatusMsg("กรุณาระบุคำค้นหา", false);
    setStatusMsg("กำลังค้นหา...");
    try {
      const result = await appScriptRequest<SearchResponse>({ action: "search", q: query });
      if (!result.ok) return setStatusMsg(result.message || "ค้นหาไม่สำเร็จ", false);
      const rows = result.rows || [];
      if (rows.length === 0) {
        clearForm();
        setShowResults(false);
        setStatusMsg("ไม่พบข้อมูลที่ค้นหา", false);
        setAddNewPrefill(query);
        setNotFoundDialog(true);
        return;
      }
      fillForm(rows[0]);
      setResults(rows);
      setShowResults(rows.length > 1);
      if (rows.length === 1) setStatusMsg("พบข้อมูลและแสดงบนฟอร์มแล้ว");
      else setStatusMsg(`พบข้อมูล ${rows.length} รายการ แสดงรายการแรกบนฟอร์มแล้ว`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ", false);
    }
  }

  function fillForm(row: EmployeeRow, newStickers?: StickerItem[]) {
    setCurrentRow(row);
    if (newStickers !== undefined) {
      // stickers ส่งมาตรงๆ (จาก register response)
      setStickers(newStickers);
    } else if (row.stickers?.length) {
      // stickers ติดมากับ row (บาง API version)
      setStickers(row.stickers);
    } else {
      setStickers([]);
      // โหลด sticker เฉพาะเมื่อ "ลำดับลงทะเบียน" (Column L) มีค่าแล้วเท่านั้น
      const sequence = String(row["ลำดับลงทะเบียน"] ?? "").trim();
      if (sequence) {
        loadStickersByHn(row.HN);
      }
    }
  }

  function doPrint() {
    if (window.chrome?.webview) {
      // อยู่ใน WebView2 — ส่ง sticker HTML ไปให้ VB print
      const stickerCards = document.querySelectorAll('.sticker-card');
      const htmlContent = Array.from(stickerCards).map(el => el.outerHTML).join('');
      setTimeout(() => {
        window.chrome!.webview!.postMessage("PRINT_STICKERS:" + htmlContent);
      }, 1500);
    } else {
      // browser ปกติ — ใช้ window.print()
      window.print();
    }
  }

  async function loadStickersByHn(hn: string) {
    if (!hn) return;
    try {
      console.log("[getStickers] calling with HN:", hn);
      const result = await appScriptRequest<{
        ok: boolean;
        stickers?: StickerItem[];
        rows?: StickerItem[];
        message?: string;
      }>({
        action: "getStickers",
        hn,
      });
      console.log("[getStickers] response:", JSON.stringify(result).slice(0, 300));
      if (result.ok) {
        const data = result.stickers || result.rows || [];
        console.log("[getStickers] sticker count:", data.length);
        setStickers(data);
      } else {
        console.warn("[getStickers] failed:", result.message);
      }
    } catch (err) {
      console.error("[getStickers] exception:", err);
    }
  }

  function clearForm() {
    setCurrentRow(null);
    setStickers([]);
    setResults([]);
  }

  async function handleDelete() {
    setDeleteDialog(false);
    const hn = currentRow?.HN;
    if (!hn) return;
    setStatusMsg("กำลังลบข้อมูล...");
    try {
      const result = await appScriptRequest<{ ok: boolean; message?: string }>({ action: "delete", hn });
      if (!result.ok) return setStatusMsg(result.message || "ลบไม่สำเร็จ", false);
      clearForm();
      setStatusMsg("ลบข้อมูลเรียบร้อย");
      toast({ title: "ลบข้อมูลเรียบร้อย", variant: "success" });
      loadQueue();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ", false);
    }
  }

  async function handleRegister() {
    if (!currentRow?.rowId) return setStatusMsg("กรุณาเลือกข้อมูลก่อนลงทะเบียน", false);
    // ตรวจสอบว่าลงทะเบียนแล้วหรือยัง
    const sequence = String(currentRow["ลำดับลงทะเบียน"] ?? "").trim();
    if (sequence) return setStatusMsg("รายชื่อนี้ลงทะเบียนไปแล้ว", false);
    setStatusMsg("กำลังลงทะเบียน...");
    try {
      const result = await appScriptRequest<RegisterResponse>({ action: "register", rowId: currentRow.rowId });
      if (!result.ok) return setStatusMsg(result.message || "ลงทะเบียนไม่สำเร็จ", false);
      fillForm(result.row, result.stickers || []);
      setStatusMsg("ลงทะเบียนและสร้างสติกเกอร์เรียบร้อย");
      loadQueue();
      if (result.stickers?.length) setPrintDialog(true);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ", false);
    }
  }

  const formValue = (key: keyof EmployeeRow) => (currentRow ? String(currentRow[key] ?? "") : "");
  const readonlyFields: (keyof EmployeeRow)[] = ["ลำดับลงทะเบียน","วันที่ลงทะเบียน","เวลาลงทะเบียน"];

  function makeStickerHTML(item: StickerItem): string {
    const barcodeValue = item.barcode || "";
    const specimenCode = item.specimenCode || "";
    const seq = formatSequence(item.ลำดับลงทะเบียน);
    const hn = formatHn(item.HN);
    const subcode = `${seq} / ${specimenCode || item.program || "-"}`;
    const specimen = item.specimen || "-";
    const name = item.fullName || item.displayName || "-";
    const customer = item.Customer || "-";
    const date = formatStickerDate(item["วันที่ลงทะเบียน"]);
    return `<div class="sticker-card">
      <div class="seq">${seq}</div>
      <div class="right">
        <div class="barcode-wrap"><svg class="bc" data-val="${barcodeValue}"></svg></div>
        <div class="info">
          <div class="left-info">
            <div class="hn">HN ${hn}</div>
            <div class="sub">${subcode}</div>
            <div class="spc">${specimen}</div>
          </div>
          <div class="right-info">
            <div class="nm">${name}</div>
            <div class="cust">${customer}</div>
            <div class="dt">${date}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function printStickers() {
    if (!stickers.length) { setStatusMsg("ไม่มีสติกเกอร์ที่จะพิมพ์", false); return; }

    const stickerHTML = stickers.map((item) => makeStickerHTML(item)).join("");

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: 189px 76px; margin: 0; }
  html, body { width: 189px; margin: 0; padding: 0; background: #fff; font-family: 'Sarabun', sans-serif; }
  .sticker-card {
    width: 189px;
    height: 76px;
    display: flex;
    border: 1px solid #999;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sticker-card:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
  .seq {
    width: 18px; min-width: 18px; max-width: 18px;
    background: #000 !important; color: #fff !important;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 900;
    writing-mode: vertical-lr;
    transform: rotate(180deg);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .right { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .barcode-wrap {
    height: 36px; max-height: 36px;
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid #ddd; padding: 1px 2px 0;
    overflow: hidden;
  }
  .bc { width: 100%; height: 32px; display: block; }
  .info { flex: 1; display: flex; overflow: hidden; min-height: 0; max-height: 40px; }
  .left-info {
    width: 50px; min-width: 50px;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 2px 0 2px;
    border-right: 1px solid #eee;
    overflow: hidden;
  }
  .hn  { font-size: 7px; font-weight: 700; color: #000; white-space: nowrap; }
  .sub { font-size: 6px; color: #444; white-space: nowrap; }
  .spc { font-size: 15pt !important; font-weight: 900 !important; color: #000 !important; white-space: nowrap !important; }
  .right-info {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; justify-content: center;
    align-items: flex-end; text-align: right;
    padding: 0 3px 0 2px;
    overflow: hidden;
  }
  .nm   { font-size: 13pt !important; font-weight: 800 !important; color: #000 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; max-width: 100% !important; }
  .cust { font-size: 6px; color: #333; white-space: nowrap; }
  .dt   { font-size: 6px; color: #555; white-space: nowrap; }
</style>
<script src="http://localhost:3000/jsbarcode.min.js"></script>
</head>
<body>
${stickerHTML}
<script>
  window.onload = function() {
    document.querySelectorAll('.bc').forEach(function(el) {
      var val = el.getAttribute('data-val');
      if (!val) return;
      try {
        JsBarcode(el, val, { format:'CODE39', displayValue:false, margin:0, width:1.2, height:28 });
      } catch(e) {}
    });
    // ปิด dialog อัตโนมัติหลังพิมพ์เสร็จ
    window.onafterprint = function() { window.close(); };
    setTimeout(function() { doPrint(); }, 800);
  };
<\/script>
</body></html>`;

    const w = window.open("", "_blank", "width=400,height=300");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <>
      <section className="register-panel">
        {/* Search */}
        <div className="search-row">
          <label className="search-label"><Search size={12} />ค้นหา</label>
          <input
            type="search"
            placeholder="รหัสประจำตัว, ชื่อ นามสกุล, เลขบัตรประชาชน"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="primary" onClick={handleSearch}>
            <Search size={13} />ค้นหา
          </button>
        </div>

        {/* Result list */}
        {showResults && (
          <div className="result-list visible">
            {results.map((row, i) => (
              <button key={i} type="button" className="result-item" onClick={() => { fillForm(row); setShowResults(false); }}>
                <div>
                  <strong>{row["ชื่อ นามสกุล"] || "-"}</strong>
                  <span>HN {row.HN || "-"} | รหัส {row["รหัสประจำตัว"] || "-"} | โปรแกรม {row["โปรแกรม"] || "-"}</span>
                </div>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form className="data-form" onSubmit={(e) => e.preventDefault()}>
          {FIELDS.map((field) => (
            <div className="field" key={field}>
              <label>{field}</label>
              <input
                value={formValue(field)}
                readOnly={readonlyFields.includes(field) || !currentRow}
                placeholder="-"
                onChange={() => {}}
              />
            </div>
          ))}
        </form>

        {/* Action bar — ปุ่มกว้างเท่ากัน เว้นช่องไฟเต็มพื้นที่ */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingTop: 4 }}>
          {/* ปุ่มกว้างเท่ากัน flex:1 ทุกปุ่ม */}
          <button
            onClick={() => currentRow && setEditModal(true)}
            style={{ flex: 1, height: "var(--btn-h)", borderRadius: 7, border: "1px solid #cfd9e5", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "var(--fs-base)", fontWeight: 600, whiteSpace: "nowrap" }}>
            <Pencil size={14} />แก้ไข
          </button>
          <button
            onClick={() => currentRow && setDeleteDialog(true)}
            style={{ flex: 1, height: "var(--btn-h)", borderRadius: 7, border: "1px solid #f5c2c7", background: "#fff", color: "#c63742", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "var(--fs-base)", fontWeight: 600, whiteSpace: "nowrap" }}>
            <Trash2 size={14} />ลบ
          </button>
          <button
            className="add-new"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setAddNewPrefill(""); setAddNewModal(true); }}>
            <UserPlus size={14} />เพิ่มรายชื่อ
          </button>
          <button
            className="success"
            style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }}
            onClick={handleRegister}>
            <UserCheck size={14} />ลงทะเบียน
          </button>
        </div>

        {/* Follow summary */}
        <div className="container-follow">
          <div className="follow-summary-grid">
            <div className="follow-summary-card">
              <span className="fsc-label">ลงทะเบียน</span>
              <input readOnly value={registerCount} />
            </div>
            <div className="follow-summary-card">
              <span className="fsc-label">เพิ่มชื่อ</span>
              <input readOnly value={addNewCount} />
            </div>
          </div>
        </div>

        {/* Specimen counts — 2-column grid */}
        <div className="container-count">
          <div className="count-grid">
            {[
              { id: "blood",     label: "เจาะเลือด"    },
              { id: "Audiogram", label: "Audiogram"     },
              { id: "doctor",    label: "พบแพทย์"       },
              { id: "spirometry",label: "Spirometry"    },
              { id: "xray",      label: "X-Ray"         },
              { id: "eyes",      label: "ตาอาชีวอนามัย" },
              { id: "urine",     label: "ส่งปัสสาวะ"    },
              { id: "stool",     label: "Stool"         },
              { id: "ekg",       label: "EKG"           },
              { id: "muscle",    label: "กล้ามเนื้อ"    },
            ].map(({ id, label }) => (
              <div className="count-field" key={id}>
                <span className="cf-label">{label}</span>
                <input readOnly value={counts[id] ?? ""} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sticker panel */}
      <aside className="sticker-panel">
        <h2>สติกเกอร์บาร์โค้ด</h2>
        <div className="sticker-preview">
          {stickers.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 7V4a1 1 0 0 1 1-1h3M4 17v3a1 1 0 0 0 1 1h3m10-18h-3a1 1 0 0 1-1 1v3m4 10v3a1 1 0 0 1-1 1h-3" /></svg>
              <p>พื้นที่แสดงสติกเกอร์บาร์โค้ด</p>
            </div>
          ) : stickers.map((item, i) => {
            // ใช้ barcode จาก API โดยตรง — format: HN(5) + specimenCode
            const barcodeValue = item.barcode || "";
            const specimenCode = item.specimenCode || "";
            return (
              <div className="sticker-scale" key={i}>
                <article className="sticker-card">
                  {/* แถบดำซ้าย — ลำดับ */}
                  <div className="sticker-sequence">{formatSequence(item.ลำดับลงทะเบียน)}</div>
                  {/* Barcode แถวบน */}
                  <div className="sticker-barcode">
                    <svg className="barcode-svg" data-barcode={barcodeValue} />
                  </div>
                  {/* Info แถวล่าง */}
                  <div className="sticker-info">
                    <div className="sticker-left">
                      <div className="sticker-hn">HN {formatHn(item.HN)}</div>
                      <div className="sticker-subcode">{formatSequence(item.ลำดับลงทะเบียน)} / {specimenCode || item.program || "-"}</div>
                      <div className="sticker-specimen">{item.specimen || "-"}</div>
                    </div>
                    <div className="sticker-right">
                      <div className="sticker-name">{item.fullName || item.displayName || "-"}</div>
                      <div className="sticker-customer">{item.Customer || "-"}</div>
                      <div className="sticker-date">{formatStickerDate(item["วันที่ลงทะเบียน"])}</div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        <div className="printer-box">
          <button className="success full" onClick={() => doPrint()}>
            <Printer size={14} />พิมพ์
          </button>
          <small>กรุณาตรวจสอบข้อมูลก่อนพิมพ์</small>
        </div>
      </aside>

      {/* Queue panel */}
      <aside className="queue-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2>Register Detail</h2>
          <button onClick={loadQueue} style={{ background: "transparent", border: "1px solid #cfd9e5", borderRadius: 5, padding: "2px 6px", cursor: "pointer", color: "#667789", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <RefreshCw size={11} />รีเฟรช
          </button>
        </div>
        <div className="queue-table-wrapper">
          <table className="queue-table">
            <thead>
              <tr>
                <th className="text-center">ลำดับ</th>
                <th className="text-center">HN</th>
                <th className="text-center">ชื่อ</th>
                <th className="text-center">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((row, i) => (
                <tr key={i}>
                  <td className="text-center">{row.sequence}</td>
                  <td className="text-center">{row.hn}</td>
                  <td>{row.name}</td>
                  <td className="text-center">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>

      {/* Dialogs */}
      <ConfirmDialog
        open={notFoundDialog}
        title="ไม่มีรายชื่อนี้อยู่ในระบบ"
        description={`ไม่พบ "${addNewPrefill}" ต้องการเพิ่มชื่อไหม?`}
        confirmText="ใช่"
        cancelText="ไม่"
        onConfirm={() => {
          setNotFoundDialog(false);
          setAddNewModal(true);
        }}
        onCancel={() => {
          setNotFoundDialog(false);
          setQuery("");
          setStatusMsg("พร้อมใช้งาน");
        }}
      />

      <ConfirmDialog
        open={deleteDialog}
        title="ยืนยันการลบรายชื่อนี้หรือไม่"
        confirmText="ใช่"
        cancelText="ไม่"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
      />

      <ConfirmDialog
        open={printDialog}
        title="ลงทะเบียนเรียบร้อย"
        description="ต้องการพิมพ์สติกเกอร์เลยไหม?"
        confirmText="พิมพ์เลย"
        cancelText="ไม่พิมพ์ตอนนี้"
        onConfirm={() => { setPrintDialog(false); doPrint(); }}
        onCancel={() => setPrintDialog(false)}
      />

      <AddNewModal
        open={addNewModal}
        prefillName={addNewPrefill}
        onClose={() => setAddNewModal(false)}
        onSuccess={() => { setStatusMsg("เพิ่มรายชื่อเรียบร้อย"); loadQueue(); }}
      />

      <EditModal
        open={editModal}
        currentRow={currentRow}
        onClose={() => setEditModal(false)}
        onSuccess={(row) => {
          // preserve existing stickers when editing
          fillForm(row, stickers);
          setStatusMsg("แก้ไขข้อมูลเรียบร้อย");
          toast({ title: "ข้อมูลถูกอัพเดทแล้ว", variant: "success" });
        }}
      />
    </>
  );
}
