const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");
let main = ir.main();

let tree = {
    "aaa": {"value": "bbb"},
    "a/b/c": {"value": "123"},
};

async function main() {
    let a = await main.setTree("/", tree);
    let b = await main.getTree("/");
    console.log(b);
}

main();

