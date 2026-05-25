import { CreditCard, Eye, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { getStoredToken } from "../utils/authStorage.js";
import { BOOK_COVER_FALLBACK, useFallbackImage } from "../utils/imageFallback.js";

export default function BookCard({ book }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { add, buyNow } = useCart();

  function hasLogin() {
    return isAuthenticated || Boolean(getStoredToken());
  }

  function buyPdf() {
    if (!hasLogin()) {
      toast.error("Login first to purchase this PDF");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${book._id}`)}`);
      return;
    }
    buyNow(book);
    navigate("/checkout");
  }

  function addToCart() {
    if (!hasLogin()) {
      toast.error("Login first to add this book");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${book._id}`)}`);
      return;
    }
    add(book);
  }

  return (
    <article className="premium-book-card panel group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:border-amber-200 hover:shadow-[0_26px_56px_rgba(120,53,15,.16)]">
      <Link to={`/books/${book._id}`} className="premium-book-image relative block border-b border-amber-100/70 bg-gradient-to-b from-[#fff8ec] to-white">
        <img src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} className="h-72 w-full object-contain p-5 transition duration-500 group-hover:scale-[1.05] sm:h-72" decoding="async" loading="lazy" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute left-3 top-3 rounded-full border border-amber-100 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm">{book.category?.name || "Hindi PDF"}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div>
          <Link to={`/books/${book._id}`} className="block line-clamp-2 min-h-[3.2rem] text-lg font-black leading-snug transition hover:text-orange-700">{book.title}</Link>
          <p className="mt-1 text-sm font-semibold text-gray-600">{book.author}</p>
          <p className="mt-3 line-clamp-2 min-h-[3rem] text-sm leading-6 text-gray-600">{book.description}</p>
        </div>
        <div className="mt-auto pt-5">
          <div className="book-price-box mb-4 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">PDF Price</span>
            <strong className="price-text text-2xl">Rs. {book.price}</strong>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link className="btn-secondary w-full" to={`/books/${book._id}`} title="Preview book"><Eye size={17} /> Preview</Link>
            <button className="btn-primary w-full !px-2" onClick={buyPdf}><CreditCard size={17} /> Buy PDF</button>
          </div>
          <button className="card-cart-action mt-3 w-full" onClick={addToCart} title="Add to cart"><ShoppingCart size={16} /> Add to Cart</button>
        </div>
      </div>
    </article>
  );
}
