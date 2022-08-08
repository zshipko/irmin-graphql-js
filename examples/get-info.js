const {Irmin} = require('../irmin.js');

let ir = new Irmin("http://localhost:8080/graphql");

async function main() {
    let info = await ir.main().info();
    console.log(info);
}

main();
