"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Banknote, RefreshCw, Printer, X, Receipt, AlertTriangle, FileText } from "lucide-react";
import { appScriptRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/* ─── Types ─────────────────────────────────────────────── */
interface FinanceLineItem {
  name: string;
  price: number;
}

interface FinanceItem {
  seq: number;
  hn: string;
  name: string;
  date: string;
  amount: number;
  items: FinanceLineItem[];
  receiptNo: string;
  status: string; // "รอชำระ" | "สำเร็จ" | "ยกเลิก"
}

/* ─── Helpers ───────────────────────────────────────────── */
const fmt = (n: number) =>
  Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayThai = () =>
  new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });

const thaiLongDate = () =>
  new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* ─── แปลงจำนวนเงินเป็นข้อความภาษาไทย (บาทถ้วน / สตางค์) ── */
function bahtText(amount: number): string {
  const num = Math.abs(Number(amount) || 0);
  const baht = Math.floor(num);
  const satang = Math.round((num - baht) * 100);

  const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function readGroup(numStr: string): string {
    // อ่านเลขไม่เกิน 7 หลัก (รองรับหลักล้าน)
    let result = "";
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const d = parseInt(numStr[i], 10);
      const place = len - i - 1;
      if (d === 0) continue;
      if (place === 0 && d === 1 && len > 1) {
        result += "เอ็ด";
      } else if (place === 1 && d === 2) {
        result += "ยี่" + places[place];
      } else if (place === 1 && d === 1) {
        result += places[place];
      } else {
        result += digits[d] + places[place];
      }
    }
    return result;
  }

  function readNumber(n: number): string {
    if (n === 0) return "";
    const s = String(n);
    // แยกเป็นกลุ่มละ 6 หลัก (หลักล้าน)
    if (s.length > 6) {
      const millions = Math.floor(n / 1000000);
      const remainder = n % 1000000;
      let txt = readNumber(millions) + "ล้าน";
      if (remainder > 0) txt += readGroup(String(remainder));
      return txt;
    }
    return readGroup(s);
  }

  let text = "";
  if (baht === 0 && satang === 0) {
    text = "ศูนย์บาทถ้วน";
  } else {
    if (baht > 0) text += readNumber(baht) + "บาท";
    if (satang > 0) {
      text += readNumber(satang) + "สตางค์";
    } else if (baht > 0) {
      text += "ถ้วน";
    }
  }
  return "(" + text + ")";
}

/* ─── Receipt print HTML (A4 landscape, ต้นฉบับ + สำเนา) ── */
function buildReceiptHtml(item: FinanceItem, receiptNo: string, dateStr: string, orgName: string) {
  const rowsHtml = item.items
    .map(
      (it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${it.name}</td>
        <td class="r">${fmt(it.price)}</td>
      </tr>`
    )
    .join("");

  const half = (label: string) => `
    <div class="half">
      <div class="rc-head">
        <div class="rc-org">${orgName || "Check Up Flow System"}</div>
        <div class="rc-title">ใบเสร็จรับเงิน <span class="en">RECEIPT</span></div>
        <div class="rc-copy">${label}</div>
      </div>
      <div class="rc-meta">
        <div><span>เลขที่ใบเสร็จ:</span> <b>${receiptNo}</b></div>
        <div><span>วันที่:</span> <b>${dateStr}</b></div>
        <div><span>HN:</span> <b>${item.hn}</b></div>
        <div><span>ชื่อ นามสกุล:</span> <b>${item.name}</b></div>
      </div>
      <table class="rc-table">
        <thead>
          <tr><th style="width:9%">ลำดับ</th><th>รายการตรวจ</th><th style="width:22%">จำนวนเงิน (บาท)</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="r total-label">
              ยอดชำระสุทธิ
              <span class="baht-text">${bahtText(item.amount)}</span>
            </td>
            <td class="r total-val">${fmt(item.amount)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="rc-spacer"></div>
      <div class="rc-sign">
        <div class="sign-box">
          <div class="sign-line"></div>
          <div>ผู้รับเงิน</div>
        </div>
        <div class="sign-box">
          <div class="sign-line"></div>
          <div>ผู้ชำระเงิน</div>
        </div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { font-family: 'Sarabun', sans-serif; color: #1a2d3e; }
  .sheet { display: flex; width: 100%; height: 194mm; }
  .half { width: 50%; padding: 6mm 8mm; display: flex; flex-direction: column; height: 100%; }
  .half + .half { border-left: 1.5px dashed #999; }
  .rc-head { text-align: center; margin-bottom: 8mm; position: relative; flex-shrink: 0; }
  .rc-org { font-size: 15px; font-weight: 800; color: #0c6075; }
  .rc-title { font-size: 13px; font-weight: 700; margin-top: 1mm; }
  .rc-title .en { font-weight: 400; color: #667789; font-size: 11px; }
  .rc-copy { position: absolute; top: 0; right: 0; font-size: 10px; font-weight: 700;
             border: 1px solid #0c6075; color: #0c6075; border-radius: 4px; padding: 1px 8px; }
  .rc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm 6mm;
             font-size: 11px; margin-bottom: 8mm; flex-shrink: 0; }
  .rc-meta span { color: #667789; }
  .rc-table { width: 100%; border-collapse: collapse; font-size: 11px; flex-shrink: 0; }
  .rc-table th { background: #0c6075; color: #fff; padding: 2mm; font-weight: 700;
                 border: 0.5px solid #0c6075; }
  .rc-table td { padding: 1.8mm 2mm; border: 0.5px solid #b8c8d4; }
  .rc-table .c { text-align: center; }
  .rc-table .r { text-align: right; }
  .total-label { font-weight: 700; background: #eef6f8; }
  .total-label .baht-text { display: block; font-weight: 600; font-size: 10px;
                            color: #0c6075; margin-top: 1mm; }
  .total-val { font-weight: 800; font-size: 13px; background: #eef6f8; color: #0c6075;
               vertical-align: top; }
  .rc-spacer { flex: 1 1 auto; min-height: 8mm; }
  .rc-sign { display: flex; justify-content: space-around; font-size: 11px;
             flex-shrink: 0; padding-bottom: 4mm; }
  .sign-box { text-align: center; width: 38%; }
  .sign-line { border-bottom: 1px dotted #667789; margin-bottom: 2mm; height: 10mm; }
</style>
</head>
<body>
  <div class="sheet">
    ${half("ต้นฉบับ")}
    ${half("สำเนา")}
  </div>
</body>
</html>`;
}

/* ─── Component ─────────────────────────────────────────── */
interface Props {
  orgName?: string;
}

export function FinancePage({ orgName = "" }: Props) {
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Payment modal
  const [payItem, setPayItem] = useState<FinanceItem | null>(null);
  const [previewNo, setPreviewNo] = useState("");
  const [printing, setPrinting] = useState(false);

  // Cancel dialog
  const [cancelItem, setCancelItem] = useState<FinanceItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Report print
  const [reportPrinting, setReportPrinting] = useState(false);

  /* ── Load list ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appScriptRequest<{ ok: boolean; items?: FinanceItem[] }>({
        action: "getFinanceItems",
      });
      if (res.ok) setItems(res.items || []);
    } catch {
      toast({ title: "โหลดข้อมูลไม่สำเร็จ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Open payment modal + fetch next receipt no ── */
  async function openPay(item: FinanceItem) {
    setPayItem(item);
    setPreviewNo("...");
    try {
      const res = await appScriptRequest<{ ok: boolean; receiptNo?: string }>({
        action: "getNextReceiptNo",
      });
      setPreviewNo(res.ok && res.receiptNo ? res.receiptNo : "");
    } catch {
      setPreviewNo("");
    }
  }

  /* ── Print (hidden iframe → A4 landscape) → save → reload ── */
  async function doPrint() {
    if (!payItem || !previewNo || previewNo === "...") return;
    setPrinting(true);

    const dateStr = todayThai();
    const html = buildReceiptHtml(payItem, previewNo, dateStr, orgName);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(html);
    doc.close();

    // รอ font/render แล้วสั่งพิมพ์
    await new Promise((r) => setTimeout(r, 500));
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();

    // หลัง print dialog — บันทึกลง Recieve
    setTimeout(async () => {
      document.body.removeChild(iframe);
      try {
        const res = await appScriptRequest<{ ok: boolean; receiptNo?: string; message?: string }>({
          action: "payReceipt",
          receiptNo: previewNo,
          hn: payItem.hn,
          name: payItem.name,
          amount: payItem.amount,
        });
        if (res.ok) {
          toast({ title: `ชำระเงินสำเร็จ · ใบเสร็จ ${res.receiptNo}`, variant: "success" });
          setPayItem(null);
          load();
        } else {
          toast({ title: res.message || "บันทึกไม่สำเร็จ", variant: "destructive" });
        }
      } catch {
        toast({ title: "เชื่อมต่อไม่สำเร็จ", variant: "destructive" });
      } finally {
        setPrinting(false);
      }
    }, 700);
  }

  /* ── Cancel receipt ── */
  async function confirmCancel() {
    if (!cancelItem) return;
    setCancelling(true);
    try {
      const res = await appScriptRequest<{ ok: boolean; message?: string }>({
        action: "cancelReceipt",
        receiptNo: cancelItem.receiptNo,
        hn: cancelItem.hn,
        name: cancelItem.name,
        amount: cancelItem.amount,
      });
      if (res.ok) {
        toast({ title: `ยกเลิกใบเสร็จ ${cancelItem.receiptNo} แล้ว`, variant: "success" });
        load();
      } else {
        toast({ title: res.message || "ยกเลิกไม่สำเร็จ", variant: "destructive" });
      }
    } catch {
      toast({ title: "เชื่อมต่อไม่สำเร็จ", variant: "destructive" });
    } finally {
      setCancelling(false);
      setCancelItem(null);
    }
  }

  /* ── Print report (A4 portrait) from Recieve sheet ── */
  async function printReport() {
    if (reportPrinting) return;
    setReportPrinting(true);
    try {
      const res = await appScriptRequest<{
        ok: boolean;
        customer?: string;
        rows?: { receiptNo: string; hn: string; name: string; amount: number; status: string }[];
        netTotal?: number;
        cancelledCount?: number;
      }>({ action: "getReceiveReport" });

      if (!res.ok) {
        toast({ title: "โหลดข้อมูลรายงานไม่สำเร็จ", variant: "destructive" });
        return;
      }

      const rows = res.rows || [];
      const rowsHtml = rows.length
        ? rows.map(r => `
            <tr>
              <td class="c">${r.receiptNo || "-"}</td>
              <td class="c">${r.hn || "-"}</td>
              <td>${r.name || "-"}</td>
              <td class="r">${fmt(r.amount)}</td>
              <td class="c">${r.status || "-"}</td>
            </tr>`).join("")
        : `<tr><td colspan="5" class="empty">ไม่มีข้อมูล</td></tr>`;

      const reportHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', sans-serif; color: #1a2d3e; }
  .rp-title { font-size: 16px; font-weight: 800; }
  .rp-cust { font-size: 13px; font-weight: 600; color: #333; margin-top: 2mm; }
  .rp-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10mm; }
  .rp-table th { background: #eef1f4; color: #333; padding: 2.5mm 2mm; font-weight: 700;
                 border: 0.5px solid #9aa8b5; }
  .rp-table td { padding: 2.5mm 2mm; border: 0.5px solid #b0bdc8; }
  .rp-table .c { text-align: center; }
  .rp-table .r { text-align: right; }
  .rp-table .empty { text-align: center; color: #999; padding: 8mm; }
  .rp-summary { margin-top: 16mm; font-size: 13px; line-height: 2.2; }
  .rp-summary .lbl { display: inline-block; min-width: 48mm; }
  .rp-summary .unit { margin-left: 4mm; color: #555; }
  .rp-sign { margin-top: 24mm; font-size: 13px; }
</style></head>
<body>
  <div class="rp-title">รายงานยอดขายวันที่ ${thaiLongDate()}</div>
  <div class="rp-cust">${res.customer || "-"}</div>
  <table class="rp-table">
    <thead>
      <tr>
        <th style="width:20%">เลขที่ใบเสร็จ</th>
        <th style="width:15%">HN</th>
        <th>ชื่อ นามสกุล</th>
        <th style="width:16%">ยอดชำระ</th>
        <th style="width:14%">สถานะ</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="rp-summary">
    <div><span class="lbl">ยอดขายสุทธิ</span> <b>${fmt(res.netTotal || 0)}</b> <span class="unit">บาท</span></div>
    <div><span class="lbl">ยกเลิกใบเสร็จจำนวน</span> <b>${res.cancelledCount || 0}</b> <span class="unit">บิล</span></div>
  </div>
  <div class="rp-sign">ลงชื่อ .....................................ผู้รับผิดชอบ / หัวหน้าหน่วย</div>
</body></html>`;

      // พิมพ์ผ่าน hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow!.document;
      doc.open(); doc.write(reportHtml); doc.close();

      let fired = false;
      const firePrint = () => {
        try { iframe.contentWindow!.focus(); iframe.contentWindow!.print(); } catch {}
      };
      iframe.onload = () => { if (!fired) { fired = true; firePrint(); } };
      setTimeout(() => { if (!fired) { fired = true; firePrint(); } }, 500);
      setTimeout(() => { document.body.removeChild(iframe); }, 1200);
    } catch {
      toast({ title: "เชื่อมต่อไม่สำเร็จ", variant: "destructive" });
    } finally {
      setReportPrinting(false);
    }
  }

  /* ── Status badge ── */
  function statusBadge(status: string) {
    const map: Record<string, { bg: string; bd: string; color: string }> = {
      "รอชำระ": { bg: "#fffbeb", bd: "#f5e0a0", color: "#92680a" },
      "สำเร็จ": { bg: "#f0faf5", bd: "#b2e8d4", color: "#0f7a56" },
      "ยกเลิก": { bg: "#f3f4f6", bd: "#d4d8dd", color: "#7a8595" },
    };
    const s = map[status] || map["รอชำระ"];
    return (
      <span style={{
        fontSize: "0.66rem", fontWeight: 700, padding: "2px 10px", borderRadius: 999,
        background: s.bg, border: `1px solid ${s.bd}`, color: s.color, whiteSpace: "nowrap",
      }}>
        {status}
      </span>
    );
  }

  /* ── UI ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: 8 }}>

      {/* ── Table card ── */}
      <div style={{
        background: "#fff", border: "1px solid #e4eaef", borderRadius: 12,
        boxShadow: "0 1px 4px rgba(10,40,60,0.05)",
        display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "9px 14px", borderBottom: "1px solid #e4eaef", background: "#f5f8fb",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <Banknote size={16} color="#0c6075" />
          <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1a2d3e" }}>
            รายการชำระเงิน
          </span>
          <span style={{
            fontSize: "0.62rem", fontWeight: 700, background: "#0c6075", color: "#fff",
            padding: "1px 9px", borderRadius: 999,
          }}>
            {items.length} รายการ
          </span>
          <button
            onClick={printReport}
            disabled={reportPrinting}
            title="พิมพ์รายงานยอดขาย"
            style={{
              marginLeft: "auto", height: 26, padding: "0 10px", borderRadius: 6,
              border: "1px solid #0c6075", background: "#0c6075", color: "#fff",
              cursor: reportPrinting ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 5,
              fontSize: "0.68rem", fontWeight: 700,
            }}
          >
            <FileText size={12} />{reportPrinting ? "กำลังพิมพ์..." : "รายงาน"}
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{
              height: 26, padding: "0 10px", borderRadius: 6,
              border: "1px solid #cfd9e5", background: "#fff", color: "#667789",
              cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 5,
              fontSize: "0.68rem", fontWeight: 600,
            }}
          >
            <RefreshCw size={12} style={loading ? { animation: "spin 1s linear infinite" } : undefined} />
            รีเฟรช
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col style={{ width: 90 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr>
                {["ลำดับ", "HN", "ชื่อ นามสกุล", "ยอดชำระ", "เลขที่ใบเสร็จ", "สถานะ", ""].map((h, i) => (
                  <th key={i} style={{
                    position: "sticky", top: 0, zIndex: 1,
                    padding: "7px 8px", fontSize: "0.68rem", fontWeight: 700,
                    color: "#fff", background: "#0c6075",
                    textAlign: i === 2 ? "left" : "center",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "#a0b0be", fontSize: "0.75rem" }}>
                    กำลังโหลด...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "#a0b0be", fontSize: "0.75rem" }}>
                    ยังไม่มีรายการชำระเงิน
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.seq} style={{ borderBottom: "1px solid #eef2f5" }}>
                    <td style={{ textAlign: "center", padding: "6px 8px", fontSize: "0.72rem", fontWeight: 700, color: "#1a2d3e" }}>
                      {it.seq}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 8px", fontSize: "0.72rem", color: "#3a4d5e" }}>
                      {it.hn}
                    </td>
                    <td style={{ padding: "6px 8px", fontSize: "0.72rem", color: "#1a2d3e", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.name}
                      <span style={{ fontSize: "0.6rem", color: "#a0b0be", marginLeft: 6 }}>
                        ({it.items.length} รายการ)
                      </span>
                    </td>
                    <td style={{ textAlign: "right", padding: "6px 12px", fontSize: "0.74rem", fontWeight: 700, color: "#0c6075" }}>
                      {fmt(it.amount)}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 8px", fontSize: "0.7rem", fontWeight: 600, color: it.receiptNo ? "#1a2d3e" : "#c0ccd6" }}>
                      {it.receiptNo || "—"}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 8px" }}>
                      {statusBadge(it.status)}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 8px" }}>
                      {it.status === "รอชำระ" && (
                        <button
                          onClick={() => openPay(it)}
                          style={{
                            height: 25, padding: "0 12px", borderRadius: 6, border: "none",
                            background: "#0c6075", color: "#fff", cursor: "pointer",
                            fontSize: "0.66rem", fontWeight: 700,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <Banknote size={11} />ชำระเงิน
                        </button>
                      )}
                      {it.status === "สำเร็จ" && (
                        <button
                          onClick={() => setCancelItem(it)}
                          style={{
                            height: 25, padding: "0 12px", borderRadius: 6,
                            border: "1px solid #f0b0b8", background: "#fff", color: "#c63742",
                            cursor: "pointer", fontSize: "0.66rem", fontWeight: 700,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <X size={11} />ยกเลิก
                        </button>
                      )}
                      {/* สถานะ "ยกเลิก" — ไม่แสดงปุ่ม */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Payment / Receipt Modal ══════════════════════════ */}
      {payItem && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,35,50,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && !printing && setPayItem(null)}
        >
          <div style={{
            background: "#fff", borderRadius: 14, width: "min(560px, 96vw)",
            maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
            boxShadow: "0 18px 50px rgba(5,30,45,0.35)",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "11px 16px", background: "linear-gradient(135deg, #0c6075, #109cbe)",
              display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            }}>
              <Receipt size={16} color="#fff" />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem" }}>ใบเสร็จรับเงิน</span>
              <button
                onClick={() => !printing && setPayItem(null)}
                style={{ marginLeft: "auto", width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Receipt body (preview) */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Org + title */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0c6075" }}>
                  {orgName || "Check Up Flow System"}
                </div>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1a2d3e", marginTop: 2 }}>
                  ใบเสร็จรับเงิน <span style={{ fontWeight: 400, color: "#8a9baa", fontSize: "0.66rem" }}>RECEIPT</span>
                </div>
              </div>

              {/* Meta */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px",
                fontSize: "0.72rem", marginBottom: 12,
                background: "#f5f8fb", border: "1px solid #e4eaef", borderRadius: 9, padding: "10px 13px",
              }}>
                <div><span style={{ color: "#8a9baa" }}>เลขที่ใบเสร็จ:</span> <b style={{ color: "#0c6075" }}>{previewNo || "—"}</b></div>
                <div><span style={{ color: "#8a9baa" }}>วันที่:</span> <b>{todayThai()}</b></div>
                <div><span style={{ color: "#8a9baa" }}>HN:</span> <b>{payItem.hn}</b></div>
                <div><span style={{ color: "#8a9baa" }}>ชื่อ นามสกุล:</span> <b>{payItem.name}</b></div>
              </div>

              {/* Items table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#0c6075", color: "#fff", padding: "6px 8px", width: 44, fontWeight: 700 }}>ลำดับ</th>
                    <th style={{ background: "#0c6075", color: "#fff", padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>รายการตรวจ</th>
                    <th style={{ background: "#0c6075", color: "#fff", padding: "6px 8px", width: 120, fontWeight: 700 }}>จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {payItem.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eef2f5" }}>
                      <td style={{ textAlign: "center", padding: "6px 8px", color: "#667789" }}>{i + 1}</td>
                      <td style={{ padding: "6px 8px", color: "#1a2d3e" }}>{it.name}</td>
                      <td style={{ textAlign: "right", padding: "6px 12px", fontWeight: 600, color: "#1a2d3e" }}>{fmt(it.price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, background: "#eef6f8", borderRadius: "0 0 0 8px" }}>
                      ยอดชำระสุทธิ
                      <span style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, color: "#0c6075", marginTop: 2 }}>
                        {bahtText(payItem.amount)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 12px", fontWeight: 800, fontSize: "0.85rem", color: "#0c6075", background: "#eef6f8", verticalAlign: "top" }}>
                      {fmt(payItem.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 16px", borderTop: "1px solid #e4eaef", background: "#f9fbfc",
              display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            }}>
              <span style={{ flex: 1, fontSize: "0.62rem", color: "#8a9baa" }}>
                พิมพ์ A4 แนวนอน · ต้นฉบับ + สำเนา
              </span>
              <button
                onClick={() => setPayItem(null)}
                disabled={printing}
                style={{ height: 30, padding: "0 14px", borderRadius: 7, border: "1px solid #dbe5ed", background: "#fff", color: "#1a2d3e", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}
              >
                ยกเลิก
              </button>
              <button
                onClick={doPrint}
                disabled={printing || !previewNo || previewNo === "..."}
                style={{
                  height: 30, padding: "0 18px", borderRadius: 7, border: "none",
                  background: printing ? "#9bb8c2" : "#0c6075", color: "#fff",
                  cursor: printing ? "wait" : "pointer", fontSize: "0.72rem", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Printer size={13} />{printing ? "กำลังพิมพ์..." : "Print"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Cancel Confirm Dialog ════════════════════════════ */}
      {cancelItem && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 210, background: "rgba(10,35,50,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && !cancelling && setCancelItem(null)}
        >
          <div style={{
            background: "#fff", borderRadius: 13, width: "min(380px, 94vw)",
            overflow: "hidden", boxShadow: "0 18px 50px rgba(5,30,45,0.35)",
          }}>
            <div style={{ padding: "18px 20px 14px", textAlign: "center" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "#fff5f5",
                border: "1.5px solid #f5c2c7", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 10px",
              }}>
                <AlertTriangle size={20} color="#c63742" />
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1a2d3e" }}>
                ต้องการยกเลิกรายการนี้หรือไม่?
              </div>
              <div style={{ fontSize: "0.68rem", color: "#8a9baa", marginTop: 5, lineHeight: 1.5 }}>
                ใบเสร็จ <b style={{ color: "#c63742" }}>{cancelItem.receiptNo}</b> · {cancelItem.name}
                <br />ยอด {fmt(cancelItem.amount)} บาท จะถูกบันทึกเป็นยอดติดลบ
              </div>
            </div>
            <div style={{ display: "flex", borderTop: "1px solid #eef2f5" }}>
              <button
                onClick={() => setCancelItem(null)}
                disabled={cancelling}
                style={{ flex: 1, height: 40, border: "none", background: "#fff", color: "#667789", cursor: "pointer", fontSize: "0.74rem", fontWeight: 600, borderRight: "1px solid #eef2f5" }}
              >
                No
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                style={{ flex: 1, height: 40, border: "none", background: "#fff", color: "#c63742", cursor: cancelling ? "wait" : "pointer", fontSize: "0.74rem", fontWeight: 700 }}
              >
                {cancelling ? "กำลังยกเลิก..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
