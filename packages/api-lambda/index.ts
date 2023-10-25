import { db, book, highlight, eq } from "@mattb.tech/stablio-db";

export async function handler(event: AWSLambda.APIGatewayProxyEventV2) {
  const [_, pathBook, billioId] = event.rawPath.split("/");
  if (pathBook != "book" || !billioId) {
    return {
      status: 404,
      body: `{}`,
    };
  }
  const result = await (await db)
    .select()
    .from(book)
    .where(eq(book.billioId, billioId))
    .innerJoin(highlight, eq(book.id, highlight.bookId));

  console.log(`Result from DB: ${JSON.stringify(result, null, 2)}`);

  if (!result.length) {
    return {
      statusCode: 404,
      body: `{}`,
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      billioId,
      highlights: result.map(({ highlight: { location, text } }) => ({
        location,
        text,
      })),
    }),
  };
}
