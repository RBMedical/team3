"use client";

import React, { useState } from "react";
import {
  Cross, ClipboardPlus, TestTube2, ChartNoAxesCombined, Activity, Hospital,
} from "lucide-react";
import { RegistrationPage } from "@/components/RegistrationPage";
import { ReportPage } from "@/components/ReportPage";
import { SpecimenModal } from "@/components/SpecimenModal";

type Page = "registration" | "report";

export default function Home() {
  const [activePage, setActivePage] = useState<Page>("registration");
  const [specimenOpen, setSpecimenOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState("พร้อมใช้งาน");
  const [statusOk, setStatusOk] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  function handleNav(page: string) {
    if (page === "specimen") {
      setSpecimenOpen(true);
    } else {
      setActivePage(page as Page);
    }
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
            className={`menu-item${activePage === "report" ? " active" : ""}`}
            onClick={() => handleNav("report")}
          >
            <ChartNoAxesCombined size={16} />
            <span>รายงาน/ติดตาม</span>
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
            <h1>ระบบลงทะเบียน</h1>
            <p>Team 3</p>
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
          <RegistrationPage onCountsUpdate={setCounts} />
        </section>

        {/* Report Page */}
        <section className={`workspace page${activePage === "report" ? " active" : ""}`} id="reportPage"
          style={{ display: activePage === "report" ? "block" : "none", flex: 1, minHeight: 0 }}>
          <ReportPage />
        </section>
      </main>

      {/* Specimen Modal */}
      <SpecimenModal
        open={specimenOpen}
        onClose={() => setSpecimenOpen(false)}
        onCountsUpdate={setCounts}
      />
    </>
  );
}
