import { NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import {
  parseExportParams,
  buildTransactionsQuery,
  mapTransaction,
  computeSummary,
  handleSchemaMissing,
} from "../shared";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
};
function formatCurrency(value: number | null) {
  if (value === null) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function escapeCsv(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/\"/g, '""') + '"';
  }

  return value;
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function columnLetter(index: number) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  return letters[index] ?? "A";
}

function createSheetXml(rows: string[][]) {
  const cells = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const columns = row
        .map((cell, cellIndex) => {
          const ref = `${columnLetter(cellIndex)}${r}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${columns}</row>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetData>${cells}</sheetData>` +
    "</worksheet>"
  );
}

function createWorkbookXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets>' +
    "</workbook>"
  );
}

function createWorkbookRelsXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    "</Relationships>"
  );
}

function createRootRelsXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/extended-properties" Target="docProps/app.xml"/>' +
    "</Relationships>"
  );
}

function createContentTypesXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    "</Types>"
  );
}

function createCoreXml() {
  const now = new Date().toISOString();
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    "<dc:title>Relatorio de transacoes</dc:title>" +
    "<dc:creator>Ano Designer</dc:creator>" +
    "<cp:lastModifiedBy>Ano Designer</cp:lastModifiedBy>" +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>` +
    "</cp:coreProperties>"
  );
}

function createAppXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    "<Application>Ano Designer</Application>" +
    "</Properties>"
  );
}
const CRC_TABLE = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
    table.push(crc >>> 0);
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function getDosDateTime(date: Date) {
  const year = date.getFullYear() - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosDate = (year << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;

  return { dosDate, dosTime };
}

function createZip(entries: { name: string; data: Buffer }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);
    const { dosDate, dosTime } = getDosDateTime(new Date());

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localRecord = Buffer.concat([localHeader, nameBuffer, data]);
    localParts.push(localRecord);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    const centralRecord = Buffer.concat([centralHeader, nameBuffer]);
    centralParts.push(centralRecord);

    offset += localRecord.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const centralOffset = offset;
  const centralSize = centralDirectory.length;

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(centralOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}
function createXlsx(items: ReturnType<typeof mapTransaction>) {
  const header = ["Cliente", "Telefone", "Data", "Valor", "Vencimento", "Status"];
  const rows = [
    header,
    ...items.map((item) => [
      item.clientName,
      item.phone ?? "-",
      formatDate(item.date),
      formatCurrency(item.amount ?? 0),
      formatDate(item.dueDate),
      STATUS_LABEL[item.status] ?? item.status,
    ]),
  ];

  const files = [
    { name: "[Content_Types].xml", data: Buffer.from(createContentTypesXml(), "utf8") },
    { name: "_rels/.rels", data: Buffer.from(createRootRelsXml(), "utf8") },
    { name: "docProps/core.xml", data: Buffer.from(createCoreXml(), "utf8") },
    { name: "docProps/app.xml", data: Buffer.from(createAppXml(), "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(createWorkbookXml(), "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(createWorkbookRelsXml(), "utf8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(createSheetXml(rows), "utf8") },
  ];

  return createZip(files);
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPdf(
  items: ReturnType<typeof mapTransaction>,
  summary: { customers: number; total: number },
  filters: { start?: string | null; end?: string | null }
) {
  const lines: string[] = [];
  lines.push("Relatorio de transacoes");
  lines.push(`Periodo: ${filters.start ?? "-"} ate ${filters.end ?? "-"}`);
  lines.push(`Clientes: ${summary.customers}`);
  lines.push(`Total: ${formatCurrency(summary.total)}`);
  lines.push("");
  lines.push("Cliente | Telefone | Data | Valor | Vencimento | Status");
  items.forEach((item) => {
    lines.push(
      [
        item.clientName,
        item.phone ?? "-",
        formatDate(item.date),
        formatCurrency(item.amount ?? 0),
        formatDate(item.dueDate),
        STATUS_LABEL[item.status] ?? item.status,
      ].join(" | ")
    );
  });

  const content = lines
    .map((line, index) => (index === 0 ? `(${escapePdf(line)}) Tj` : `T* (${escapePdf(line)}) Tj`))
    .join("\n");

  const stream = `BT\n/F1 12 Tf\n14 TL\n50 780 Td\n${content}\nET`;
  const streamBuffer = Buffer.from(stream, "utf8");
  const length = streamBuffer.length;

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj");
  objects.push(
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj"
  );
  objects.push(`4 0 obj << /Length ${length} >> stream\n${stream}\nendstream endobj`);
  objects.push("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  const header = Buffer.from("%PDF-1.4\n", "utf8");
  const buffers: Buffer[] = [header];
  const offsets: number[] = [0];
  let offset = header.length;

  objects.forEach((object) => {
    const buffer = Buffer.from(`${object}\n`, "utf8");
    offsets.push(offset);
    buffers.push(buffer);
    offset += buffer.length;
  });

  const xrefOffset = offset;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.concat([...buffers, Buffer.from(xref, "utf8"), Buffer.from(trailer, "utf8")]);
}

function buildFilename(format: string) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now
    .getDate()
    .toString()
    .padStart(2, "0")}-${now.getHours().toString().padStart(2, "0")}${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  return `relatorio-${stamp}.${format}`;
}
function createExportResponse(
  format: "csv" | "xlsx" | "pdf",
  items: ReturnType<typeof mapTransaction>,
  summary: { customers: number; total: number },
  filters: { start?: string | null; end?: string | null }
) {
  if (format === "csv") {
    const rows = [
      ["Cliente", "Telefone", "Data", "Valor", "Vencimento", "Status"],
      ...items.map((item) => [
        item.clientName,
        item.phone ?? "-",
        formatDate(item.date),
        formatCurrency(item.amount ?? 0),
        formatDate(item.dueDate),
        STATUS_LABEL[item.status] ?? item.status,
      ]),
    ];
    const buffer = Buffer.from(toCsv(rows), "utf8");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildFilename("csv")}"`,
      },
    });
  }

  if (format === "xlsx") {
    const buffer = createXlsx(items);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildFilename("xlsx")}"`,
      },
    });
  }

  const buffer = createPdf(items, summary, filters);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildFilename("pdf")}"`,
    },
  });
}

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, searchParams }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const params = parseExportParams(searchParams);
      const { filters, sort, format } = params;

      const query = buildTransactionsQuery(
        supabase,
        user.id,
        filters,
        "client_name, phone, date, amount, due_date, status"
      ).order(sort.field, { ascending: sort.order === "asc" });

      const { data, error } = await query;

      if (error) {
        if (handleSchemaMissing(error)) {
          return createExportResponse(format, [], { customers: 0, total: 0 }, filters);
        }

        throw mapPostgrestError(error, "Unable to export transactions");
      }

      const rows = data ?? [];
      const items = rows.map((row) => mapTransaction(row));
      const summary = computeSummary(rows);

      return createExportResponse(format, items, summary, filters);
    },
    {
      auth: "required",
      rateLimit: {
        limit: 20,
      },
    }
  );
}
