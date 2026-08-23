import { useCallback, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfPageImage {
  base64: string;
  width: number;
  height: number;
}

const RENDER_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s. The PDF may be corrupted or too large.`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function usePdfRenderer() {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<PdfPageImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[PDF] Getting page', pageNum);
      const page = await withTimeout(doc.getPage(pageNum), RENDER_TIMEOUT_MS, `Loading page ${pageNum}`);
      const viewport = page.getViewport({ scale: 2 });
      console.log('[PDF] Page viewport:', viewport.width, 'x', viewport.height);
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context.');
      console.log('[PDF] Rendering page to canvas');
      await withTimeout(page.render({ canvas, viewport }).promise, RENDER_TIMEOUT_MS, `Rendering page ${pageNum}`);
      console.log('[PDF] Page rendered, converting to base64');
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1] ?? '';
      console.log('[PDF] Base64 conversion done, length:', base64.length);
      setPageImage({ base64, width: viewport.width, height: viewport.height });
    } catch (err) {
      console.error('[PDF] Render error:', err);
      setError(err instanceof Error ? `Failed to render page ${pageNum}: ${err.message}` : `Failed to render page ${pageNum}.`);
      setPageImage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPdf = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setPageImage(null);
      try {
        console.log('[PDF] Loading file:', file.name, file.size, 'bytes');
        const arrayBuffer = await file.arrayBuffer();
        console.log('[PDF] Array buffer read, creating document');
        const doc = await withTimeout(
          pdfjsLib.getDocument({ data: arrayBuffer }).promise,
          RENDER_TIMEOUT_MS,
          'Loading PDF document',
        );
        console.log('[PDF] Document loaded, pages:', doc.numPages);
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setCurrentPage(1);
        await renderPage(doc, 1);
      } catch (err) {
        console.error('[PDF] Load error:', err);
        setPdfDoc(null);
        setPageCount(0);
        setError(err instanceof Error ? `Failed to load PDF: ${err.message}` : 'Failed to load PDF.');
      } finally {
        setLoading(false);
      }
    },
    [renderPage],
  );

  const changePage = useCallback(
    (pageNum: number) => {
      if (!pdfDoc || pageNum < 1 || pageNum > pageCount) return;
      setCurrentPage(pageNum);
      void renderPage(pdfDoc, pageNum);
    },
    [pdfDoc, pageCount, renderPage],
  );

  useEffect(() => {
    return () => {
      pdfDoc?.cleanup().catch(() => {});
    };
  }, [pdfDoc]);

  return { pageCount, currentPage, pageImage, loading, error, loadPdf, changePage };
}
