const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");
let main = ir.main();

async function main() {
    let _results = await main.set("abc", "1234");
    console.log("Head: ", _results.hash);
    let abc = await main.get("abc");
    console.log(abc);
}

main();
