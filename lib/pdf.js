"use client";

/**
 * Client-side PDF text extraction using pdf.js.
 *
 * pdf.js is imported dynamically (browser only) and its worker is loaded from a
 * CDN pinned to the EXACT installed version — a mismatch between the API and the
 * worker throws at runtime, so keep this version in sync with package.json.
 */
const PDFJS_VERSION = "4.4.168";
const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

/**
 * Extract all text from a PDF file.
 * @param {File} file  A PDF File from an <input type="file">.
 * @param {(page: number, total: number) => void} [onProgress]
 * @returns {Promise<string>} The concatenated text of every page.
 */
export async function extractPdfText(file, onProgress) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str).join(" ") + "\n";
    onProgress?.(p, doc.numPages);
  }
  return out.trim();
}

/**
 * Extract text per page from a PDF.
 * @param {File} file
 * @param {(page: number, total: number) => void} [onProgress]
 * @returns {Promise<{page: number, content: string}[]>}
 */
export async function extractPdfPages(file, onProgress) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push({ page: p, content: content.items.map((it) => it.str).join(" ").trim() });
    onProgress?.(p, doc.numPages);
  }
  return pages;
}
