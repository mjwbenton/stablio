import { db, book, highlight, eq } from "@mattb.tech/stablio-db";

export async function handler(event: AWSLambda.APIGatewayProxyEventV2) {
  const [_, pathBook, billioId] = event.rawPath.split("/");
  if (pathBook != "book" || !billioId) {
    return response404();
  }
  const result = await (await db)
    .select()
    .from(book)
    .where(eq(book.billioId, billioId))
    .innerJoin(highlight, eq(book.id, highlight.bookId));

  console.log(`Result from DB: ${JSON.stringify(result, null, 2)}`);

  if (!result.length) {
    return response404();
  }

  return response200({
    billioId,
    highlights: result.map(({ highlight: { location, text } }) => ({
      location,
      text,
    })),
  });
}

function response404() {
  return {
    statusCode: 404,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: `{}`,
  };
}

function response200(body: any) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
