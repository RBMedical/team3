"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, XCircle, CheckCircle, X } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import type { AppScriptResponse } from "@/types";

interface AddNewModalProps {
  open: boolean;
  prefillName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const modalInputFields = [
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
] as const;

type ModalField = (typeof modalInputFields)[number];
type FormValues = Record<ModalField, string>;

export function AddNewModal({
  open,
  prefillName = "",
  onClose,
  onSuccess,
}: AddNewModalProps) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(modalInputFields.map((f) => [f, ""])) as FormValues
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setValues(
        Object.fromEntries(
          modalInputFields.map((f) => [f, f === "ชื่อ นามสกุล" ? prefillName : ""])
        ) as FormValues
      );
      setStatus(null);
    }
  }, [open, prefillName]);

  async function handleSubmit() {
    const name = values["ชื่อ นามสกุล"].trim();
    if (!name) {
      setStatus({ msg: "กรุณากรอกชื่อ นามสกุล", ok: false });
      return;
    }

    setLoading(true);
    setStatus({ msg: "กำลังบันทึก...", ok: true });

    try {
      const result = await appScriptRequest<AppScriptResponse>({
        action: "addNew",
        "ชื่อ นามสกุล": name,
        รหัสประจำตัว: values["รหัสประจำตัว"],
        เลขบัตรประชาชน: values["เลขบัตรประชาชน"],
        แผนก: values["แผนก"],
        ตำแหน่ง: values["ตำแหน่ง"],
        ชั้นปี: values["ชั้นปี"],
        สาขา: values["สาขา"],
        ห้อง: values["ห้อง"],
        โปรแกรม: values["โปรแกรม"],
        Customer: values["Customer"],
        หมายเหตุ: "เพิ่มชื่อ",
        "วันที่ลงทะเบียน": dateStr,
        เวลาลงทะเบียน: timeStr,
      });

      if (!result.ok) {
        setStatus({ msg: result.message || "บันทึกไม่สำเร็จ", ok: false });
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setStatus({
        msg: err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <div className="modal-header">
          <h3>
            <UserPlus size={18} />
            เพิ่มรายชื่อ
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            {/* Auto fields */}
            <div className="modal-field">
              <label>HN</label>
              <span className="modal-span">xxxxxxx (สร้างอัตโนมัติ)</span>
            </div>
            <div className="modal-field">
              <label>ลำดับลงทะเบียน</label>
              <span className="modal-span">— รันจากระบบ —</span>
            </div>
            <div className="modal-field">
              <label>วันที่ลงทะเบียน</label>
              <span className="modal-span">{dateStr}</span>
            </div>
            <div className="modal-field">
              <label>เวลาลงทะเบียน</label>
              <span className="modal-span">{timeStr}</span>
            </div>

            {/* Name (full-width) */}
            <div className="modal-field modal-full">
              <label>
                ชื่อ นามสกุล <span className="required">*</span>
              </label>
              <input
                value={values["ชื่อ นามสกุล"]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, "ชื่อ นามสกุล": e.target.value }))
                }
                placeholder="ชื่อ นามสกุล"
              />
            </div>

            {/* Other fields */}
            {(
              [
                "รหัสประจำตัว",
                "เลขบัตรประชาชน",
                "แผนก",
                "ตำแหน่ง",
                "ชั้นปี",
                "สาขา",
                "ห้อง",
                "โปรแกรม",
                "Customer",
              ] as ModalField[]
            ).map((field) => (
              <div className="modal-field" key={field}>
                <label>{field}</label>
                <input
                  value={values[field]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field]: e.target.value }))
                  }
                  placeholder="-"
                />
              </div>
            ))}

            <div className="modal-field modal-full">
              <label>หมายเหตุ</label>
              <input value="เพิ่มชื่อ" readOnly />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span
            className="modal-status"
            style={{ color: status?.ok ? "#087d86" : "#c63742" }}
          >
            {status?.msg}
          </span>
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            <XCircle size={15} />
            ยกเลิก
          </button>
          <button
            className="btn-confirm"
            onClick={handleSubmit}
            disabled={loading}
          >
            <CheckCircle size={15} />
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}
