const WORDS_NOT_TO_CAPITALIZE = [
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "down",
  "for",
  "from",
  "if",
  "in",
  "into",
  "like",
  "near",
  "nor",
  "of",
  "off",
  "on",
  "once",
  "onto",
  "or",
  "over",
  "past",
  "so",
  "than",
  "that",
  "the",
  "to",
  "upon",
  "with",
  "yet",
];

export function formatTitle(title: string): string {
  if (!title) return "";

  // Split on colon and take first part, then clean up spaces
  const [mainTitle] = title.split(":").map((s) => s.trim());
  const words = mainTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) return "";

  return words
    .map((word, i) => {
      if (i !== 0 && WORDS_NOT_TO_CAPITALIZE.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
