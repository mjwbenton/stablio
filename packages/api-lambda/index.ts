import { ApolloServer } from "@apollo/server";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { Resolvers } from "./generated/graphql";
import { db, book, highlight, eq } from "@mattb.tech/stablio-db";
import gql from "graphql-tag";

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Query {
    book(id: ID!): Book
  }

  type Book {
    highlights: [Highlight!]!
  }

  type Highlight {
    text: String!
    location: Int!
  }
`;

const resolvers: Resolvers = {
  Query: {
    book: async (_, { id }) => {
      const result = await (await db)
        .select()
        .from(book)
        .where(eq(book.billioId, id))
        .innerJoin(highlight, eq(book.id, highlight.bookId));
      return {
        highlights: result.map(({ highlight: { location, text } }) => ({
          location,
          text,
        })),
      };
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
