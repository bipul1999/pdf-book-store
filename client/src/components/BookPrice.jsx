import { PDF_LIST_PRICE, PDF_SALE_PRICE } from "../utils/pricing.js";

function money(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function BookPrice({ book, compact = false, className = "" }) {
  const salePrice = PDF_SALE_PRICE;
  const listPrice = PDF_LIST_PRICE;
  const discount = listPrice > salePrice
    ? Math.round(((listPrice - salePrice) / listPrice) * 100)
    : 0;

  return (
    <span className={`flex flex-wrap items-center gap-2 ${className}`}>
      {listPrice > salePrice && <span className="text-sm font-bold text-gray-400 line-through">Rs. {money(listPrice)}</span>}
      {discount > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-black text-green-700">{discount}% OFF</span>}
      <strong className={`price-text ${compact ? "text-xl" : "text-2xl"}`}>Rs. {money(salePrice)}</strong>
    </span>
  );
}
