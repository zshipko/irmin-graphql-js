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
