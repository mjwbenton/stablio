import { describe, it, expect } from "@jest/globals";
import { extractPdfUrl } from "./extractPdfUrl.js";

describe("extractPdfUrl", () => {
  it("should extract PDF URL from email text", () => {
    const emailText = `Some email content
https://www.amazon.co.uk/gp/f.html?C=VI3YYSH8F8SH&M=urn:rtn:msg:202502151409032e102083bc25476fa505a88d9b80p0eu&R=23OT88PD0V259&T=C&U=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2F9697a5eb-2657-4b73-8108-8b126761ca84%2FNotebook.pdf%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Signature%3Ded5b4aee13812377698dca2faddf7119443294f310d8bb345478368921851a1e&H=M3JW8PBZZFAYQJSVIARIAY7TGBEA
More content`;

    const expected =
      "https://kindle-content-requests-prod.s3.amazonaws.com/9697a5eb-2657-4b73-8108-8b126761ca84/Notebook.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=ed5b4aee13812377698dca2faddf7119443294f310d8bb345478368921851a1e";
    expect(extractPdfUrl(emailText)).toBe(expected);
  });

  it("should extract PDF URL with different parameter order", () => {
    const emailText = `Some email content
https://www.amazon.co.uk/gp/f.html?M=123&T=C&U=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2Ftest.pdf&C=456&H=789
More content`;

    expect(extractPdfUrl(emailText)).toBe(
      "https://kindle-content-requests-prod.s3.amazonaws.com/test.pdf",
    );
  });

  it("should handle URLs with spaces in filename", () => {
    const emailText = `Some email content
https://www.amazon.co.uk/gp/f.html?C=123&T=C&U=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2FNotebook%2520-%2520Test%2520Book.pdf&H=789
More content`;

    expect(extractPdfUrl(emailText)).toBe(
      "https://kindle-content-requests-prod.s3.amazonaws.com/Notebook%20-%20Test%20Book.pdf",
    );
  });

  it("should return null for email without PDF URL", () => {
    const emailText = "Just some regular email content without any PDF links";
    expect(extractPdfUrl(emailText)).toBeNull();
  });

  it("should return null for email with malformed Amazon URL", () => {
    const emailText =
      "https://www.amazon.co.uk/gp/f.html?T=C&V=something-wrong";
    expect(extractPdfUrl(emailText)).toBeNull();
  });

  it("should handle case insensitivity", () => {
    const emailText = `Some email content
https://www.amazon.co.uk/gp/f.html?C=123&t=c&u=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2Ftest.pdf&H=789
More content`;

    expect(extractPdfUrl(emailText)).toBe(
      "https://kindle-content-requests-prod.s3.amazonaws.com/test.pdf",
    );
  });

  it("should handle real world example 1", () => {
    const emailText = `Some content
https://www.amazon.co.uk/gp/f.html?C=VI3YYSH8F8SH&M=urn:rtn:msg:202502151409032e102083bc25476fa505a88d9b80p0eu&R=23OT88PD0V259&T=C&U=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2F9697a5eb-2657-4b73-8108-8b126761ca84%2FNotebook%2520-%2520Strong%2520Female%2520Character_%2520Nero%2520Book%2520Awards%2520Winner.pdf%3Fresponse-cache-control%3Dno-store%26X-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Date%3D20250215T140847Z%26X-Amz-SignedHeaders%3Dhost%26X-Amz-Credential%3DAKIAQNGCF4J7JEMRW6XN%252F20250215%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Expires%3D604800%26X-Amz-Signature%3Ded5b4aee13812377698dca2faddf7119443294f310d8bb345478368921851a1e&H=M3JW8PBZZFAYQJSVIARIAY7TGBEA`;

    const expected =
      "https://kindle-content-requests-prod.s3.amazonaws.com/9697a5eb-2657-4b73-8108-8b126761ca84/Notebook%20-%20Strong%20Female%20Character_%20Nero%20Book%20Awards%20Winner.pdf?response-cache-control=no-store&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250215T140847Z&X-Amz-SignedHeaders=host&X-Amz-Credential=AKIAQNGCF4J7JEMRW6XN%2F20250215%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Expires=604800&X-Amz-Signature=ed5b4aee13812377698dca2faddf7119443294f310d8bb345478368921851a1e";
    expect(extractPdfUrl(emailText)).toBe(expected);
  });

  it("should handle real world example 2", () => {
    const emailText = `Some content
https://www.amazon.co.uk/gp/f.html?C=VI3YYSH8F8SH&M=urn:rtn:msg:20250215141310df83b3585fcc4694966f3a4a61d0p0eu&R=FFMKI24C2PLJ&T=C&U=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2F37996650-8fef-4610-a35d-37d99b567bdb%2FNotebook%2520-%2520The%2520Glass%2520Hotel_%2520The%2520Haunting%2520Novel%2520from%2520the%2520Author%2520of%2520Station%2520Eleven.pdf%3Fresponse-cache-control%3Dno-store%26X-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Date%3D20250215T141305Z%26X-Amz-SignedHeaders%3Dhost%26X-Amz-Credential%3DAKIAQNGCF4J7JEMRW6XN%252F20250215%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Expires%3D604800%26X-Amz-Signature%3D1228ac15c4f3a8c48c95a4ea3f742a63816c326bc9f0e0ce7b77e227cd752cd9&H=AEAV8ILQGIPZAP2FGCRYUFWCMHAA`;

    const expected =
      "https://kindle-content-requests-prod.s3.amazonaws.com/37996650-8fef-4610-a35d-37d99b567bdb/Notebook%20-%20The%20Glass%20Hotel_%20The%20Haunting%20Novel%20from%20the%20Author%20of%20Station%20Eleven.pdf?response-cache-control=no-store&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250215T141305Z&X-Amz-SignedHeaders=host&X-Amz-Credential=AKIAQNGCF4J7JEMRW6XN%2F20250215%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Expires=604800&X-Amz-Signature=1228ac15c4f3a8c48c95a4ea3f742a63816c326bc9f0e0ce7b77e227cd752cd9";
    expect(extractPdfUrl(emailText)).toBe(expected);
  });

  it("should handle real world example 3", () => {
    const emailText = `https://www.amazon.co.uk/gp/f.html?C=VI3YYSH8F8SH&M=urn:rtn:msg:202505141526007d65230c307a4c4dabf742c0d3a0p0eu&R=2A5C6FPAG4HCA&T=C&U=https%3A%2F%2Fkindle-content-requests-prod.s3.amazonaws.com%2F66388d53-143e-45d3-985a-9617f5ef7a66%2FNotebook%2520-%2520So%2520Much%2520Blue.pdf%3Fresponse-cache-control%3Dno-store%26X-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Date%3D20250514T152556Z%26X-Amz-SignedHeaders%3Dhost%26X-Amz-Credential%3DAKIAQNGCF4J7OA7CTIWR%252F20250514%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Expires%3D604800%26X-Amz-Signature%3De101161ca59643536f08e52126bccf8d1be0a76d6d6ec07d9dca251041f2c71f&H=3VMGOPIUXZIDLHGF8KSKUKIUZAKA`;
    const expected =
      "https://kindle-content-requests-prod.s3.amazonaws.com/66388d53-143e-45d3-985a-9617f5ef7a66/Notebook%20-%20So%20Much%20Blue.pdf?response-cache-control=no-store&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250514T152556Z&X-Amz-SignedHeaders=host&X-Amz-Credential=AKIAQNGCF4J7OA7CTIWR%2F20250514%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Expires=604800&X-Amz-Signature=e101161ca59643536f08e52126bccf8d1be0a76d6d6ec07d9dca251041f2c71f";
    expect(extractPdfUrl(emailText)).toBe(expected);
  });
});
