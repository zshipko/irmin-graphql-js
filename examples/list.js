fetch = require('node-fetch');
const Irmin = require('../irmin.js').Irmin;

let ir = new Irmin("http://localhost:8080/graphql");
let master = ir.master();

master.set("test", "123").then(res => {
    master.list(null).then((res) => {
        console.log(res)
    });
});
