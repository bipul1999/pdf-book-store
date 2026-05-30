export const PDF_LIST_PRICE = 149;
export const PDF_SALE_PRICE = 99;

export function orderBookPrice(book) {
  return Number(book?.orderBookPrice ?? book?.price ?? 0);
}
