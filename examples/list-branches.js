const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");

async function main() {
    let _results = await ir.branch("testing").set("a/b/c/", "123");
    let branches = await ir.branches();
    console.log(branches);
}

main();
