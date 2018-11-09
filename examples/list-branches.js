fetch = require('node-fetch');
const Irmin = require('../irmin.js').Irmin;

let ir = new Irmin("http://localhost:8080/graphql");

ir.branch("testing").set("a/b/c", "123").then((_) => {
    ir.branches().then((res) => {
        console.log(res);
    });
});
