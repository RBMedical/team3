"use client";

import React, { useState, useEffect } from "react";
import { Save, X, Trash2 } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { TestSheetRowsResponse, ProgramItemsDetailResponse, TestSheetRow, ProgramItemDetail } from "@/types";

interface ProgramFormModalProps {
  open: boolean;
  mode: "add" | "edit";
  program?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ProgramFormModal({ open, mode, program = "", onClose, onSaved }: ProgramFormModalProps) {
  const [programName, setProgramName] = useState("");
  const [testRows, setTestRows] = useState<TestSheetRow[]>([]);
  const [currentItems, setCurrentItems] = useState<ProgramItemDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProgramName(mode === "edit" ? program : "");
      loadData();
    } else {
      setTestRows([]);
      setCurrentItems([]);
      setProgramName("");
    }
  }, [open, mode, program]);

  async function loadData() {
    setLoading(true);
    try {
      if (mode === "edit") {
        const [testRes, itemsRes] = await Promise.all([
          appScriptRequest<TestSheetRowsResponse>({ action: "getTestSheetRows" }),
          appScriptRequest<ProgramItemsDetailResponse>({ action: "getProgramItemsDetail", program }),
        ]);
        if (testRes.ok) setTestRows(testRes.rows || []);
        if (itemsRes.ok) setCurrentItems(itemsRes.items || []);
      } else {
        const testRes = await appScriptRequest<TestSheetRowsResponse>({ action: "getTestSheetRows" });
        if (testRes.ok) setTestRows(testRes.rows || []);
        setCurrentItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function addItem(row: TestSheetRow) {
    setCurrentItems((prev) => [
      ...prev,
      { name: row.name, method: row.method, specimenCode: row.specimenCode, station: row.station },
    ]);
  }

  function removeItem(index: number) {
    setCurrentItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const finalProgramName = mode === "edit" ? program.trim() : programName.trim();
    if (!finalProgramName) {
      toast({ title: "กรุณาระบุชื่อโปรแกรม", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await appScriptRequest<{ ok: boolean; message?: string }>({
        action: "saveProgramItems",
        program: finalProgramName,
        items: JSON.stringify(currentItems),
      });
      if (!res.ok) {
        toast({ title: res.message || "บันทึกไม่สำเร็จ", variant: "destructive" });
        return;
      }
      toast({ title: "บันทึกโปรแกรมตรวจเรียบร้อย", variant: "success" });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const saveDisabled = saving || (mode === "add" && !programName.trim());

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box--program">
        <div className="modal-header modal-header--program">
          <h3>
            โปรแกรม
            {mode === "edit" ? (
              <span className="program-name-tag">{program}</span>
            ) : (
              <input
                className="program-name-input"
                placeholder="ระบุชื่อโปรแกรมใหม่"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                autoFocus
              />
            )}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="program-save-btn" title="บันทึก" onClick={handleSave} disabled={saveDisabled}>
              <Save size={15} />
            </button>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body modal-body--program">
          {loading ? (
            <div className="program-empty">กำลังโหลด...</div>
          ) : (
            <div className="program-layout">
              <div className="program-edit-current">
                {currentItems.length === 0 ? (
                  <div className="program-empty">ยังไม่มีรายการตรวจในโปรแกรมนี้</div>
                ) : (
                  currentItems.map((item, i) => (
                    <div className="program-edit-item" key={i}>
                      <span>{item.name}</span>
                      <button className="program-edit-remove-btn" onClick={() => removeItem(i)} title="ลบ">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="program-edit-source">
                {testRows.length === 0 ? (
                  <div className="program-empty">ไม่พบข้อมูลใน sheet Test</div>
                ) : (
                  testRows.map((row, i) => (
                    <button className="program-edit-source-item" key={i} onClick={() => addItem(row)}>
                      {row.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
