import { ApolloServer } from "@apollo/server";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { readFileSync } from "fs";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "graphql";
import { Resolvers } from "./generated/graphql";
import { db, book, highlight, eq } from "@mattb.tech/stablio-db";

const typeDefs = parse(readFileSync("./schema.graphql", { encoding: "utf-8" }));

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
  handlers.createAPIGatewayProxyEventRequestHandler()
);
