const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");
let master = ir.master();

async function main() {
    let _results = await master.set("test", "123");
    let list = await master.list("/");
    console.log(list);
}

main();
