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
});
