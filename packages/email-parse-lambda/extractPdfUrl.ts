export function extractPdfUrl(emailText: string): string | null {
  const urlMatch = emailText.match(
    /https:\/\/www\.amazon\.co\.uk\/gp\/f\.html\?.*?(?:[?&]t=c&u=|[?&]T=C&U=)([^&\n]+)/i
  );
  console.log("Email text:", emailText);
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]);
  }
  return null;
}
