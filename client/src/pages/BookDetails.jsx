import { CreditCard, Download, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { getStoredToken } from "../utils/authStorage.js";
import { isBookPdfAvailable, ownerUploadMessage } from "../utils/bookAvailability.js";

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { add, buyNow } = useCart();
  const [book, setBook] = useState(null);
  useEffect(() => { api.get(`/books/${id}`).then(({ data }) => setBook(data.book)); }, [id]);
  const pdfAvailable = isBookPdfAvailable(book);
  function hasLogin() {
    return isAuthenticated || Boolean(getStoredToken());
  }

  function goToCheckout() {
    if (!pdfAvailable) {
      toast.error(ownerUploadMessage);
      return;
    }
    if (!hasLogin()) {
      toast.error("Login first to purchase this PDF");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${id}`)}`);
      return;
    }
    buyNow(book);
    navigate("/checkout");
  }

  function addToCart() {
    if (!pdfAvailable) {
      toast.error(ownerUploadMessage);
      return;
    }
    if (!hasLogin()) {
      toast.error("Login first to add this book");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${id}`)}`);
      return;
    }
    add(book);
  }
  if (!book) return <main className="store-page p-8">Loading...</main>;
  return (
    <main className="store-page mx-auto grid max-w-6xl gap-6 px-4 pb-28 pt-5 sm:py-10 md:grid-cols-[320px_1fr] md:items-start lg:grid-cols-[360px_1fr]">
      <div className="panel overflow-hidden bg-gradient-to-b from-amber-50 to-white p-3">
        <img src={book.coverImage} className="mx-auto max-h-[520px] w-full rounded-xl object-contain" alt={book.title} />
      </div>
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-black leading-tight sm:text-4xl">{book.title}</h1>
          <p className="mt-1 text-sm font-semibold text-gray-600 sm:text-base">By {book.author}</p>
        </div>
        <p className="text-[15px] leading-7 text-gray-700 sm:text-base">{book.description}</p>
        {pdfAvailable ? <div className="panel warm-summary p-5 sm:p-6">
          <p className="text-sm font-semibold text-gray-600">PDF price</p>
          <strong className="price-text mt-1 block text-2xl sm:text-3xl">Rs. {book.price}</strong>
          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
            <button className="btn-primary w-full sm:w-auto" onClick={goToCheckout}><CreditCard size={18} /> Buy and pay</button>
            <button className="btn-secondary w-full sm:w-auto" onClick={addToCart}><ShoppingCart size={18} /> Add to cart</button>
            <Link className="btn-secondary w-full sm:w-auto" to="/dashboard/library"><Download size={18} /> Read purchased books</Link>
          </div>
        </div> : <div className="panel warm-summary p-5 sm:p-6">
          <p className="text-lg font-black text-[#b45309]">{ownerUploadMessage}</p>
          <p className="mt-2 text-sm leading-6 text-gray-600">This book will be available for purchase after the owner uploads the PDF.</p>
        </div>}
      </section>
      {pdfAvailable && <div className="mobile-purchase-bar fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-amber-100 bg-[#fffaf5]/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,.10)] backdrop-blur sm:hidden">
        <button className="btn-primary w-full" onClick={goToCheckout}><CreditCard size={18} /> Buy Now - Rs. {book.price}</button>
      </div>}
    </main>
  );
}
