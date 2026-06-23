"use client";

import React, { useState, useRef, useEffect } from "react";
import { TestTube2, X, XCircle, RefreshCw, BarChart2, Table2, Printer } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type {
  SpecimenTestResponse,
  SpecimenDataResponse,
  AppScriptResponse,
  SpecimenTestRow,
  SpecimenRow,
  SpecimenSummary,
} from "@/types";

interface SpecimenModalProps {
  open: boolean;
  onClose: () => void;
  onCountsUpdate: (counts: Record<string, number>) => void;
}

export function SpecimenModal({ open, onClose, onCountsUpdate }: SpecimenModalProps) {
  const [testData, setTestData] = useState<SpecimenTestRow[]>([]);
  const [groupA, setGroupA] = useState("");
  const [groupB, setGroupB] = useState("");
  const [specimenCode, setSpecimenCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [barcodeStatus, setBarcodeStatus] = useState<{ msg: string; cls: string }>({ msg: "", cls: "" });
  const [specimenRows, setSpecimenRows] = useState<SpecimenRow[]>([]);
  const [summary, setSummary] = useState<SpecimenSummary[]>([]);
  const [footerStatus, setFooterStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRows, setPendingRows] = useState<SpecimenRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hnCache, setHnCache] = useState<Record<string, string>>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadDropdowns();
      loadTable();
      loadHnCache();
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } else {
      setHnCache({});
      setPendingRows([]);
    }
  }, [open]);

  async function loadDropdowns() {
    try {
      const result = await appScriptRequest<SpecimenTestResponse>({ action: "getTestData" });
      if (!result.ok) return;
      setTestData(result.rows || []);
    } catch {}
  }

  async function loadHnCache() {
    try {
      const res = await appScriptRequest<{ ok: boolean; rows?: string[][] }>({
        action: "getHnNameCache"
      });
      if (res.ok && res.rows) {
        const map: Record<string, string> = {};
        res.rows.forEach(r => {
          const hn   = String(r[0] || "").trim();
          const name = String(r[1] || "").trim();
          if (hn) {
            map[hn] = name;
            map[String(parseInt(hn, 10))] = name;
          }
        });
        setHnCache(map);
      }
    } catch {}
  }

  async function loadTable() {
    try {
      const result = await appScriptRequest<SpecimenDataResponse>({ action: "getSpecimenData" });
      if (!result.ok || !result.rows) return;
      setSpecimenRows(result.rows);
      setSummary(result.summary || []);
      onCountsUpdate(result.counts || {});
    } catch {}
  }

  function printLabSummary() {
    if (summary.length === 0) return;

    // รายชื่อ specimen ที่ต้องการแสดงในเอกสาร (ตามภาพ)
    const SPEC_LIST = [
      "EDTA", "Clot", "Lithium heparin", ".Lithium heparin",
      "Mercury", "Arsenic", "Mn", "Co", "Urine", "Toxico", "Stool Exam",
      "Sodium Fluoride", "Sodium citrate", "Lead", "Cadmium",
      "Aluminum", "Cr", "Ni", "Toxico", "Stool Culture"
    ];

    // สร้าง map จาก summary
    const countMap: Record<string, number> = {};
    summary.forEach(s => { countMap[s.type] = s.count; });

    // แสดงทุก specimen ในรายการ ถ้าไม่มีค่าให้เป็น 0
    const LEFT_LIST  = ["EDTA", "Clot", ".Lithium heparin", "Mercury", "Arsenic", "Mn", "Co", "Urine", "Toxico", "Stool Exam"];
    const RIGHT_LIST = ["Sodium Fluoride", "Sodium citrate", "Lead", "Cadmium", "Aluminum", "Cr", "Ni", "Toxico", "Stool Culture"];
    const maxRow = Math.max(LEFT_LIST.length, RIGHT_LIST.length);

    const today = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const rows = Array.from({ length: maxRow }, (_, i) => {
      const lItem = LEFT_LIST[i];
      const rItem = RIGHT_LIST[i];
      const lCount = lItem !== undefined ? (countMap[lItem] || 0) : null;
      const rCount = rItem !== undefined ? (countMap[rItem] || 0) : null;
      return `<tr>
        <td class="col-name">${lItem || ""}</td>
        <td class="col-count">${lCount !== null ? `(${lCount})` : ""}</td>
        <td class="col-gap"></td>
        <td class="col-name2">${rItem || ""}</td>
        <td class="col-count2">${rCount !== null ? `(${rCount})` : ""}</td>
      </tr>`;
    }).join("");

    const docBlock = `
      <div style="width:100%;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5mm;">
          <div style="font-size:11pt; line-height:2;">
            <div>วันที่: <span style="font-weight:600;">${today}</span></div>
            <div>หน่วย : ............................................................</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:26pt; font-weight:700; line-height:1.1;">เอกสารนำส่ง Lab Specimen</div>
          </div>
        </div>

        <!-- Specimen table -->
        <table style="width:100%; border-collapse:collapse; margin-top:6mm;">
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- Incharge -->
        <div style="margin-top:18mm; font-size:12pt;">
          Incharge .......................................
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }
  html, body { height: 100%; }
  body {
    font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
    font-size: 10pt; color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .doc-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cut-line {
    border: none;
    border-top: 1pt dashed #888;
    margin: 3mm 0;
  }

  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .doc-header-left { font-size: 9pt; line-height: 1.9; }
  .date-line { font-size: 9pt; }
  .unit-line { font-size: 9pt; }
  .doc-header-title {
    font-size: 20pt;
    font-weight: 700;
    text-align: right;
    line-height: 1.25;
  }

  .content-gap { height: 10mm; }
  .sign-gap    { height: 14mm; }

  .spec-table { width: 100%; border-collapse: collapse; }
  .spec-table td {
    padding: 1.2mm 2mm;
    font-size: 9.5pt;
    vertical-align: middle;
    line-height: 1.8;
  }
  .col-name  { width: 36%; }
  .col-count { width: 14%; }
  .col-gap   { width: 4%; }
  .col-name2  { width: 36%; }
  .col-count2 { width: 14%; }
  .doc-footer { font-size: 9pt; }
</style>
</head>
<body>
<div class="wrapper">

  <!-- Copy 1 — ครึ่งบน -->
  <div class="doc-block">
    <div class="doc-header">
      <div class="doc-header-left">
        <div class="date-line">วันที่: <strong>${today}</strong></div>
        <div class="unit-line">หน่วย : ............................................</div>
      </div>
      <div class="doc-header-title">เอกสารนำส่ง<br>Lab Specimen</div>
    </div>
    <div class="content-gap"></div>
    <table class="spec-table"><tbody>${rows}</tbody></table>
    <div class="sign-gap"></div>
    <div class="doc-footer">Incharge .......................................</div>
  </div>

  <!-- เส้นแบ่งครึ่ง -->
  <hr class="cut-line">

  <!-- Copy 2 — ครึ่งล่าง -->
  <div class="doc-block">
    <div class="doc-header">
      <div class="doc-header-left">
        <div class="date-line">วันที่: <strong>${today}</strong></div>
        <div class="unit-line">หน่วย : ............................................</div>
      </div>
      <div class="doc-header-title">เอกสารนำส่ง<br>Lab Specimen</div>
    </div>
    <div class="content-gap"></div>
    <table class="spec-table"><tbody>${rows}</tbody></table>
    <div class="sign-gap"></div>
    <div class="doc-footer">Incharge .......................................</div>
  </div>

</div>

<script>window.onload = function() { window.print(); };</script>
</body></html>`;

    const w = window.open("", "_blank", "width=800,height=900");
    if (w) { w.document.write(html); w.document.close(); }
  }

  async function handleDeleteSpecimen(rowIndex: number) {
    if (!confirm("ลบรายการนี้ออกจาก Specimen?")) return;
    try {
      const res = await appScriptRequest<AppScriptResponse>({
        action: "deleteSpecimen",
        rowIndex: rowIndex,
      });
      if (res.ok) {
        setFooterStatus("ลบรายการเรียบร้อย");
        loadTable();
      } else {
        setFooterStatus("ลบไม่สำเร็จ");
      }
    } catch {
      setFooterStatus("เกิดข้อผิดพลาด");
    }
  }

  const groupsA = [...new Set(testData.map((r) => r.colF).filter(Boolean))];
  const groupsB = [...new Set(testData.filter((r) => r.colF === groupA).map((r) => r.colB).filter(Boolean))];

  function onGroupAChange(v: string) {
    setGroupA(v);
    setGroupB("");
    setSpecimenCode("");
  }

  function onGroupBChange(v: string) {
    setGroupB(v);
    const match = testData.find((r) => r.colF === groupA && r.colB === v);
    setSpecimenCode(match?.colE || "");
  }

  function onBarcodeInput(v: string) {
    // กรองเฉพาะตัวเลข
    const digits = v.replace(/\D/g, "");

    // ถ้ายาวกว่า 8 หลัก — แสดงว่า scanner ส่งค่าต่อกัน
    // ตัด 8 หลักแรก process แล้วเก็บส่วนที่เหลือไว้
    if (digits.length > 8) {
      const chunks: string[] = [];
      for (let i = 0; i < digits.length; i += 8) {
        chunks.push(digits.slice(i, i + 8));
      }
      // process ทุก chunk ที่ครบ 8 หลัก
      chunks.filter(c => c.length === 8).forEach(c => processBarcode(c));
      // เก็บส่วนที่เหลือ (ถ้ามี)
      const remainder = chunks[chunks.length - 1];
      const leftover = remainder && remainder.length < 8 ? remainder : "";
      setBarcode(leftover);
      setBarcodeStatus({ msg: "", cls: "" });
      return;
    }

    setBarcode(digits);
    setBarcodeStatus({ msg: "", cls: "" });
    if (digits.length === 8) processBarcode(digits);
  }

  function processBarcode(bc = barcode) {
    if (isProcessing) return;
    if (!/^\d{8}$/.test(bc)) {
      setBarcodeStatus({ msg: "Barcode ไม่ถูกต้อง", cls: "err" });
      resetInput();
      return;
    }

    const first2 = bc.slice(0, 2);
    if (specimenCode && first2 !== String(specimenCode).slice(0, 2).padStart(2, "0")) {
      setBarcodeStatus({ msg: "Specimen ไม่ตรงกัน", cls: "err" });
      resetInput();
      return;
    }

    const hn6 = bc.slice(2);
    const now = new Date();
    const dateStr = now.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

    // lookup ชื่อจาก cache
    const cachedName = hnCache[hn6] || hnCache[String(parseInt(hn6, 10))] || "";

    // เพิ่มลง pending state ทันที — ไม่รอ API
    const newRow: SpecimenRow = {
      hn: hn6,
      name: cachedName || "(ไม่พบในระบบ)",
      specimenType: groupB || "(ไม่ระบุ)",
      specimenGroup: groupA || "(ไม่ระบุ)",
      pending: true,
      barcode: bc,
      dateTime: dateStr,
    };

    setPendingRows(prev => [...prev, newRow]);
    setBarcodeStatus({ msg: "✓ เพิ่มแล้ว", cls: "ok" });
    setFooterStatus(`เพิ่ม HN ${hn6} — ${cachedName || "ไม่พบในระบบ"} — ${groupB || ""} [รอ Sync]`);
    resetInput();
  }

  async function syncToSheet() {
    if (pendingRows.length === 0) return;
    setIsSyncing(true);
    setFooterStatus(`กำลัง Sync ${pendingRows.length} รายการ...`);

    let success = 0;
    let fail = 0;

    for (const row of pendingRows) {
      try {
        const result = await appScriptRequest<AppScriptResponse<{ patientName?: string }>>({
          action: "saveSpecimen",
          hn6: row.hn,
          specimenType: row.specimenType,
          specimenGroup: row.specimenGroup,
        });
        if (result.ok) {
          success++;
          // อัพเดทชื่อถ้าได้
          if (result.patientName) {
            setPendingRows(prev => prev.map(r =>
              r.hn === row.hn && r.specimenType === row.specimenType && r.pending
                ? { ...r, name: result.patientName!, pending: false }
                : r
            ));
          }
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }

    setIsSyncing(false);
    setFooterStatus(`Sync เสร็จ: สำเร็จ ${success} / ล้มเหลว ${fail}`);
    if (fail === 0) setPendingRows([]);
    loadTable();
  }

  function resetInput() {
    setTimeout(() => {
      setBarcode("");
      setBarcodeStatus({ msg: "", cls: "" });
      barcodeRef.current?.focus();
    }, 1500);
  }

  function buildKeys() {
    return [
      ...pendingRows.map((_, i) => `p:${i}`),
      ...specimenRows.map((r, i) => `s:${r.rowIndex ?? i}`),
    ];
  }

  function isAllSelected() {
    const keys = buildKeys();
    return keys.length > 0 && keys.every(k => selectedKeys.has(k));
  }

  function toggleKey(key: string) {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (isAllSelected()) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(buildKeys()));
    }
  }

  async function deleteSelected() {
  if (selectedKeys.size === 0) return;

  const totalCount = selectedKeys.size;

  const t = toast({
    title: "กำลังลบข้อมูล...",
    description: `กำลังลบ ${totalCount} รายการ`,
    variant: "default",
  });

  try {
    const pendingIdxToRemove = new Set<number>();
    const syncedRowIdxToRemove: number[] = [];

    selectedKeys.forEach(k => {
      if (k.startsWith("p:")) {
        pendingIdxToRemove.add(Number(k.slice(2)));
      } else if (k.startsWith("s:")) {
        syncedRowIdxToRemove.push(Number(k.slice(2)));
      }
    });

    // ลบรายการที่ยังไม่ Sync
    if (pendingIdxToRemove.size > 0) {
      setPendingRows(prev =>
        prev.filter((_, i) => !pendingIdxToRemove.has(i))
      );
    }

    // ลบรายการที่ Sync แล้ว
    for (const rowIdx of syncedRowIdxToRemove) {
      await appScriptRequest<AppScriptResponse>({
        action: "deleteSpecimen",
        rowIndex: rowIdx,
      });
    }

    setSelectedKeys(new Set());

    if (syncedRowIdxToRemove.length > 0) {
      await loadTable();
    }

    // อัปเดต Toast เดิม
    t.update({
      id: t.id,
      title: "ลบข้อมูลสำเร็จ",
      description: `ลบ ${totalCount} รายการเรียบร้อยแล้ว`,
      variant: "success",
    });

  } catch (error) {

    t.update({
      id: t.id,
      title: "เกิดข้อผิดพลาด",
      description: "ไม่สามารถลบข้อมูลได้",
      variant: "destructive",
    });

    console.error(error);
  }
}

  if (!open) return null;

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box--specimen">
        <div className="modal-header modal-header--specimen">
          <h3><TestTube2 size={18} />นับสิ่งตรวจ</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body modal-body--specimen">
          {/* Controls */}
          <div className="specimen-controls">
            <div className="specimen-control-group">
              <label className="specimen-label">จุดตรวจ</label>
              <select className="specimen-select" value={groupA} onChange={(e) => onGroupAChange(e.target.value)}>
                <option value="">— เลือกจุดตรวจ —</option>
                {groupsA.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="specimen-control-group">
              <label className="specimen-label">Specimen</label>
              <select className="specimen-select" value={groupB} onChange={(e) => onGroupBChange(e.target.value)}>
                <option value="">— เลือก Specimen —</option>
                {groupsB.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="specimen-control-group">
              <label className="specimen-label">รหัสสิ่งตรวจ</label>
              <input className="specimen-input" readOnly value={specimenCode} placeholder="— อัตโนมัติ —" />
            </div>
            <div className="specimen-control-group specimen-control-group--barcode">
              <label className="specimen-label">
                สแกน Barcode <span className="specimen-badge">8 หลัก</span>
              </label>
              <div className="specimen-barcode-row">
                <input
                  ref={barcodeRef}
                  className="specimen-input specimen-input--barcode"
                  value={barcode}
                  onChange={(e) => onBarcodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); processBarcode(); } }}
                  placeholder="สแกนหรือพิมพ์บาร์โค้ด 8 หลัก"
                  maxLength={8}
                  autoComplete="off"
                />
                <span className={`specimen-barcode-status${barcodeStatus.cls ? " " + barcodeStatus.cls : ""}`}>
                  {barcodeStatus.msg}
                </span>
              </div>
            </div>
          </div>

          {/* Data row */}
          <div className="specimen-data-row">
            <div className="specimen-block">
              <div className="specimen-block-header">
                <BarChart2 size={14} /><span>สรุปจำนวนสิ่งตรวจ</span>
              </div>
              <div className="specimen-summary-wrap">
                {summary.length === 0
                  ? <div className="specimen-empty"><p>ยังไม่มีข้อมูล</p></div>
                  : summary.map((s) => (
                      <div className="specimen-summary-item" key={s.type}>
                        <span className="s-type">{s.type}</span>
                        <span className="s-count">{s.count}</span>
                      </div>
                    ))}
              </div>
            </div>

            <div className="specimen-block">
              <div className="specimen-block-header">
                <Table2 size={14} /><span>Specimen List</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                  <button
                    onClick={toggleAll}
                    style={{ height: 22, padding: "0 8px", borderRadius: 5, border: "1px solid #b8d8e8", background: isAllSelected() ? "#e0f4fa" : "#fff", color: "#0c6075", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {isAllSelected() ? "✕ ยกเลิก" : "☑ ทั้งหมด"}
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={selectedKeys.size === 0}
                    style={{ height: 22, padding: "0 8px", borderRadius: 5, border: "1px solid #f5c2c7", background: selectedKeys.size === 0 ? "#f9f9f9" : "#c63742", color: selectedKeys.size === 0 ? "#ccc" : "#fff", fontSize: 11, fontWeight: 700, cursor: selectedKeys.size === 0 ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                  >
                    🗑 ลบ ({selectedKeys.size})
                  </button>
                  <button className="specimen-refresh-btn" onClick={loadTable} title="รีเฟรช">
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
              <div className="specimen-table-wrap">
                <table className="specimen-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32, textAlign: "center" }}>
                        <input type="checkbox" checked={isAllSelected()} onChange={toggleAll} style={{ cursor: "pointer", accentColor: "#0c6075" }} />
                      </th>
                      <th>HN</th>
                      <th>ชื่อ นามสกุล</th>
                      <th>Specimen</th>
                      <th>จุดตรวจ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specimenRows.length === 0 && pendingRows.length === 0
                      ? <tr><td colSpan={5} className="specimen-table-empty">ยังไม่มีข้อมูล</td></tr>
                      : <>
                          {pendingRows.map((r, i) => {
                            const key = `p:${i}`;
                            return (
                              <tr key={key} style={{ background: selectedKeys.has(key) ? "#fde8e8" : "#fffbe6", opacity: isSyncing ? 0.6 : 1 }}>
                                <td style={{ textAlign: "center" }}>
                                  <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleKey(key)} disabled={isSyncing} style={{ cursor: "pointer", accentColor: "#c63742" }} />
                                </td>
                                <td>{r.hn}</td>
                                <td style={{ color: "#999", fontStyle: "italic" }}>{r.name}</td>
                                <td>{r.specimenType}</td>
                                <td>{r.specimenGroup}</td>
                              </tr>
                            );
                          })}
                          {specimenRows.map((r, i) => {
                            const key = `s:${r.rowIndex ?? i}`;
                            return (
                              <tr key={key} style={{ background: selectedKeys.has(key) ? "#fde8e8" : undefined }}>
                                <td style={{ textAlign: "center" }}>
                                  <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleKey(key)} style={{ cursor: "pointer", accentColor: "#c63742" }} />
                                </td>
                                <td>{r.hn}</td>
                                <td>{r.name}</td>
                                <td>{r.specimenType}</td>
                                <td>{r.specimenGroup}</td>
                              </tr>
                            );
                          })}
                        </>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span className="modal-status" style={{ color: "#087d86" }}>{footerStatus}</span>
          {pendingRows.length > 0 && (
            <button
              onClick={syncToSheet}
              disabled={isSyncing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: "var(--btn-h)", padding: "0 14px", borderRadius: 7,
                border: "1px solid #f59e0b",
                background: isSyncing ? "#fde68a" : "#f59e0b",
                color: "#fff", cursor: isSyncing ? "not-allowed" : "pointer",
                fontSize: "var(--fs-base)", fontWeight: 700,
                animation: pendingRows.length > 0 && !isSyncing ? "pulse 1.5s infinite" : "none",
              }}
            >
              {isSyncing ? "⏳" : "☁️"} Sync {pendingRows.length} รายการ
            </button>
          )}
          <button
            onClick={printLabSummary}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: "var(--btn-h)", padding: "0 14px", borderRadius: 7,
              border: "1px solid #0c6075", background: "#0c6075",
              color: "#fff", cursor: "pointer",
              fontSize: "var(--fs-base)", fontWeight: 600,
              opacity: summary.length === 0 ? 0.4 : 1,
            }}
          >
            <Printer size={14} />พิมพ์ยอดรวม Lab
          </button>
          <button className="btn-cancel" onClick={onClose}>
            <XCircle size={15} />ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
