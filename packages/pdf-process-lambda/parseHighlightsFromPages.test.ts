import { describe, it, expect } from "@jest/globals";
import { parseHighlightsFromPages } from "./parseHighlightsFromPages.js";

describe("parseHighlightsFromPages", () => {
  it("should extract title and author from first page", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book Title by Test Author Free\nSome other content",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.title).toBe("Test Book Title");
    expect(result.author).toBe("Test Author");
    expect(result.highlights).toHaveLength(0);
  });

  it("should extract multiple highlights from a single page", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book by Test Author Free Some content Highlight (Yellow) | Page 67 First highlight text Highlight (Yellow) | Page 67 Second highlight text",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "First highlight text",
    });
    expect(result.highlights[1]).toEqual({
      location: 67,
      text: "Second highlight text",
    });
  });

  it("should extract highlights from multiple pages", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book by Test Author Free Some content",
      },
      {
        page: 2,
        text: "Some text Highlight (Yellow) | Page 45 Page two highlight",
      },
      {
        page: 3,
        text: "More text Highlight (Yellow) | Page 89 Page three highlight",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0]).toEqual({
      location: 45,
      text: "Page two highlight",
    });
    expect(result.highlights[1]).toEqual({
      location: 89,
      text: "Page three highlight",
    });
  });

  it("should throw error when title/author format is invalid", () => {
    const pages = [
      {
        page: 1,
        text: "Invalid format without proper title and author",
      },
    ];

    expect(() => parseHighlightsFromPages(pages)).toThrow(
      "Could not extract book title and author from PDF"
    );
  });

  it("should handle malformed highlight sections", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book by Test Author Free Highlight (Yellow) malformed highlight Highlight (Yellow) | Page 67 Valid highlight Highlight (Yellow) another malformed highlight",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "Valid highlight",
    });
  });

  it("should properly trim highlight text", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book by Test Author Free Highlight (Yellow) | Page 67    Text with spaces    ",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "Text with spaces",
    });
  });
});
