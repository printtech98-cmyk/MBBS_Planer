import { useCallback, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfPageImage {
  base64: string;
  width: number;
  height: number;
}

export function usePdfRenderer() {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<PdfPageImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPdf = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setPageImage(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setCurrentPage(1);
      await renderPage(doc, 1);
    } catch (err) {
      setPdfDoc(null);
      setPageCount(0);
      setError(err instanceof Error ? `Failed to load PDF: ${err.message}` : 'Failed to load PDF.');
    } finally {
      setLoading(false);
    }
  }, []);

  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context.');
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1] ?? '';
      setPageImage({ base64, width: viewport.width, height: viewport.height });
    } catch (err) {
      setError(err instanceof Error ? `Failed to render page ${pageNum}: ${err.message}` : `Failed to render page ${pageNum}.`);
      setPageImage(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
