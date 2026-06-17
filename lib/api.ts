const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw47GlDVpm53fIzXacastA57K1qiyuHpfotLkE9hzNeeppzZeCvk0bS0GtsdmVQcUeG/exec";

// Global loading counter
let _loadingCount = 0;
function setGlobalLoading(active: boolean) {
  _loadingCount += active ? 1 : -1;
  if (_loadingCount < 0) _loadingCount = 0;
  const el = document.getElementById("global-loading");
  if (el) el.style.display = _loadingCount > 0 ? "flex" : "none";
}

export function appScriptRequest<T = Record<string, unknown>>(
  params: Record<string, string | number>
): Promise<T> {
  if (!APP_SCRIPT_URL || APP_SCRIPT_URL.includes("PASTE_")) {
    return Promise.resolve({
      ok: false,
      message: "กรุณาตั้งค่า APP_SCRIPT_URL ใน lib/api.ts",
    } as T);
  }

  return new Promise((resolve, reject) => {
    const callbackName = `appScriptCallback_${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}`;
    const url = new URL(APP_SCRIPT_URL);

    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value ?? ""))
    );
    url.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      setGlobalLoading(false);
      reject(new Error("Apps Script ไม่ตอบสนอง"));
    }, 20000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = (data: T) => {
      cleanup();
      setGlobalLoading(false);
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      setGlobalLoading(false);
      reject(new Error("เชื่อมต่อ Apps Script ไม่สำเร็จ"));
    };

    function cleanup() {
      window.clearTimeout(timer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[callbackName];
      script.remove();
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatSequence(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "0000";
  const number = Number(text);
  return Number.isFinite(number) ? String(number).padStart(4, "0") : text;
}

export function formatHn(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "00000000";
  return /^\d+$/.test(text) ? text.padStart(8, "0") : text;
}

export function buildBarcodeValue(specimenCode: string, hn: string): string {
  // barcode format ถูกต้อง: specimenCode(2) + HN(6) = 8 หลัก
  // เช่น specimenCode="11", HN="100070" → "11100070"
  const code = String(specimenCode ?? "").trim();
  const hnPadded = String(hn ?? "").trim().padStart(6, "0").slice(-6);
  return code + hnPadded;
}

export function formatStickerDate(value: unknown): string {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return text;
  return `${Number(match[1])}/${Number(match[2])}/${match[3]}`;
}
