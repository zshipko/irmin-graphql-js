fetch = require('node-fetch');
const Irmin = require('../irmin.js').Irmin;

let ir = new Irmin("http://localhost:8080/graphql");

ir.master().info().then((res) => {
    console.log(res);
});
