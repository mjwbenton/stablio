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

export function parseHighlightsFromPages(pages: Page[]): BookHighlights {
  // Extract title and author from first line of first page
  const firstLine = pages[0].text.split("\n")[0];
  const match = firstLine.match(/^[0-9]+ (.*?) by (.*?) Free/);
  if (!match) {
    throw new Error("Could not extract book title and author from PDF");
  }

  const [_, title, author] = match;

  // Extract highlights from all pages
  const highlights: BookHighlights["highlights"] = [];

  // Process each page separately
  for (const page of pages) {
    // Split on "Highlight (Yellow)" to get each highlight section
    const sections = page.text.split("Highlight (Yellow)").slice(1);

    for (const section of sections) {
      // Extract page number and highlight text
      const pageMatch = section.match(
        /\| Page ([0-9]+)\s*(.*?)(?=(?:Page [0-9]+|Highlight \(Yellow\)|$))/s
      );
      if (pageMatch) {
        const [_, pageStr, text] = pageMatch;
        highlights.push({
          location: parseInt(pageStr, 10),
          text: text.trim(),
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
