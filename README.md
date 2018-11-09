# irmin-js

`irmin.js` is a Javascript library for communicating directly with [irmin-graphql](https://github.com/andreas/irmin-graphql) servers. It is a core component of [irmin-web](https://github.com/zshipko/irmin-web), which is used to simplify the process of building single-page web applications using `irmin.js`.

## Getting started

To create an Irmin instance:

```javascript
var ir = new Irmin("https://127.0.0.1:8080/graphql");
```

Setting a value:

```javascript
ir.master().set("a/b/c", "123").then((commit_hash) => {
    console.log(commit_hash);
});
```

Getting a value:

```javascript
ir.master().get("a/b/c").then((value) => {
    console.log(value);
});
```

## Writing custom queries

When using `irmin.js` it is also very easy to execute custom queries:

```javascript
let body = `
    query GetExample($key: String!) {
        master {
            get(key: $key)
        }
    }
`;

let data = {
    body: body,
    vars: {
        key: "a/b/c"
    }
};

ir.execute(data).then((res) => {
    console.log(res.master.get);
});
```

In the example above, `body` is a string containing the actual query, `data` is an object with `body`, `vars` and `operation` fields. The `vars` and `operation` fields may be left undefined if not in use.

## Examples

There are some examples using NodeJS in the `examples/` directory, they require the `node-fetch` package to be installed via npm.
