# Hasura Casing Layer

schema builder for adding `naming convention` transformation layer in front of hasura

## Installation

```bash
npm install hasura-casing-layer graphql @graphql-tools/wrap
```

## Usage

### Express

```ts
import express from "express";
import { transformRemoteSchema } from "hasura-casing-layer";
import { graphqlHTTP } from "express-graphql";
import { buildSchema } from "graphql";

const app = express();

const runServer = async () => {
  const hasuraSchema = await transformRemoteSchema({
    uri: "https://yourhasuraendpoint.com",
    // used for instrospection
    hasuraAdminSecret: "supersecret",
  });

  app.use(
    "/graphql",
    graphqlHTTP({
      schema: hasuraSchema,
      graphiql: true,
    })
  );

  app.listen(4000, () => {
    console.log("listeing at localhost:4000 🐐☁");
  });
};

runServer();
```

## License

MIT
