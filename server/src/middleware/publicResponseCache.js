const publicResponseCache = new Map();
const MAX_CACHE_ENTRIES = 250;

function removeExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of publicResponseCache) {
    if (entry.expiresAt <= now) publicResponseCache.delete(key);
  }
}

export function cachePublicResponse(ttlMs) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = req.originalUrl;
    const cached = publicResponseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.cacheControl) res.setHeader("Cache-Control", cached.cacheControl);
      res.setHeader("X-Response-Cache", "HIT");
      return res.json(cached.body);
    }
    if (cached) publicResponseCache.delete(key);

    const sendJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        removeExpiredEntries();
        if (publicResponseCache.size >= MAX_CACHE_ENTRIES) {
          publicResponseCache.delete(publicResponseCache.keys().next().value);
        }
        publicResponseCache.set(key, {
          body,
          cacheControl: res.getHeader("Cache-Control"),
          expiresAt: Date.now() + ttlMs
        });
        res.setHeader("X-Response-Cache", "MISS");
      }
      return sendJson(body);
    };

    return next();
  };
}

export function clearPublicResponseCache(prefix) {
  for (const key of publicResponseCache.keys()) {
    if (key.startsWith(prefix)) publicResponseCache.delete(key);
  }
}
