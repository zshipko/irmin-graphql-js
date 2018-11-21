fetch = require('node-fetch');
const Irmin = require('../irmin.js').Irmin;

let ir = new Irmin("http://localhost:8080/graphql");
let master = ir.master();

let tree = {
    "aaa": {"value": "bbb"},
    "a/b/c": {"value": "123"},
};

master.setTree(null, tree).then((_) => {
    master.getTree(null).then((res) => {
        console.log(res);
    });
});
