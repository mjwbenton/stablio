import { ApolloServer } from "@apollo/server";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { Highlight, Resolvers } from "./generated/graphql";
import { db, book, highlight, eq, inArray } from "@mattb.tech/stablio-db";
import gql from "graphql-tag";
import DataLoader from "dataloader";

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Book @key(fields: "id") {
    id: ID!
    highlights(first: Int, after: ID): PaginatedHighlights!
  }

  type PaginatedHighlights {
    items: [Highlight!]!
    total: Int!
    hasNextPage: Boolean!
    nextPageCursor: ID
  }

  type Highlight {
    text: String!
    location: Int!
  }
`;

type Book = {
  id: string;
};

const DEFAULT_PAGE_SIZE = 50;

const DATALOADER = new DataLoader(async (ids: readonly string[]) => {
  const result = await (
    await db
  )
    .select()
    .from(book)
    .where(inArray(book.billioId, [...ids]))
    .innerJoin(highlight, eq(book.id, highlight.bookId))
    .orderBy(highlight.location);

  const byBook = result.reduce<Record<string, Array<Highlight>>>(
    (acc, { book: { billioId }, highlight }) => {
      if (!billioId) {
        return acc;
      }
      if (!acc[billioId]) {
        acc[billioId] = [];
      }
      acc[billioId].push(highlight);
      return acc;
    },
    {},
  );

  return ids.map((id) => byBook[id] || []);
});

const resolvers: Resolvers = {
  Book: {
    __resolveReference: async ({ id }) => {
      return { id };
    },
    highlights: async ({ id }, { first, after }) => {
      const afterLocation = after ? cursorToLocation(after) : 0;
      const highlights = await DATALOADER.load(id);
      const afterIndex = highlights.findIndex(
        (highlight) => highlight.location > afterLocation,
      );
      const total = highlights.length;
      const items =
        afterIndex === -1
          ? []
          : highlights.slice(
              afterIndex,
              afterIndex + (first || DEFAULT_PAGE_SIZE),
            );
      const hasNextPage =
        afterIndex === -1 ? false : total > afterIndex + items.length;
      const nextPageCursor = hasNextPage
        ? locationToCursor(highlights[afterIndex + items.length - 1].location)
        : null;
      return {
        items,
        total,
        hasNextPage,
        nextPageCursor,
      };
    },
  },
};

function locationToCursor(location: number) {
  return Buffer.from(location.toString()).toString("base64");
}

function cursorToLocation(cursor: string) {
  return parseInt(Buffer.from(cursor, "base64").toString("utf-8"));
}

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
);
