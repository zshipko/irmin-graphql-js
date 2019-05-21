fetch = require('node-fetch');
const Irmin = require('../irmin.js').Irmin;

let ir = new Irmin("http://localhost:8080/graphql");
let master = ir.master();
master.set("abc", "1234").then(res => {
    console.log("Head: " + res.hash);
    master.get("abc").then(res => {
        console.log(res);
    });
});
