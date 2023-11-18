import { ApolloServer } from "@apollo/server";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { Resolvers } from "./generated/graphql";
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
    highlights: [Highlight!]!
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
    .innerJoin(highlight, eq(book.id, highlight.bookId));

  return ids.map((id) => {
    const highlights = result
      .filter(({ book: { billioId } }) => billioId === id)
      .map(({ highlight: { location, text } }) => ({
        location,
        text,
      }));
    return {
      id,
      highlights,
    };
  });
});

const resolvers: Resolvers = {
  Book: {
    __resolveReference: async ({ id }) => {
      return DATALOADER.load(id);
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
