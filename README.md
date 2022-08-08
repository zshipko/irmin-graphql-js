# irmin-js

`irmin.js` is a Javascript library for communicating directly with [irmin-graphql](https://github.com/mirage/irmin) GraphQL servers.

## Getting started

To create an Irmin instance:

```javascript
var ir = new Irmin("https://127.0.0.1:8080/graphql");
```

Setting a value:

```javascript
let commit = await ir.main().set("a/b/c", "123");
console.log(commit.hash);
```

Getting a value:

```javascript
let value = await ir.main().get("a/b/c");
console.log(value);
```

## Writing custom queries

Once you get past the most basic operations you will most likely need to write and execute custom queries. `irmin.js` makes this easy:

```javascript
let body = `
    query GetExample($key: String!) {
        main {
          tree {
            get(key: $key)
          }
        }
    }
`;

let query = {
    body: body,
    vars: {
        key: "a/b/c"
    },
    operation: "GetExample"
};

let res = await ir.execute(query);
console.log(res.main.tree.get);
```

In the example above, `body` is a string containing the actual query, `data` is an object with `body`, `vars` and `operation` fields. The `vars` and `operation` fields may be left undefined if not in use.

## Examples

There are some examples using NodeJS in the `examples/` directory, they require the `node-fetch` package to be installed via npm.

You may also be interested in checking out the [GraphQL](https://irmin.io/tutorial/graphql) section of the [Irmin Tutorial](https://irmin.io/tutorial)!
