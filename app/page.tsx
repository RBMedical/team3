"use client";

import React, { useState } from "react";
import {
  Cross, ClipboardPlus, TestTube2, ChartNoAxesCombined, Activity, Hospital, User, Download,
} from "lucide-react";
import { RegistrationPage } from "@/components/RegistrationPage";
import { appScriptRequest } from "@/lib/api";
import { ReportPage } from "@/components/ReportPage";
import { SpecimenModal } from "@/components/SpecimenModal";
import { PersonalDetailModal } from "@/components/PersonalDetailModal";

type Page = "registration" | "report";

export default function Home() {
  const [activePage, setActivePage] = useState<Page>("registration");
  const [specimenOpen, setSpecimenOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [personalHn, setPersonalHn] = useState("");
  const [statusMsg, setStatusMsg] = useState("พร้อมใช้งาน");
  const [statusOk, setStatusOk] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [exporting, setExporting] = useState(false);

  async function handleExportExcel() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const result = await appScriptRequest<{
        ok: boolean;
        followData?: string[][];
        specimenMap?: Record<string, string[][]>;
      }>({ action: "getExportData" });

      if (!result.ok) return;

      const wb = XLSX.utils.book_new();

      // ── Sheet 1: Report — copy format จาก follow ──────────
      if (result.followData && result.followData.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet(result.followData);

        // กำหนดความกว้าง column อัตโนมัติตามเนื้อหา
        const colWidths = result.followData[0].map((_: string, ci: number) => {
          const maxLen = result.followData!.reduce((max: number, row: string[]) => {
            const cellLen = String(row[ci] || "").length;
            return Math.max(max, cellLen);
          }, 0);
          return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
        });
        ws["!cols"] = colWidths;

        // col C เป็นต้นไป (index >= 2) — center
        result.followData.forEach((row: string[], ri: number) => {
          row.forEach((_cell: string, ci: number) => {
            if (ci < 2) return;
            const cellAddr = XLSX.utils.encode_cell({ r: ri, c: ci });
            if (!ws[cellAddr]) return;
            ws[cellAddr].s = { alignment: { horizontal: "center", vertical: "center" } };
          });
        });

        XLSX.utils.book_append_sheet(wb, ws, "Report");
      }

      // ── Sheets ต่อไป: แต่ละ Specimen ─────────────────────
      if (result.specimenMap) {
        Object.entries(result.specimenMap).forEach(([specName, rows]) => {
          const data: string[][] = [["HN", "ชื่อ นามสกุล"], ...rows];
          const ws = XLSX.utils.aoa_to_sheet(data);

          // กำหนดความกว้าง col A=15, col B=40
          ws["!cols"] = [{ wch: 15 }, { wch: 40 }];

          // Style หัว row (row 0) — center
          const headerStyle = {
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "D9EAF7" } },
          };
          // Style col A — center
          const colAStyle = { alignment: { horizontal: "center", vertical: "center" } };
          // Style col B — left
          const colBStyle = { alignment: { horizontal: "left", vertical: "center" } };

          // Apply styles ทุก cell
          data.forEach((row, ri) => {
            row.forEach((_cell, ci) => {
              const cellAddr = XLSX.utils.encode_cell({ r: ri, c: ci });
              if (!ws[cellAddr]) return;
              if (ri === 0) {
                ws[cellAddr].s = headerStyle;
              } else if (ci === 0) {
                ws[cellAddr].s = colAStyle;
              } else {
                ws[cellAddr].s = colBStyle;
              }
            });
          });

          const safeName = specName.replace(/[/\?*[\]:]/g, "").slice(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        });
      }

      // Download
      XLSX.writeFile(wb, "Data.xlsx", { cellStyles: true });
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  }

  function handleNav(page: string) {
    if (page === "specimen") {
      setSpecimenOpen(true);
    } else if (page === "personal") {
      // เปิด Personal โดยใช้ HN จาก search ถ้ามี
      setPersonalOpen(true);
    } else {
      setActivePage(page as Page);
    }
  }

  function openPersonalByHn(hn: string) {
    setPersonalHn(hn);
    setPersonalOpen(true);
  }

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Cross size={20} />
          </div>
          <div>
            <strong>Check Up</strong>
            <span>Flow System</span>
          </div>
        </div>

        <nav className="menu">
          <button
            className={`menu-item${activePage === "registration" ? " active" : ""}`}
            onClick={() => handleNav("registration")}
          >
            <ClipboardPlus size={16} />
            <span>ลงทะเบียน</span>
          </button>
          <button
            className="menu-item"
            onClick={() => handleNav("specimen")}
          >
            <TestTube2 size={16} />
            <span>นับสิ่งตรวจ</span>
          </button>
          <button
            className="menu-item"
            onClick={() => handleNav("personal")}
          >
            <User size={16} />
            <span>Personal</span>
          </button>

          {/* Export button — ล่างสุดของ sidebar */}
         
          <button
            className={`menu-item${activePage === "report" ? " active" : ""}`}
            onClick={() => handleNav("report")}
          >
            <ChartNoAxesCombined size={16} />
            <span>รายงาน/ติดตาม</span>
          </button>
        </nav>
         <div style={{ flex: 1 }} />
          <button
            className="menu-item"
            onClick={handleExportExcel}
            disabled={exporting}
            style={{ opacity: exporting ? 0.6 : 1, borderTop: "1px solid var(--line)", marginTop: 4 }}
          >
            <Download size={16} />
            <span>{exporting ? "กำลัง Export..." : "Export Excel"}</span>
          </button>
        <div className="sidebar-art">
          <Activity size={32} />
          <Hospital size={32} />
        </div>
      </aside>

      {/* App Shell */}
      <main className="app-shell">
        <header className="page-header">
          <div>
            <h1>ระบบลงทะเบียน</h1>
            <p>Team 1</p>
          </div>
          <div
            className="status-pill"
            style={{ color: statusOk ? "#087d86" : "#c63742", borderColor: statusOk ? "#bee1e8" : "#ffc3c7" }}
          >
            {statusMsg}
          </div>
        </header>

        {/* Registration Page */}
        <section className={`workspace page${activePage === "registration" ? " active" : ""}`} id="registrationPage">
          <RegistrationPage onCountsUpdate={setCounts} onOpenPersonal={openPersonalByHn} />
        </section>

        {/* Report Page */}
        <section className={`workspace page${activePage === "report" ? " active" : ""}`} id="reportPage"
          style={{ display: activePage === "report" ? "block" : "none", flex: 1, minHeight: 0 }}>
          <ReportPage />
        </section>
      </main>

      {/* Personal Detail Modal */}
      <PersonalDetailModal
        open={personalOpen}
        initialHn={personalHn}
        onClose={() => setPersonalOpen(false)}
      />

      {/* Specimen Modal */}
      <SpecimenModal
        open={specimenOpen}
        onClose={() => setSpecimenOpen(false)}
        onCountsUpdate={setCounts}
      />
    </>
  );
}
