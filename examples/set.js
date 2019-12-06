const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");
let master = ir.master();

async function main() {
    let _results = await master.set("abc", "1234");
    console.log("Head: ", _results.hash);
    let abc = await master.get("abc");
    console.log(abc);
}

main();
