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

function cleanText(text: string): string {
  console.log("Before cleaning:", JSON.stringify(text));
  const result = text
    .replace(/\s+/g, " ") // First normalize all whitespace to single spaces
    .replace(/[''`]\s+([a-zA-Z])/g, "'$1") // Remove spaces between any type of apostrophe and any following letter
    .trim();
  console.log("After cleaning:", JSON.stringify(result));
  return result;
}

export function parseHighlightsFromPages(pages: Page[]): BookHighlights {
  // Extract title and author from first line of first page
  const firstLine = pages[0].text.split("\n")[0];
  const match = firstLine.match(/^[0-9]+ (.*?) by (.*?) Free/);
  if (!match) {
    throw new Error("Could not extract book title and author from PDF");
  }

  const [_, rawTitle, rawAuthor] = match;
  const title = cleanText(rawTitle);
  const author = cleanText(rawAuthor);

  // Extract highlights from all pages
  const highlights: BookHighlights["highlights"] = [];

  // Process each page separately
  for (const page of pages) {
    // Split on "Highlight (Yellow)" to get each highlight section
    const sections = page.text.split("Highlight  (Yellow)").slice(1);

    for (const section of sections) {
      // Extract page number and highlight text
      const pageMatch = section.match(
        /\|\s*Page\s*([0-9]+)\s+(.*?)(?=(?:Page\s*[0-9]+|Highlight\s*\(Yellow\)|$))/s
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
