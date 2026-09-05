export type CsvRow = Record<string, string>;

export type ParseResult = {
  headers: string[];
  rows: CsvRow[];
};

export function parseCsv(text: string): ParseResult {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      lines.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  const nonEmpty = lines.filter((l) => l.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = (nonEmpty[0] ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = nonEmpty.slice(1).map((line) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (line[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

export function toCsv(rows: Record<string, string | number | null>[], headers?: string[]) {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c] ?? "")).join(","))].join("\n");
}

export function downloadFile(filename: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const PRODUCT_TEMPLATE = `name,sku,category,supplier,cost_price,selling_price,current_stock,min_stock,max_stock,lead_time_days
Black Hoodie,AP-HD-001,Apparel,Northloom Mills,22,59,25,15,180,10
White Sneakers,FW-SN-014,Footwear,Vela Footwear,34,89,30,20,200,14`;

export const SALES_TEMPLATE = `date,product,sku,quantity,selling_price
2026-08-14,Black Hoodie,AP-HD-001,4,59
2026-08-15,White Sneakers,FW-SN-014,2,89`;

export type ValidationIssue = { row: number; message: string };
