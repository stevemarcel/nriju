const range = (start, end) =>
  start > end
    ? []
    : Array.from({ length: end - start + 1 }, (_, index) => start + index);

const pageItem = (value) => ({ type: "page", value });

const gapItem = (position, start, end) => ({
  type: "gap",
  position,
  pages: range(start, end),
});

export const getPaginationItems = (currentPage, pageCount) => {
  const totalPages = Math.max(1, Math.trunc(Number(pageCount)) || 1);
  const selectedPage = Math.min(
    Math.max(1, Math.trunc(Number(currentPage)) || 1),
    totalPages,
  );

  if (totalPages <= 7) return range(1, totalPages).map(pageItem);

  if (selectedPage <= 4) {
    return [
      ...range(1, 5).map(pageItem),
      gapItem("after", 6, totalPages - 1),
      pageItem(totalPages),
    ];
  }

  if (selectedPage >= totalPages - 3) {
    return [
      pageItem(1),
      gapItem("before", 2, totalPages - 5),
      ...range(totalPages - 4, totalPages).map(pageItem),
    ];
  }

  return [
    pageItem(1),
    gapItem("before", 2, selectedPage - 2),
    ...range(selectedPage - 1, selectedPage + 1).map(pageItem),
    gapItem("after", selectedPage + 2, totalPages - 1),
    pageItem(totalPages),
  ];
};
