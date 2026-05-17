import { CreditCard, Eye, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { getStoredToken } from "../utils/authStorage.js";

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
    <article className="panel flex h-full flex-col overflow-hidden">
      <Link to={`/books/${book._id}`} className="block">
        <img src={book.coverImage} alt={book.title} className="h-44 w-full bg-orange-50 object-contain p-2 transition hover:scale-[1.02] sm:h-48 lg:h-52" />
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <div>
          <Link to={`/books/${book._id}`} className="mt-1 block line-clamp-2 text-base font-bold hover:text-orange-600">{book.title}</Link>
          <p className="text-sm text-gray-600">{book.author}</p>
          <p className="mt-1.5 line-clamp-1 text-sm text-gray-600">{book.description}</p>
          <Link className="mt-1 inline-block text-sm font-bold text-orange-600 hover:text-orange-800" to={`/books/${book._id}`}>Read more</Link>
        </div>
        <div className="mt-auto space-y-2.5 pt-3">
          <strong className="block text-lg">Rs. {book.price}</strong>
          <button className="btn-primary w-full" onClick={buyPdf}><CreditCard size={18} /> Buy PDF</button>
          <div className="flex gap-2">
            <Link className="btn-secondary !px-3" to={`/books/${book._id}`} title="View details"><Eye size={18} /></Link>
            <button className="btn-secondary flex-1" onClick={addToCart} title="Add to cart"><ShoppingCart size={18} /> Cart</button>
          </div>
        </div>
      </div>
    </article>
  );
}
