const formatTimeAgo = (dateValue) => {
  if (!dateValue) return "Not saved yet";

  const savedAt = new Date(dateValue);

  if (Number.isNaN(savedAt.getTime())) {
    return "Not saved yet";
  }

  const elapsedMs = Date.now() - savedAt.getTime();

  // Handle future timestamps
  if (elapsedMs <= 0) return "Just now";

  const minutes = Math.floor(elapsedMs / (1000 * 60));
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (hours < 48) return "Yesterday";

  if (days < 7) {
    return `${days} days ago`;
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);

  if (months < 12) {
    return months === 1 ? "Last month" : `${months} months ago`;
  }

  const years = Math.floor(days / 365);

  return years === 1 ? "Last year" : `${years} years ago`;
};

export default formatTimeAgo;
