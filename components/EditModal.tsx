"use client";

import React, { useState, useEffect } from "react";
import { Pencil, XCircle, CheckCircle, X } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import type { AppScriptResponse, EmployeeRow } from "@/types";

interface EditModalProps {
  open: boolean;
  currentRow: EmployeeRow | null;
  onClose: () => void;
  onSuccess: (row: EmployeeRow) => void;
}

const editFields = [
  "ชื่อ นามสกุล",
  "รหัสประจำตัว",
  "เลขบัตรประชาชน",
  "แผนก",
  "ตำแหน่ง",
  "ชั้นปี",
  "สาขา",
  "ห้อง",
  "โปรแกรม",
  "Customer",
  "หมายเหตุ",
] as const;

type EditField = (typeof editFields)[number];

export function EditModal({ open, currentRow, onClose, onSuccess }: EditModalProps) {
  const [values, setValues] = useState<Record<EditField, string>>(
    () => Object.fromEntries(editFields.map((f) => [f, ""])) as Record<EditField, string>
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (open && currentRow) {
      setValues(
        Object.fromEntries(
          editFields.map((f) => [f, (currentRow as unknown as Record<string, string>)[f] || ""])
        ) as Record<EditField, string>
      );
      setStatus(null);
    }
  }, [open, currentRow]);

  async function handleSubmit() {
    const name = values["ชื่อ นามสกุล"].trim();
    if (!name) { setStatus({ msg: "กรุณากรอกชื่อ นามสกุล", ok: false }); return; }

    const hn = currentRow?.HN;
    if (!hn) { setStatus({ msg: "ไม่พบ HN", ok: false }); return; }

    setLoading(true);
    setStatus({ msg: "กำลังบันทึก...", ok: true });

    try {
      const payload: Record<string, string> = { action: "update", HN: hn };
      editFields.forEach((f) => { payload[f] = values[f]; });

      const result = await appScriptRequest<AppScriptResponse<{ row: EmployeeRow }>>(payload);
      if (!result.ok) { setStatus({ msg: result.message || "แก้ไขไม่สำเร็จ", ok: false }); return; }

      onSuccess(result.row);
      onClose();
    } catch (err) {
      setStatus({ msg: err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ", ok: false });
    } finally {
      setLoading(false);
    }
  }

  if (!open || !currentRow) return null;

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header modal-header--edit">
          <h3><Pencil size={18} />แก้ไขข้อมูล</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-field">
              <label>HN</label>
              <span className="modal-span">{currentRow.HN || "—"}</span>
            </div>
            <div className="modal-field">
              <label>ลำดับลงทะเบียน</label>
              <span className="modal-span">{currentRow.ลำดับลงทะเบียน || "—"}</span>
            </div>
            <div className="modal-field">
              <label>วันที่ลงทะเบียน</label>
              <span className="modal-span">{currentRow["วันที่ลงทะเบียน"] || "—"}</span>
            </div>
            <div className="modal-field">
              <label>เวลาลงทะเบียน</label>
              <span className="modal-span">{currentRow.เวลาลงทะเบียน || "—"}</span>
            </div>

            <div className="modal-field modal-full">
              <label>ชื่อ นามสกุล <span className="required">*</span></label>
              <input
                value={values["ชื่อ นามสกุล"]}
                onChange={(e) => setValues((v) => ({ ...v, "ชื่อ นามสกุล": e.target.value }))}
                placeholder="ชื่อ นามสกุล"
              />
            </div>

            {(["รหัสประจำตัว","เลขบัตรประชาชน","แผนก","ตำแหน่ง","ชั้นปี","สาขา","ห้อง","โปรแกรม","Customer"] as EditField[]).map((field) => (
              <div className="modal-field" key={field}>
                <label>{field}</label>
                <input
                  value={values[field]}
                  onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                  placeholder="-"
                />
              </div>
            ))}

            <div className="modal-field modal-full">
              <label>หมายเหตุ</label>
              <input
                value={values["หมายเหตุ"]}
                onChange={(e) => setValues((v) => ({ ...v, หมายเหตุ: e.target.value }))}
                placeholder="-"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span className="modal-status" style={{ color: status?.ok ? "#087d86" : "#c63742" }}>
            {status?.msg}
          </span>
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            <XCircle size={15} />ยกเลิก
          </button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            <CheckCircle size={15} />บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
