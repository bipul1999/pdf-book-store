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
    <article className="premium-book-card panel group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_24px_52px_rgba(120,53,15,.14)]">
      <Link to={`/books/${book._id}`} className="premium-book-image relative block border-b border-amber-100/70 bg-gradient-to-b from-amber-50/90 to-white">
        <img src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} className="h-64 w-full object-contain p-4 transition duration-300 group-hover:scale-[1.025] sm:h-56 lg:h-60" decoding="async" loading="lazy" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        {book.category?.name && <span className="absolute left-3 top-3 rounded-full border border-amber-100 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm">{book.category.name}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div>
          <Link to={`/books/${book._id}`} className="block line-clamp-2 min-h-[3rem] text-lg font-black leading-snug transition hover:text-orange-700 sm:text-base">{book.title}</Link>
          <p className="mt-1 text-sm font-semibold text-gray-600">{book.author}</p>
          <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-gray-600">{book.description}</p>
          <Link className="mt-2 inline-flex text-sm font-bold text-orange-700 transition hover:text-orange-900" to={`/books/${book._id}`}>Read more</Link>
        </div>
        <div className="mt-auto space-y-3 pt-4">
          <strong className="price-text block text-xl">Rs. {book.price}</strong>
          <button className="btn-primary w-full" onClick={buyPdf}><CreditCard size={18} /> Buy PDF</button>
          <div className="flex gap-2">
            <Link className="btn-secondary !px-3" to={`/books/${book._id}`} title="View details" aria-label={`View ${book.title}`}><Eye size={18} /></Link>
            <button className="btn-secondary flex-1" onClick={addToCart} title="Add to cart"><ShoppingCart size={18} /> Cart</button>
          </div>
        </div>
      </div>
    </article>
  );
}
