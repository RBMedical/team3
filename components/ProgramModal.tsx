"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, X, Plus, Pencil } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import { ProgramFormModal } from "@/components/ProgramFormModal";
import type { ProgramListResponse, ProgramGroup } from "@/types";

interface ProgramModalProps {
  open: boolean;
  onClose: () => void;
}

type FormState = { mode: "add" } | { mode: "edit"; program: string } | null;

export function ProgramModal({ open, onClose }: ProgramModalProps) {
  const [programs, setPrograms] = useState<ProgramGroup[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);

  useEffect(() => {
    if (open) {
      loadPrograms();
    } else {
      setPrograms([]);
      setSelected("");
    }
  }, [open]);

  async function loadPrograms() {
    setLoading(true);
    try {
      const res = await appScriptRequest<ProgramListResponse>({ action: "getProgramList" });
      if (res.ok) {
        const rows = res.programs || [];
        setPrograms(rows);
        setSelected(rows[0]?.program || "");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const activeItems = programs.find((p) => p.program === selected)?.items || [];

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box--program">
        <div className="modal-header modal-header--program">
          <h3><ClipboardList size={18} />โปรแกรมตรวจ</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="program-add-btn" title="เพิ่มโปรแกรม" onClick={() => setFormState({ mode: "add" })}>
              <Plus size={16} />
            </button>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body modal-body--program">
          {loading ? (
            <div className="program-empty">กำลังโหลด...</div>
          ) : programs.length === 0 ? (
            <div className="program-empty">ยังไม่มีข้อมูลโปรแกรมตรวจ</div>
          ) : (
            <div className="program-layout">
              <div className="program-list">
                {programs.map((p) => (
                  <div
                    key={p.program}
                    className={`program-pill${selected === p.program ? " active" : ""}`}
                    onClick={() => setSelected(p.program)}
                  >
                    <span>{p.program}</span>
                    <button
                      className="program-edit-btn"
                      title="แก้ไข"
                      onClick={(e) => { e.stopPropagation(); setFormState({ mode: "edit", program: p.program }); }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="program-items">
                {activeItems.length === 0 ? (
                  <div className="program-empty">ไม่มีรายการตรวจในโปรแกรมนี้</div>
                ) : (
                  activeItems.map((item, i) => (
                    <div className="program-item-pill" key={i}>{item}</div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ProgramFormModal
        open={!!formState}
        mode={formState?.mode || "add"}
        program={formState?.mode === "edit" ? formState.program : ""}
        onClose={() => setFormState(null)}
        onSaved={() => { setFormState(null); loadPrograms(); }}
      />
    </div>
  );
}
