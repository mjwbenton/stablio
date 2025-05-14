import { describe, it, expect } from "@jest/globals";
import { formatTitle } from "./formatTitle.js";

describe("formatTitle", () => {
  it("should capitalize first word regardless of type", () => {
    expect(formatTitle("the great gatsby")).toBe("The Great Gatsby");
    expect(formatTitle("a tale of two cities")).toBe("A Tale of Two Cities");
  });

  it("should not capitalize certain words when not first", () => {
    expect(formatTitle("The Lord of the Rings")).toBe("The Lord of the Rings");
    expect(formatTitle("Gone with the Wind")).toBe("Gone with the Wind");
  });

  it("should handle subtitles by taking only the main title", () => {
    expect(formatTitle("Normal People: A Novel")).toBe("Normal People");
    expect(
      formatTitle(
        "Intermezzo: The global #1 bestseller from the author of Normal People",
      ),
    ).toBe("Intermezzo");
  });

  it("should handle extra spaces", () => {
    expect(formatTitle("  the   great   gatsby  ")).toBe("The Great Gatsby");
  });

  it("should handle single word titles", () => {
    expect(formatTitle("intermezzo")).toBe("Intermezzo");
    expect(formatTitle("the")).toBe("The");
  });

  it("should handle empty strings", () => {
    expect(formatTitle("")).toBe("");
  });

  it("should only lower case first letters of words", () => {
    expect(formatTitle("Ex-Footballer")).toBe("Ex-Footballer");
  });
});
