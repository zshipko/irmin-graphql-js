const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");
let main = ir.main();

async function main() {
    let _results = await main.set("test", "123");
    let list = await main.list("/");
    console.log(list);
}

main();
