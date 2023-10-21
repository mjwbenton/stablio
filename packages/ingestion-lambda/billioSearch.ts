import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  gql,
} from "@apollo/client/core";

const ENDPOINT = "https://api-readonly.billio.mattb.tech";
const CLIENT = new ApolloClient({
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: "network-only",
    },
  },
  link: new HttpLink({
    uri: ENDPOINT,
  }),
});

const SEARCH_QUERY = gql`
  query SearchBook($searchTerm: String!) {
    books(first: 1, searchTerm: $searchTerm) {
      items {
        id
      }
    }
  }
`;

export async function findBillioId(title: string) {
  const formattedTitle = formatSearchTerm(title);
  console.log(`Searching billio with search term: ${formattedTitle}`);
  const result = await CLIENT.query({
    query: SEARCH_QUERY,
    variables: {
      searchTerm: title,
    },
  });
  console.log(`GraphQL Response: ${JSON.stringify(result, null, 2)}`);
  const billioId = result.data.books.items?.[0]?.id;
  console.log(`Found billioId: ${billioId}`);
  return billioId;
}

function formatSearchTerm(title: string) {
  const [mainTitle] = title.split(":");
  const recased = mainTitle
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
  return recased;
}
