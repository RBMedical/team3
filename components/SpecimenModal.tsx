"use client";

import React, { useState, useRef, useEffect } from "react";
import { TestTube2, X, XCircle, RefreshCw, BarChart2, Table2 } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
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
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadDropdowns();
      loadTable();
      setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  }, [open]);

  async function loadDropdowns() {
    try {
      const result = await appScriptRequest<SpecimenTestResponse>({ action: "getTestData" });
      if (!result.ok) return;
      setTestData(result.rows || []);
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

  const groupsA = [...new Set(testData.map((r) => r.colF).filter(Boolean))];
  const groupsB = [...new Set(testData.filter((r) => r.colF === groupA).map((r) => r.colE).filter(Boolean))];

  function onGroupAChange(v: string) {
    setGroupA(v);
    setGroupB("");
    setSpecimenCode("");
  }

  function onGroupBChange(v: string) {
    setGroupB(v);
    const match = testData.find((r) => r.colF === groupA && r.colE === v);
    setSpecimenCode(match?.colB || "");
  }

  function onBarcodeInput(v: string) {
    setBarcode(v);
    setBarcodeStatus({ msg: "", cls: "" });
    if (/^\d{8}$/.test(v)) processBarcode(v);
  }

  async function processBarcode(bc = barcode) {
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

    setIsProcessing(true);
    setBarcodeStatus({ msg: "✓ กำลังบันทึก...", cls: "ok" });
    setFooterStatus("กำลังบันทึกข้อมูล...");

    try {
      const result = await appScriptRequest<AppScriptResponse<{ patientName?: string; debug?: string }>>({
        action: "saveSpecimen",
        hn6: bc.slice(2),
        specimenType: groupB,
        specimenGroup: groupA,
      });

      if (!result.ok) {
        setBarcodeStatus({ msg: result.message || "บันทึกไม่สำเร็จ", cls: "err" });
        setFooterStatus(result.message || "บันทึกไม่สำเร็จ");
      } else {
        setBarcodeStatus({ msg: "✓ บันทึกแล้ว", cls: "ok" });
        setFooterStatus(`บันทึก HN ${bc.slice(2)} — ชื่อ: ${result.patientName || "(ไม่พบในระบบ)"}`);
        loadTable();
      }
    } catch (e) {
      setBarcodeStatus({ msg: "เชื่อมต่อไม่สำเร็จ", cls: "err" });
      setFooterStatus("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setIsProcessing(false);
      resetInput();
    }
  }

  function resetInput() {
    setTimeout(() => {
      setBarcode("");
      setBarcodeStatus({ msg: "", cls: "" });
      barcodeRef.current?.focus();
    }, 1500);
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
                <button className="specimen-refresh-btn" onClick={loadTable} title="รีเฟรช">
                  <RefreshCw size={12} />
                </button>
              </div>
              <div className="specimen-table-wrap">
                <table className="specimen-table">
                  <thead>
                    <tr>
                      <th>HN</th>
                      <th>ชื่อ นามสกุล</th>
                      <th>Specimen</th>
                      <th>จุดตรวจ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specimenRows.length === 0
                      ? <tr><td colSpan={4} className="specimen-table-empty">ยังไม่มีข้อมูล</td></tr>
                      : specimenRows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.hn}</td>
                            <td>{r.name}</td>
                            <td>{r.specimenType}</td>
                            <td>{r.specimenGroup}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span className="modal-status" style={{ color: "#087d86" }}>{footerStatus}</span>
          <button className="btn-cancel" onClick={onClose}>
            <XCircle size={15} />ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
