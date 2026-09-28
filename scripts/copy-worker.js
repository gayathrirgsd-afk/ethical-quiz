// Copies the pdf.js worker into /public so the browser can load it from the same origin.
const fs = require("fs");
const path = require("path");
try {
  const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js");
  const dest = path.join(__dirname, "..", "public", "pdf.worker.min.js");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("pdf.js worker copied to public/");
} catch (e) {
  console.warn("Could not copy pdf.js worker:", e.message);
}
