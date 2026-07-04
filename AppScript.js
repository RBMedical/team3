// ==========================================================================
// AppScript.js — ไฟล์กลางเก็บ URL ของ Apps Script (โปรเจกต์รวม)
// ทุกหน้า HTML โหลดไฟล์นี้ผ่าน <script src="AppScript.js"></script>
// เวลาต้องเปลี่ยน URL ใหม่ (เช่น deploy เวอร์ชันใหม่) แก้แค่บรรทัดเดียวตรงนี้
// ไม่ต้องไปไล่แก้ทีละไฟล์ HTML อีก
// ==========================================================================

const BASE_URL = "https://script.google.com/macros/s/AKfycbzWL018ZY35QaHpt-E26L55o4sNxw1Xdh0daZzE-w30LSfxAsMdgDOSBI2SFULYnBiIKA/exec";

// alias ไว้เผื่อไฟล์เดิมใช้ชื่อตัวแปรอื่น (checkup.html ใช้ GAS_URL / ABNORMAL_URL)
const GAS_URL = BASE_URL;
const ABNORMAL_URL = BASE_URL;
