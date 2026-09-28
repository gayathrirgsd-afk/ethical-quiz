// Browser-side PDF text extraction (pdf.js). Runs entirely on the instructor's computer,
// so PDF size is not limited by Vercel's request-size limits.

// Rebuild visual text lines from pdf.js text items (grouped by baseline, ordered by x).
export function itemsToLines(items) {
  const rows = [];
  for (const it of items) {
    if (typeof it.str !== "string" || it.str === "") continue;
    const x = it.transform[4];
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str: it.str, w: it.width || 0 });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let out = "";
    let prev = null;
    for (const p of r.parts) {
      if (prev && p.x - (prev.x + prev.w) > 1.5 && !out.endsWith(" ") && !p.str.startsWith(" ")) out += " ";
      out += p.str;
      prev = p;
    }
    return out.trim();
  });
}

export async function extractTextFromPdf(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(itemsToLines(content.items).join("\n"));
  }
  return pages.join("\n");
}
