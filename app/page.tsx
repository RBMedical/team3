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
  const [detailName, setDetailName] = useState("");

  const [exporting, setExporting] = useState(false);

  // ── ดึง Detail A1 ตอน mount ──────────────────────────────────
  React.useEffect(() => {
    appScriptRequest<{ ok: boolean; name?: string }>({ action: "getDetailName" })
      .then(res => { if (res.ok && res.name) setDetailName(res.name); })
      .catch(() => {});
  }, []);

  async function handleExportExcel() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");

      // ── ดึงข้อมูลทั้งหมดพร้อมกัน ────────────────────────────
      const [exportRes, resultRes] = await Promise.all([
        appScriptRequest<{
          ok: boolean;
          folderName?: string;
          followData?: string[][];
          specimenMap?: Record<string, string[][]>;
        }>({ action: "getExportData" }),
        appScriptRequest<{
          ok: boolean;
          dataRows?: string[][];
        }>({ action: "getResultData" }),
      ]);

      if (!exportRes.ok) { alert("โหลดข้อมูลไม่สำเร็จ"); return; }

      // ── ใช้ detailName ที่ดึงมาตั้งแต่แรก ────────────────────
      const folderName = (detailName || exportRes.folderName || "MobileCheckUp").replace(/[\\/:*?"<>|]/g, "_");
      console.log("[Export] folderName:", folderName);

      // ── Helper: detect WebView2 ────────────────────────────────
      const isWebView2 = !!(window as any).__isWebView2__;

      // ── ขอ user เลือก folder (เฉพาะ web browser เท่านั้น) ──────
      let dirHandle: FileSystemDirectoryHandle | null = null;
      if (!isWebView2) {
        try {
          // @ts-ignore
          const rootDir = await window.showDirectoryPicker({ mode: "readwrite", startIn: "desktop" });
          dirHandle = await rootDir.getDirectoryHandle(folderName, { create: true });
        } catch {
          dirHandle = null;
        }
      }

      // Helper: เขียนไฟล์ผ่าน WebView2 bridge (ส่ง base64 ไป C#)
      async function saveViaWebView2(files: { name: string; data: ArrayBuffer }[], folder: string): Promise<string> {
        return new Promise((resolve, reject) => {
          (window as any).__onWebView2Message__ = (result: { ok: boolean; path: string; message: string }) => {
            delete (window as any).__onWebView2Message__;
            if (result.ok) resolve(result.path);
            else reject(new Error(result.message));
          };

          // แปลง ArrayBuffer → base64 แบบ chunk เพื่อป้องกัน call stack overflow
          function arrayBufferToBase64(buffer: ArrayBuffer): string {
            const bytes = new Uint8Array(buffer);
            const chunkSize = 8192;
            let binary = "";
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode(...chunk);
            }
            return btoa(binary);
          }

          const payload = {
            action: "saveFiles",
            folderName: folder,
            files: files.map(f => ({
              name: f.name,
              data: arrayBufferToBase64(f.data),
            })),
          };
          (window as any).saveFileToDesktop(payload);
        });
      }

      // Helper: เขียนไฟล์ — เลือก path ตาม runtime
      async function saveFile(wb: unknown, fileName: string, buf?: ArrayBuffer) {
        const wbTyped = wb as Parameters<typeof XLSX.write>[0];
        const arrBuf: ArrayBuffer = buf ?? XLSX.write(wbTyped, { bookType: "xlsx", type: "array", cellStyles: true });

        if (isWebView2) {
          // ส่งผ่าน C# bridge → บันทึกลง Desktop/folder อัตโนมัติ
          await saveViaWebView2([{ name: fileName, data: arrBuf }], folderName);
        } else if (dirHandle) {
          // File System Access API (Chrome/Edge บน web)
          // @ts-ignore
          const fh = await dirHandle.getFileHandle(fileName, { create: true });
          // @ts-ignore
          const w = await fh.createWritable();
          await w.write(arrBuf);
          await w.close();
        } else {
          // fallback: download ปกติ
          XLSX.writeFile(wbTyped, fileName, { cellStyles: true });
        }
      }

      // ═══════════════════════════════════════════════════════
      //  FILE 1 — MobileCheckUp.xlsx (เหมือนเดิม)
      // ═══════════════════════════════════════════════════════
      const wb1 = XLSX.utils.book_new();

      if (exportRes.followData && exportRes.followData.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet(exportRes.followData);
        const colWidths = exportRes.followData[0].map((_: string, ci: number) => {
          const maxLen = exportRes.followData!.reduce((max: number, row: string[]) => {
            return Math.max(max, String(row[ci] || "").length);
          }, 0);
          return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
        });
        ws["!cols"] = colWidths;
        exportRes.followData.forEach((row: string[], ri: number) => {
          row.forEach((_cell: string, ci: number) => {
            if (ci < 2) return;
            const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
            if (ws[addr]) ws[addr].s = { alignment: { horizontal: "center", vertical: "center" } };
          });
        });
        XLSX.utils.book_append_sheet(wb1, ws, "Report");
      }

      if (exportRes.specimenMap) {
        Object.entries(exportRes.specimenMap).forEach(([specName, rows]) => {
          const data: string[][] = [["HN", "ชื่อ นามสกุล"], ...rows];
          const ws = XLSX.utils.aoa_to_sheet(data);
          ws["!cols"] = [{ wch: 15 }, { wch: 40 }];
          const headerS = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "D9EAF7" } } };
          data.forEach((row, ri) => {
            row.forEach((_c, ci) => {
              const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
              if (!ws[addr]) return;
              ws[addr].s = ri === 0 ? headerS : ci === 0 ? { alignment: { horizontal: "center", vertical: "center" } } : { alignment: { horizontal: "left", vertical: "center" } };
            });
          });
          XLSX.utils.book_append_sheet(wb1, ws, specName.replace(/[/\?*[\]:]/g, "").slice(0, 31));
        });
      }

      const buf1: ArrayBuffer = XLSX.write(wb1, { bookType: "xlsx", type: "array", cellStyles: true });
      await saveFile(wb1, "MobileCheckUp.xlsx", buf1);

      // ═══════════════════════════════════════════════════════
      //  FILE 2 — Result.xlsx (sheets ตาม spec + ดึงข้อมูลจาก Data)
      // ═══════════════════════════════════════════════════════
      const RESULT_SHEETS: Record<string, string[]> = {
        "BMI":          ["HN","ชื่อ-นามสกุล","อายุ","รหัสพนักงาน","Department","น้ำหนัก","ส่วนสูง","ดัชนีมวลกาย","ความดันโลหิตบน","ความดันโลหิตตัวล่าง","ชีพจร","Description","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "XRay":         ["HN","ชื่อ-นามสกุล","อายุ","รหัสพนักงาน","Department","เอกซเรย์ดิจิตอล","สรุปผลการตรวจ เอกซเรย์","แพทย์ผู้อ่านผลเอกซ์เรย์ปอด","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Urine":        ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Bilirubin","SP.GR.","Leukocyte","Urobilinogen","Nitrite","COLOR","APPEAR","BLOOD(URINE)","KETONE(URINE)","GLUCOSE(URINE)","PROTEIN(URINE)","pH(URINE)","RBC(URINE)","WBC(URINE)","EPITHELIUM CELL (URINE)","BACTERIA(URINE)","Description","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "CBC":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","WBC count","RBC count","Hb","Hct","Plt count","PLT smear","Neutrophil","Lymphocyte","Monocyte","Eosinophil","Basophil","Description","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "FBS":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","results","summary","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Chol":         ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "HDL":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "LDL":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Trigy":        ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "BUN":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Creatinin":    ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "eGFR":         ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "SGPT":         ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "SGOT":         ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Alk":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Uric":         ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","Results","Summary","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "EKG":          ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","ผลตรวจ","สรุปผลการตรวจ","แพทย์ผู้อ่านผล","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Audiogram":    ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","หูซ้าย 500 Hz.","หูซ้าย 1000 Hz.","หูซ้าย 2000 Hz.","หูซ้าย 3000 Hz.","หูซ้าย 4000 Hz.","หูซ้าย 6000 Hz.","หูซ้าย 8000 Hz.","หูขวา 500 Hz.","หูขวา 1000 Hz.","หูขวา 2000 Hz.","หูขวา 3000 Hz.","หูขวา 4000 Hz.","หูขวา 6000 Hz.","หูขวา 8000 Hz.","สรุปการตรวจหู","Customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Eyes":         ["HN","ชื่อ-นามสกุล","รหัสพนักงาน","Department","อายุ","มองระยะใกล้","มองระยะไกล","มองภาพ3มิติ","การแยกสี","สมดุลกล้ามเนื้อตาแนวตั้ง","สมดุลกล้ามเนื้อตาแนวนอน","ลานสายตา","สรุป","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Spirometry":   ["HN","ชื่อ-นามสกุล","อายุ","Department","รหัสพนักงาน","FVC","FEV1","FEV1/FVC","result","summary","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Muscle(L/B)":  ["HN","ชื่อ-นามสกุล","รหัสพนักงาน","Department","อายุ","เพศ","น้ำหนัก","หลัง/ค่าทดสอบ","หลัง/ค่าแปรผล","หลัง/ผลตรวจ","หลัง/ระดับ","ขา/ค่าทดสอบ","ขา/ค่าแปรผล","ขา/ผลตรวจ","ขา/ระดับ","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
        "Muscle(H)":    ["HN","ชื่อ-นามสกุล","รหัสพนักงาน","Department","อายุ","เพศ","น้ำหนัก","ขวา/ค่าทดสอบ","ขวา/ค่าแปรผล","ขวา/ผลตรวจ","ขวา/ระดับ","ซ้าย/ค่าทดสอบ","ซ้าย/ค่าแปรผล","ซ้าย/ผลตรวจ","ซ้าย/ระดับ","customer","ชั้นปี","แผนก","สาขา","ห้อง"],
      };

      // ดึงข้อมูลจาก Sheet "Data": colA→A, colB→B, colC→C, colE→D
      const dataRows: string[][] = (resultRes?.ok && resultRes.dataRows) ? resultRes.dataRows : [];

      const wb2 = XLSX.utils.book_new();
      const headerStyle2 = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0C6075" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      Object.entries(RESULT_SHEETS).forEach(([sheetName, headers]) => {
        // dataRows จาก API มี 4 ช่อง: [0]=colA, [1]=colB, [2]=colC, [3]=colE
        const data: string[][] = [
          headers,
          ...dataRows.map(r => [
            String(r[0] || ""), // col A (HN)
            String(r[1] || ""), // col B (ชื่อ)
            String(r[2] || ""), // col C (อายุ)
            String(r[3] || ""), // col E → วางใน col D
            ...Array(Math.max(0, headers.length - 4)).fill(""),
          ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);

        // auto col width
        ws["!cols"] = headers.map((h, ci) => {
          const maxLen = data.reduce((max, row) => Math.max(max, String(row[ci] || "").length), h.length);
          return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
        });

        // header style
        headers.forEach((_h, ci) => {
          const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
          if (ws[addr]) ws[addr].s = headerStyle2;
        });

        const safeName = sheetName.replace(/[/\?*[\]:]/g, "").slice(0, 31);
        XLSX.utils.book_append_sheet(wb2, ws, safeName);
      });

      const buf2: ArrayBuffer = XLSX.write(wb2, { bookType: "xlsx", type: "array", cellStyles: true });
      await saveFile(wb2, "Result.xlsx", buf2);

      alert(isWebView2 || dirHandle
        ? `✅ บันทึกสำเร็จในโฟลเดอร์ "${folderName}" บน Desktop\n• MobileCheckUp.xlsx\n• Result.xlsx`
        : `✅ ดาวน์โหลดสำเร็จ\n• MobileCheckUp.xlsx\n• Result.xlsx`
      );

    } catch (err) {
      console.error("Export error:", err);
      alert("Export ไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)));
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
          <div style={{ flex: 1 }} />
        
          <button
            className={`menu-item${activePage === "report" ? " active" : ""}`}
            onClick={() => handleNav("report")}
          >
            <ChartNoAxesCombined size={16} />
            <span>รายงาน/ติดตาม</span>
          </button>
            <button
            className="menu-item"
            onClick={handleExportExcel}
            disabled={exporting}
            style={{ opacity: exporting ? 0.6 : 1, borderTop: "1px solid var(--line)", marginTop: 4 }}
          >
            <Download size={16} />
            <span>{exporting ? "กำลัง Export..." : "Export Excel"}</span>
          </button>
        </nav>

        <div className="sidebar-art">
          <Activity size={32} />
          <Hospital size={32} />
        </div>
      </aside>

      {/* App Shell */}
      <main className="app-shell">
        <header className="page-header">
          <div>
            <h1>ระบบลงทะเบียน(Team 2)</h1>
            <p>{detailName ? ` · ${detailName}` : ""}</p>
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
