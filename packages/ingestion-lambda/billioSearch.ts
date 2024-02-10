import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  gql,
} from "@apollo/client/core";

const WORDS_NOT_TO_CAPITALIZE = [
  "a",
  "and",
  "as",
  "at",
  "but",
  "by",
  "down",
  "for",
  "from",
  "if",
  "in",
  "into",
  "like",
  "near",
  "nor",
  "of",
  "off ",
  "on",
  "once",
  "onto",
  "or",
  "over",
  "past",
  "so",
  "than",
  "that",
  "the",
  "to",
  "upon",
  "when",
  "with",
  "yet",
];

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

export async function findBillioId(title: string): Promise<string | undefined> {
  const formattedTitle = formatSearchTerm(title);
  console.log(`Searching billio with search term: ${formattedTitle}`);
  const result = await CLIENT.query({
    query: SEARCH_QUERY,
    variables: {
      searchTerm: formattedTitle,
    },
  });
  const billioId = result.data.books.items?.[0]?.id;
  console.log(`Found billioId: ${billioId}`);
  return billioId;
}

function formatSearchTerm(title: string) {
  const [mainTitle] = title.split(":");
  const words = mainTitle.toLowerCase().split(" ");
  return words
    .map((word, i) => {
      if (i !== 0 && WORDS_NOT_TO_CAPITALIZE.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
