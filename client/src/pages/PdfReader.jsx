import { ArrowLeft, Maximize2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import { getStoredToken } from "../utils/authStorage.js";

export default function PdfReader() {
  const { id } = useParams();
  const readerRef = useRef(null);
  const [book, setBook] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    async function loadPdf() {
      try {
        const [{ data }, pdfRes] = await Promise.all([
          api.get(`/books/${id}`),
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/books/${id}/download`, {
            headers: { Authorization: `Bearer ${getStoredToken()}` }
          })
        ]);
        if (!pdfRes.ok) throw new Error(pdfRes.status === 403 ? "Your 30 day access has expired or payment is not verified." : "PDF could not be opened");
        const blob = await pdfRes.blob();
        objectUrl = URL.createObjectURL(blob);
        setBook(data.book);
        setPdfUrl(`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1`);
      } catch (err) {
        setError(err.message || "Unable to open PDF");
      }
    }
    loadPdf();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  async function openFullscreen() {
    if (!readerRef.current) return;
    if (readerRef.current.requestFullscreen) await readerRef.current.requestFullscreen();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="btn-secondary mb-3 w-fit" to="/dashboard/library"><ArrowLeft size={16} /> Library</Link>
          <h1 className="text-xl font-black sm:text-2xl">{book?.title || "PDF Reader"}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-600"><ShieldCheck size={16} /> Secure in-app reading only</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={openFullscreen}><Maximize2 size={16} /> Full screen</button>
      </div>
      <section ref={readerRef} className="panel overflow-hidden bg-white">
        {error && <p className="p-8 text-center text-red-600">{error}</p>}
        {!error && !pdfUrl && <p className="p-8 text-center text-gray-600">Opening PDF...</p>}
        {pdfUrl && <iframe className="h-[78vh] w-full bg-white" title={book?.title || "PDF Reader"} src={pdfUrl} />}
      </section>
    </main>
  );
}
