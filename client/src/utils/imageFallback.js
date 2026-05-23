export const BOOK_COVER_FALLBACK = "/images/book-cover-placeholder.svg";

export function useFallbackImage(event, fallbackSource) {
  const image = event.currentTarget;
  if (image.src.endsWith(fallbackSource)) return;
  image.onerror = null;
  image.src = fallbackSource;
}
