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
        text: "123 Test Book by Test Author Free Some content Page  67 Highlight  (Yellow)  |  Page  67 First  highlight  text Highlight  (Yellow)  |  Page  67 Second  highlight  text",
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
        text: "Some text Page  45 Highlight  (Yellow)  |  Page  45 Page  two  highlight",
      },
      {
        page: 3,
        text: "More text Page  89 Highlight  (Yellow)  |  Page  89 Page  three  highlight",
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
      "Could not extract book title and author from PDF",
    );
  });

  it("should handle malformed highlight sections", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book by Test Author Free Highlight  (Yellow) malformed highlight Highlight  (Yellow)  |  Page  67 Valid  highlight Highlight  (Yellow) another malformed highlight",
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
        text: "123 Test Book by Test Author Free Page  67 Highlight  (Yellow)  |  Page  67    Text  with  spaces    ",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "Text with spaces",
    });
  });

  it("should handle actual Kindle format with extra spaces", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free  Kindle  instant  preview:  https: //read. amazon. com/kp/test Page  67 Highlight  (Yellow)  |  Page  67 First  highlight  text  with  extra  spaces Highlight  (Yellow)  |  Page  67 Second  highlight  text  with  spaces",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.title).toBe("Test Book");
    expect(result.author).toBe("Test Author");
    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "First highlight text with extra spaces",
    });
    expect(result.highlights[1]).toEqual({
      location: 67,
      text: "Second highlight text with spaces",
    });
  });

  it("should handle real Kindle page with multiple highlights", () => {
    const pages = [
      {
        page: 1,
        text: "1 Intermezzo:  The  global  #1  bestseller  from  the  author  of  Normal  People by  Rooney,  Sally Free  Kindle  instant  preview:  https: //read. amazon. com/kp/kshare? asin=B0CW1FQX9P 30  Highlights   |  Yellow  (30) Page  17 Highlight  (Yellow)  |  Page  17 Had  believed  once  that  life  must  lead  to  something,  all  the  unresolved  conflicts  and  questions  leading  on  towards  some  great  culmination.  Curiously  underexamined  beliefs  like  that,  underpinning  his  life,  his  personality.  Irrational  attachment  to  meaning. Page  32 Highlight  (Yellow)  |  Page  32 Do  chess  players  think  of  themselves  that  way,  as  the  king  piece? Page  67 Highlight  (Yellow)  |  Page  67 The  meaningless  lives  people  live.  And  afterwards,  oblivion,  forever Highlight  (Yellow)  |  Page  67 Just  to  think,  or  not  even  think,  but  to  overhear  the  words  inside  his  own  head. Page  76 Highlight  (Yellow)  |  Page  76 Relationship  mutilated  by  circumstance  into  something  illegible.  Platonic  life  partnership. Highlight  (Yellow)  |  Page  76 All  the  good  in  him,  what  little  there  is.  Trying  to  be  loved  by  her.  His  morality.  Principle  of  his  life.  She  looks  back  at  him.",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.title).toBe(
      "Intermezzo: The global #1 bestseller from the author of Normal People",
    );
    expect(result.author).toBe("Rooney, Sally");
    expect(result.highlights).toHaveLength(6);
    expect(result.highlights).toEqual([
      {
        location: 17,
        text: "Had believed once that life must lead to something, all the unresolved conflicts and questions leading on towards some great culmination. Curiously underexamined beliefs like that, underpinning his life, his personality. Irrational attachment to meaning.",
      },
      {
        location: 32,
        text: "Do chess players think of themselves that way, as the king piece?",
      },
      {
        location: 67,
        text: "The meaningless lives people live. And afterwards, oblivion, forever",
      },
      {
        location: 67,
        text: "Just to think, or not even think, but to overhear the words inside his own head.",
      },
      {
        location: 76,
        text: "Relationship mutilated by circumstance into something illegible. Platonic life partnership.",
      },
      {
        location: 76,
        text: "All the good in him, what little there is. Trying to be loved by her. His morality. Principle of his life. She looks back at him.",
      },
    ]);
  });

  it("should properly handle contractions in highlight text", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free\nPage  67 Highlight  (Yellow)  |  Page  67 It' s important that they' re aware that we' ve done what' s needed and don' t need more.",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "It's important that they're aware that we've done what's needed and don't need more.",
    });
  });

  it("should handle real example with contractions", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free\nPage  67 Highlight  (Yellow)  |  Page  67 Honesty is powerful but it' s not something that comes easily to allistic people because they' re so driven to fit in with others that they prize collective values over truth.",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "Honesty is powerful but it's not something that comes easily to allistic people because they're so driven to fit in with others that they prize collective values over truth.",
    });
  });

  it("should handle different types of apostrophes", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free\nPage  67 Highlight  (Yellow)  |  Page  67 Here' s a test with ASCII, here' s one with Unicode.",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "Here's a test with ASCII, here's one with Unicode.",
    });
  });

  it("should handle 'Location' instead of 'Page' in highlight format", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free\nLocation  67 Highlight  (Yellow)  |  Location  67 This is a highlight with Location instead of Page Highlight  (Yellow)  |  Location  89 And another one.",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "This is a highlight with Location instead of Page",
    });
    expect(result.highlights[1]).toEqual({
      location: 89,
      text: "And another one.",
    });
  });

  it("should handle mixed usage of 'Page' and 'Location'", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free\nPage  67 Highlight  (Yellow)  |  Page  67 This uses Page Highlight  (Yellow)  |  Location  89 This uses Location.",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "This uses Page",
    });
    expect(result.highlights[1]).toEqual({
      location: 89,
      text: "This uses Location.",
    });
  });

  it("should clean up spaces after dashes without spaces before them", () => {
    const pages = [
      {
        page: 1,
        text: "1 Test Book by Test Author Free\nPage  67 Highlight  (Yellow)  |  Page  67 treatment in separate and better- equipped facilities - seems perfectly sensible",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]).toEqual({
      location: 67,
      text: "treatment in separate and better-equipped facilities - seems perfectly sensible",
    });
  });

  it("should handle PDFs without an author", () => {
    const pages = [
      {
        page: 1,
        text: "123 Test Book Title Free\nSome other content",
      },
    ];

    const result = parseHighlightsFromPages(pages);

    expect(result.title).toBe("Test Book Title");
    expect(result.author).toBe("");
    expect(result.highlights).toHaveLength(0);
  });
});
