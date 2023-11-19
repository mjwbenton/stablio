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
    highlights(limit: Int): [Highlight!]!
  }

  type Highlight {
    text: String!
    location: Int!
  }
`;

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
    {}
  );

  return ids.map((id) => ({
    id,
    highlights: byBook[id] || [],
  }));
});

const resolvers: Resolvers = {
  Book: {
    __resolveReference: async ({ id }) => {
      return DATALOADER.load(id);
    },
    highlights: async ({ id, highlights }, { limit }) => {
      return limit ? highlights.slice(0, limit) : highlights;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
