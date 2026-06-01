import { CreditCard, Eye, ShoppingCart, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { getStoredToken } from "../utils/authStorage.js";
import { isBookPdfAvailable, ownerUploadMessage } from "../utils/bookAvailability.js";
import { BOOK_COVER_FALLBACK, useFallbackImage } from "../utils/imageFallback.js";
import BookPrice from "./BookPrice.jsx";

export default function BookCard({ book, compact = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { add, buyNow } = useCart();
  const pdfAvailable = isBookPdfAvailable(book);

  function hasLogin() {
    return isAuthenticated || Boolean(getStoredToken());
  }

  function buyPdf() {
    if (!pdfAvailable) {
      toast.error(ownerUploadMessage);
      return;
    }
    if (!hasLogin()) {
      toast.error("Login first to purchase this PDF");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${book._id}`)}`);
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
      navigate(`/login?redirect=${encodeURIComponent(`/books/${book._id}`)}`);
      return;
    }
    add(book);
  }

  function showUnavailable() {
    toast.error(ownerUploadMessage);
  }

  return (
    <article className={`premium-book-card panel group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:border-amber-200 hover:shadow-[0_26px_56px_rgba(120,53,15,.16)] ${compact ? "premium-book-card-compact" : ""}`}>
      {pdfAvailable ? <Link to={`/books/${book._id}`} className="premium-book-image relative block border-b border-amber-100/70 bg-gradient-to-b from-[#fff8ec] to-white">
        <img src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} className={`${compact ? "h-52 p-3 sm:h-56" : "h-72 p-5 sm:h-72"} w-full object-contain transition duration-500 group-hover:scale-[1.05]`} decoding="async" loading="lazy" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute left-3 top-3 rounded-full border border-amber-100 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm">{book.category?.name || "Hindi PDF"}</span>
      </Link> : <button type="button" onClick={showUnavailable} className="premium-book-image relative block w-full border-b border-amber-100/70 bg-gradient-to-b from-[#fff8ec] to-white text-left">
        <img src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} className={`${compact ? "h-52 p-3 sm:h-56" : "h-72 p-5 sm:h-72"} w-full object-contain opacity-90 transition duration-500 group-hover:scale-[1.03]`} decoding="async" loading="lazy" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute left-3 top-3 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">Coming soon</span>
      </button>}
      <div className={`flex flex-1 flex-col ${compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"}`}>
        <div>
          {pdfAvailable ? (
            <Link to={`/books/${book._id}`} className={`block line-clamp-2 font-black leading-snug transition hover:text-orange-700 ${compact ? "min-h-[2.7rem] text-base" : "min-h-[3.2rem] text-lg"}`}>{book.title}</Link>
          ) : (
            <button type="button" onClick={showUnavailable} className={`block w-full line-clamp-2 text-left font-black leading-snug transition hover:text-orange-700 ${compact ? "min-h-[2.7rem] text-base" : "min-h-[3.2rem] text-lg"}`}>{book.title}</button>
          )}
          <p className="book-card-author mt-1 text-sm font-semibold text-gray-600">{book.author}</p>
          {book.rating && <div className="mt-2 flex items-center gap-1.5" aria-label={`${book.rating} out of 5 stars`}>
            <span className="flex gap-0.5 text-amber-500">{[1, 2, 3, 4, 5].map((rating) => <Star fill={rating <= Math.round(book.rating) ? "currentColor" : "none"} key={rating} size={14} />)}</span>
            <span className="text-xs font-black text-gray-600">{Number(book.rating).toFixed(1)}</span>
          </div>}
          <p className={`book-card-description ${compact ? "mt-2 min-h-[2.5rem] leading-5" : "mt-3 min-h-[3rem] leading-6"} line-clamp-2 text-sm text-gray-600`}>{book.description}</p>
        </div>
        <div className={`mt-auto ${compact ? "pt-3" : "pt-5"}`}>
          {pdfAvailable ? (
            <>
              <div className={`book-price-box flex items-center justify-between gap-2 ${compact ? "mb-3" : "mb-4"}`}>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">PDF Price</span>
                <BookPrice book={book} compact={compact} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link className={`btn-secondary w-full ${compact ? "!min-h-10 !px-2 !py-2 text-xs" : ""}`} to={`/books/${book._id}`} title="Preview book"><Eye size={17} /> Preview</Link>
                <button className={`btn-primary w-full !px-2 ${compact ? "!min-h-10 !py-2 text-xs" : ""}`} onClick={buyPdf}><CreditCard size={17} /> Buy PDF</button>
              </div>
              <button className={`card-cart-action w-full ${compact ? "mt-2 !min-h-9" : "mt-3"}`} onClick={addToCart} title="Add to cart"><ShoppingCart size={16} /> Add to Cart</button>
            </>
          ) : (
            <button type="button" className="book-unavailable-action w-full" onClick={showUnavailable}>{ownerUploadMessage}</button>
          )}
        </div>
      </div>
    </article>
  );
}
