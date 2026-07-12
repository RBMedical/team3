// Type declarations for xlsx-js-style
// (xlsx-js-style เป็น fork ของ xlsx ที่รองรับ cell styling แต่ไม่มี types มาให้)
declare module "xlsx-js-style" {
  export interface CellStyle {
    font?: {
      name?: string;
      sz?: number;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: { rgb?: string };
    };
    alignment?: {
      horizontal?: "left" | "center" | "right";
      vertical?: "top" | "center" | "bottom";
      wrapText?: boolean;
    };
    fill?: {
      fgColor?: { rgb?: string };
      bgColor?: { rgb?: string };
      patternType?: string;
    };
    border?: {
      top?: { style?: string; color?: { rgb?: string } };
      bottom?: { style?: string; color?: { rgb?: string } };
      left?: { style?: string; color?: { rgb?: string } };
      right?: { style?: string; color?: { rgb?: string } };
    };
    numFmt?: string;
  }

  export interface CellObject {
    v?: string | number | boolean | Date;
    t?: string;
    f?: string;
    s?: CellStyle;
    z?: string;
    w?: string;
  }

  export interface ColInfo {
    wch?: number;
    wpx?: number;
    hidden?: boolean;
  }

  export interface RowInfo {
    hpt?: number;
    hpx?: number;
    hidden?: boolean;
  }

  export interface WorkSheet {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [cell: string]: any;
    "!cols"?: ColInfo[];
    "!rows"?: RowInfo[];
    "!ref"?: string;
    "!merges"?: unknown[];
  }

  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [sheet: string]: WorkSheet };
    Props?: Record<string, unknown>;
  }

  export interface WritingOptions {
    bookType?: "xlsx" | "xlsm" | "xlsb" | "csv" | "txt" | "html" | "ods";
    type?: "base64" | "binary" | "buffer" | "file" | "array" | "string";
    cellStyles?: boolean;
    compression?: boolean;
  }

  export interface CellAddress {
    c: number;
    r: number;
  }

  export const utils: {
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    aoa_to_sheet(data: unknown[][], opts?: unknown): WorkSheet;
    json_to_sheet(data: unknown[], opts?: unknown): WorkSheet;
    sheet_to_json<T = unknown>(ws: WorkSheet, opts?: unknown): T[];
    encode_cell(cell: CellAddress): string;
    decode_cell(address: string): CellAddress;
    encode_range(s: CellAddress, e?: CellAddress): string;
    decode_range(range: string): { s: CellAddress; e: CellAddress };
  };

  export function write(wb: WorkBook, opts: WritingOptions): ArrayBuffer;
  export function writeFile(wb: WorkBook, filename: string, opts?: WritingOptions): void;
  export function read(data: unknown, opts?: unknown): WorkBook;
  export function readFile(filename: string, opts?: unknown): WorkBook;
}
