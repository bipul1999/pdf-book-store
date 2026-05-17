export function formatSeconds(totalSeconds = 0) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function otpToastMessage(error, fallback) {
  const data = error.response?.data;
  if (data?.retryAfterSeconds) return `${data.message} Try again in ${formatSeconds(data.retryAfterSeconds)}.`;
  return data?.message || fallback;
}
