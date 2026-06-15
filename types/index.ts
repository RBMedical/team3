export interface EmployeeRow {
  rowId: string;
  HN: string;
  "ชื่อ นามสกุล": string;
  รหัสประจำตัว: string;
  เลขบัตรประชาชน: string;
  แผนก: string;
  ตำแหน่ง: string;
  ชั้นปี: string;
  สาขา: string;
  ห้อง: string;
  โปรแกรม: string;
  Customer: string;
  ลำดับลงทะเบียน: string;
  "วันที่ลงทะเบียน": string;
  เวลาลงทะเบียน: string;
  หมายเหตุ: string;
  stickers?: StickerItem[];
}

export interface StickerItem {
  HN: string;
  barcode: string;
  specimenCode: string;
  specimen: string;
  ลำดับลงทะเบียน: string;
  fullName: string;
  displayName: string;
  Customer: string;
  "วันที่ลงทะเบียน": string;
  program: string;
}

export interface QueueRow {
  sequence: string;
  hn: string;
  name: string;
  date: string;
  time: string;
}

export interface SpecimenTestRow {
  colB: string;
  colE: string;
  colF: string;
}

export interface SpecimenRow {
  hn: string;
  name: string;
  specimenType: string;
  specimenGroup: string;
}

export interface SpecimenSummary {
  type: string;
  count: number;
}

export interface FollowRow extends Array<string> {}

export type AppScriptResponse<T = Record<string, unknown>> = {
  ok: boolean;
  message?: string;
} & T;

export type SearchResponse = AppScriptResponse<{
  rows: EmployeeRow[];
}>;

export type RegisterResponse = AppScriptResponse<{
  row: EmployeeRow;
  stickers: StickerItem[];
}>;

export type QueueResponse = AppScriptResponse<{
  rows: QueueRow[];
  count: number;
  addNewCount: number;
}>;

export type SpecimenDataResponse = AppScriptResponse<{
  rows: SpecimenRow[];
  summary: SpecimenSummary[];
  counts: Record<string, number>;
}>;

export type SpecimenTestResponse = AppScriptResponse<{
  rows: SpecimenTestRow[];
}>;

export type FollowDataResponse = AppScriptResponse<{
  headers: string[];
  rows: FollowRow[];
}>;
