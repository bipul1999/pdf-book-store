import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import { getStoredToken } from "../utils/authStorage.js";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfReader() {
  const { id } = useParams();
  const readerRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [book, setBook] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [renderVersion, setRenderVersion] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let loadingTask;
    let loadedDocument;
    let cancelled = false;

    async function loadPdf() {
      try {
        setError("");
        const [{ data }, pdfRes] = await Promise.all([
          api.get(`/books/${id}`),
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/books/${id}/download`, {
            headers: { Authorization: `Bearer ${getStoredToken()}` }
          })
        ]);
        if (!pdfRes.ok) throw new Error(pdfRes.status === 403 ? "Your 30 day access has expired or payment is not verified." : "PDF could not be opened");
        const pdfData = await pdfRes.arrayBuffer();
        loadingTask = getDocument({ data: new Uint8Array(pdfData) });
        loadedDocument = await loadingTask.promise;
        if (cancelled) {
          await loadedDocument.destroy();
          return;
        }
        setBook(data.book);
        setPdfDocument(loadedDocument);
        setPageCount(loadedDocument.numPages);
        setPageNumber(1);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to open PDF");
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (loadingTask && !loadedDocument) loadingTask.destroy();
      if (loadedDocument) loadedDocument.destroy();
    };
  }, [id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !window.ResizeObserver) return undefined;
    const resizeObserver = new ResizeObserver(() => setRenderVersion((value) => value + 1));
    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, [pdfDocument]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !stageRef.current) return undefined;
    let cancelled = false;
    let renderTask;

    async function renderPage() {
      setRendering(true);
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled) return;
        const canvas = canvasRef.current;
        const containerWidth = Math.max(stageRef.current.clientWidth - 24, 240);
        const initialViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.min(containerWidth / initialViewport.width, 1.6);
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d", { alpha: false });

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvasContext: context,
          transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
          viewport
        });
        await renderTask.promise;
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") setError("PDF page could not be displayed");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pageNumber, pdfDocument, renderVersion, zoom]);

  async function openFullscreen() {
    if (!readerRef.current) return;
    if (readerRef.current.requestFullscreen) await readerRef.current.requestFullscreen();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 pb-24 sm:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="btn-secondary mb-3 w-fit" to="/dashboard/library"><ArrowLeft size={16} /> Library</Link>
          <h1 className="text-xl font-black sm:text-2xl">{book?.title || "PDF Reader"}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-600"><ShieldCheck size={16} /> Secure in-app reading only</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={openFullscreen}><Maximize2 size={16} /> Full screen</button>
      </div>
      <section ref={readerRef} className="panel pdf-reader-shell overflow-hidden bg-white">
        {error && <p className="p-8 text-center text-red-600">{error}</p>}
        {!error && !pdfDocument && <p className="p-8 text-center text-gray-600">Opening PDF...</p>}
        {!error && pdfDocument && (
          <>
            <div className="pdf-reader-toolbar flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 bg-white px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2">
                <button className="btn-secondary !min-h-10 !px-3" type="button" disabled={pageNumber === 1 || rendering} onClick={() => setPageNumber((page) => page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
                <p className="min-w-24 text-center text-sm font-bold text-gray-700">{pageNumber} / {pageCount}</p>
                <button className="btn-secondary !min-h-10 !px-3" type="button" disabled={pageNumber === pageCount || rendering} onClick={() => setPageNumber((page) => page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary !min-h-10 !px-3" type="button" disabled={zoom <= 0.8 || rendering} onClick={() => setZoom((value) => Math.max(0.8, value - 0.2))} aria-label="Zoom out"><ZoomOut size={18} /></button>
                <span className="min-w-12 text-center text-sm font-bold text-gray-600">{Math.round(zoom * 100)}%</span>
                <button className="btn-secondary !min-h-10 !px-3" type="button" disabled={zoom >= 2 || rendering} onClick={() => setZoom((value) => Math.min(2, value + 0.2))} aria-label="Zoom in"><ZoomIn size={18} /></button>
              </div>
            </div>
            <div ref={stageRef} className="pdf-reader-stage relative flex min-h-[65vh] justify-center overflow-auto bg-slate-100/70 p-3 sm:min-h-[72vh] sm:p-4">
              {rendering && <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 shadow-sm">Rendering...</span>}
              <canvas ref={canvasRef} className="pdf-reader-page h-fit max-w-none bg-white shadow-md" aria-label={`Page ${pageNumber} of ${pageCount}`} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
