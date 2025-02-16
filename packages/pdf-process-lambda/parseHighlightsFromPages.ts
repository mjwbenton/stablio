interface Page {
  page: number;
  text: string;
}

export interface BookHighlights {
  title: string;
  author: string;
  highlights: {
    location: number;
    text: string;
  }[];
}

const CONTRACTION_PATTERNS = [
  "s", // it's, that's
  "t", // don't, won't
  "d", // he'd, we'd
  "ll", // we'll, they'll
  "ve", // we've, they've
  "re", // they're, we're
  "m", // I'm
].join("|");

function cleanText(text: string): string {
  // List of letters/patterns that can follow an apostrophe in a contraction
  const result = text
    .replace(/\s+/g, " ") // First normalize all whitespace to single spaces
    .replace(/['‘’]/g, "'") // Normalize all quotes to simple apostrophes
    .replace(/([^\s])-\s+/g, "$1-") // Remove spaces after dashes when there's no space before the dash
    .replace(/'\s+/g, "'") // Remove any spaces after quotes (temporary)
    .replace(
      new RegExp(`([A-Za-z])'(?!(${CONTRACTION_PATTERNS})\\b)([A-Za-z])?`, "g"),
      "$1' $3"
    ) // Add space after non-contraction quotes
    .replace(/\s+([.,!?])/g, "$1") // Remove spaces before punctuation
    .trim();
  return result;
}

export function parseHighlightsFromPages(pages: Page[]): BookHighlights {
  // Extract title and author from first line of first page
  const firstLine = pages[0].text.split("\n")[0];
  const match = firstLine.match(/^[0-9]+ (.*?)(?:\s+by\s+(.*?))?\s+Free/);
  if (!match) {
    throw new Error("Could not extract book title and author from PDF");
  }

  const [_, rawTitle, rawAuthor] = match;
  const title = cleanText(rawTitle);
  const author = rawAuthor ? cleanText(rawAuthor) : "";

  // Extract highlights from all pages
  const highlights: BookHighlights["highlights"] = [];

  // Process each page separately
  for (const page of pages) {
    // Split on "Highlight (Yellow)" to get each highlight section
    const sections = page.text.split("Highlight  (Yellow)").slice(1);

    for (const section of sections) {
      // Extract page/location number and highlight text
      const pageMatch = section.match(
        /\|\s*(?:Page|Location)\s*([0-9]+)\s+(.*?)(?=(?:(?:Page|Location)\s*[0-9]+|Highlight\s*\(Yellow\)|$))/s
      );
      if (pageMatch) {
        const [_, pageStr, text] = pageMatch;
        highlights.push({
          location: parseInt(pageStr, 10),
          text: cleanText(text),
        });
      }
    }
  }

  return {
    title,
    author,
    highlights,
  };
}
