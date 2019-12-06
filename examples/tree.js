const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");
let master = ir.master();

let tree = {
    "aaa": {"value": "bbb"},
    "a/b/c": {"value": "123"},
};

async function main() {
    let a = await master.setTree("/", tree);
    let b = await master.getTree("/");
    console.log(b);
}

main();

