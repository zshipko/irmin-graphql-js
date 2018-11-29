// irmin.js provides simple bindings to access irmin-graphql endpoints from the browser.

// `request` is a small wrapper around `fetch` for sending requests to
// remote servers
function request(url, body){
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        header: {
            "Content-Type": "application/json"
        }
    });
}

// The `query` object contains all of the pre-defined queries
var query;

// Used to store keys as an array of strings, this is meant to mirror
// the way keys are represented in Irmin
class Key {
    constructor(k) {
        if (typeof k === 'string'){
            if (k[0] == '/'){
                k = k.slice(1);
            }

            if (k == ''){
                this.path = [];
                return;
            }

            this.path = k.split('/');
        } else {
            this.path = k
        }
    }

    append(x) {
        this.path.append(x);
    }

    string(){
        if (this.path && this.path.length > 0){
            return this.path.join('/');
        } else {
            return "/";
        }
    }
}

// `makeKey` converts a value into a key, if needed
function makeKey(k) {
    if (k instanceof Key){
        return k;
    }

    return new Key(k);
}

function makeTreeArray(tree, array, key){
    var treeArray = array || [];
  	key = key || [];

    for (var k in tree) {
        key.push(k);
        if (typeof tree[k].value === 'undefined') {
            makeTreeArray(tree[k], treeArray, key);
        } else {
            treeArray.push({key: makeKey(key).string(), value: tree[k].value, metadata: tree[k].metadata});
        }
        key.pop();
    }

    return treeArray;
}

function makeTree(arr) {
    var tree = {};
    for (var i = 0; i < arr.length; i++) {
        var key = makeKey(arr[i].key);
        var obj = tree;
        for(var j = 0; j < key.path.length; j++){
            if (j == key.path.length - 1) {
                obj[key.path[j]] = {value: arr[i].value, metadata: arr[i].metadata};
            } else {
                obj[key.path[j]] = obj[key.path[j]] || {};
                obj = obj[key.path[j]];
            }
        }
    }
    return tree;
}

class BranchRef {
    constructor(client, name){
        this.client = client;
        this.name = name;
    }

    // Execute a query, with the given variables and operation name
    execute({body, variables={}, operation=null}){
        variables["branch"] = this.name;
        return this.client.execute({body, variables, operation})
    }

    // Get a value from Irmin
    get(key){
        key = makeKey(key);
        return new Promise ((resolve, reject) => {
            this.execute({
                body: query.get,
                variables: {
                    key: key.string(),
                },
            }).then((x) => {
                resolve(x.branch.get)
            }, reject);
        })
    }

    // Get a value with metadata from Irmin
    getAll(key){
        key = makeKey(key);
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.getAll,
                variables: {
                    key: key.string()
                },
            }).then((x) => {
                resolve(x.branch.get_all)
            })
        })
    }

    getTree(key){
        key = makeKey(key);
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.getTree,
                variables: {
                    key: key.string()
                },
            }).then((x) => {
                let tree = makeTree(x.branch.get_tree);
                resolve(tree);
            })
        })
    }

    // Store a value in Irmin
    set(key, value, info=null){
        key = makeKey(key);
        return new Promise ((resolve, reject) => {
            this.execute({
                body: query.set,
                variables: {
                    key: key.string(),
                    value: value,
                    info: info,
                }
            }).then((x) => {
                resolve(x.set)
            }, reject);
        })
    }

    // Store a value in Irmin with provided metadata
    setAll(key, value, metadata, info=null){
        key = makeKey(key);
        return new Promise ((resolve, reject) => {
            this.execute({
                body: query.setAll,
                variables: {
                    key: key.string(),
                    value: value,
                    metadata: metadata,
                    info: info,
                }
            }).then((x) => {
                resolve(x.set_all)
            }, reject);
        })
    }

    updateTree(key, tree, info=null){
        key = makeKey(key);
        let treeArray = makeTreeArray(tree);
        return new Promise ((resolve, reject) => {
            this.execute({
                body: query.updateTree,
                variables: {
                    key: key.string(),
                    tree: treeArray,
                    info: info,
                }
            }).then((x) => {
                resolve(x.set_all)
            }, reject);
        })
    }

    setTree(key, tree, info=null){
        key = makeKey(key);
        let treeArray = makeTreeArray(tree);
        return new Promise ((resolve, reject) => {
            this.execute({
                body: query.setTree,
                variables: {
                    key: key.string(),
                    tree: treeArray,
                    info: info,
                }
            }).then((x) => {
                resolve(x.set_all)
            }, reject);
        })
    }

    // Remove a value
    remove(key, info=null){
        key = makeKey(key);
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.remove,
                variables: {
                    key: key.string(),
                    info: info,
                }
            }).then((x) => {
                resolve(x.remove)
            }, reject);
        })
    }

    // Merge branches
    merge(from, info=null){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.merge,
                variables: {
                    from: from,
                    info: info,
                }
            }).then((x) => {
                resolve(x.merge)
            }, reject);
        })
    }

    // Push to a remote repository
    push(remote){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.push,
                variables: {
                    remote: remote,
                }
            }).then((x) => {
                resolve(x.push)
            }, reject);
        })
    }

    // Pull from a remote repository
    pull(remote, info=null){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.pull,
                variables: {
                    remote: remote,
                    info: info,
                }
            }).then((x) => {
                resolve(x.pull)
            }, reject)
        })
    }

    // Restore Irmin to a previous state
    revert(commit){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.revert,
                variables: {
                    commit: commit,
                }
            }).then((x) => {
                resolve(x.revert.hash === commit)
            }, reject)
        })
    }

    // Clone from a remote repository
    clone(remote){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.clone,
                variables: {
                    remote: remote,
                    branch: branch,
                }
            }).then((x) => {
                resolve(x.clone)
            }, reject)
        })
    }

    // Returns information about the selected branch
    info(){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.branch,
            }).then((x) => {
                resolve(x.branch)
            }, reject)
        });
    }

    list(key){
        key = makeKey(key);
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.list,
                variables: {
                    key: key.string(),
                }
            }).then((x) => {
                let a = x.branch.head.node.get.tree;
                let b = {};
                for (var i = 0; i < a.length; i++){
                    b[makeKey(a[i].key).string()] = a[i].value;
                }
                resolve(b)
            }, reject)
        })
    }


}

// `Irmin` is the main client implementation
class Irmin {
    constructor(url){
        this.url = url;
    }

    branch(name) {
        return new BranchRef(this, name)
    }

    master() {
        return new BranchRef(this, "master")
    }

    branches() {
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.branches,
            }).then((res) => {
                resolve(res.branches);
            }, reject);
        });
    }

    // Execute a query, with the given variables and operation name
    execute({body, variables={}, operation=null}){
        let q = {
            query: body,
            operationName: operation,
            variables: variables,
        };

        return new Promise((resolve, reject) => {
            return request(this.url, q).then((response) => {
                response.text().then((x) => {
                    try {
                        let j = JSON.parse(x);
                        if (j["errors"]) {
                            reject(j);
                            return;
                        }
                        resolve(j.data)
                    } catch (err) {
                        reject({"errors": [err]})
                    }
                });
            }, reject);
        });
    }
}

query = {
get:
`
query Get($branch: String!, $key: String!) {
    branch(name: $branch) {
        get(key: $key) {
            value
        }
    }
}
`,

getAll:
`
query GetAll($branch: String!, $key: String!) {
    branch(name: $branch) {
        get_all(key: $key) {
            value
            metadata
        }
    }
}
`,

getTree:
`
query GetTree($branch: String!, $key: String!) {
    branch(name: $branch) {
        get_tree(key: $key) {
            key
            value
            metadata
        }
    }
}
`,

set:
`
mutation Set($branch: String, $key: String!, $value: String!, $info: InfoInput) {
    set(branch: $branch, key: $key, value: $value, info: $info) {
        hash
    }
}
`,

setAll:
`
mutation SetAll($branch: String, $key: String!, $value: String!, $metadata: String, $info: InfoInput) {
    set_all(branch: $branch, key: $key, value: $value, metadata: $metadata, info: $info) {
        hash
    }
}
`,

updateTree:
`
mutation SetTree($branch: String, $key: String!, $tree: [TreeInput!]!, $info: InfoInput) {
    update_tree(branch: $branch, key: $key, tree: $tree, info: $info) {
        hash
    }
}
`,

setTree:
`
mutation SetTree($branch: String, $key: String!, $tree: [TreeInput!]!, $info: InfoInput) {
    set_tree(branch: $branch, key: $key, tree: $tree, info: $info) {
        hash
    }
}
`,

remove:
`
mutation Remove($branch: String, $key: String!, $info: InfoInput) {
    remove(branch: $branch, key: $key, info: $info) {
        hash
    }
}
`,

merge:
`
mutation Merge($branch: String, $from: String!, $info: InfoInput) {
    merge(branch: $branch, from: $from, info: $info) {
        hash
    }
}
`,

push:
`
mutation Push($branch: String, $remote: String!) {
    push(branch: $branch, remote: $remote)
}
`,

pull:
`
mutation Pull($branch: String, $remote: String!, $info: InfoInput) {
    pull(branch: $branch, remote: $remote, info: $info) {
        hash
    }
}
`,

clone:
`
mutation Clone($branch: String, $remote: String!) {
    clone(branch: $branch, remote: $remote) {
        hash
    }
}
`,

revert:
`
mutation Revert($branch: String, $commit: String!) {
    revert(branch: $branch, commit: $commit) {
        hash
    }
}
`,

master:
`
query {
    master {
        name
        head {
            hash,
            info {
                message,
                author,
                date
            }
            parents {
                hash
            }
        }
    }
}
`,

branch:
`
query GetBranch($branch: String!) {
    branch(name: $branch) {
        name,
        head {
            hash,
            info {
                message,
                author,
                date
            }
            parents {
                hash
            }
        }
    }
}
`,

list:
`
query List($branch: String!, $key: String!) {
    branch(name: $branch) {
        head {
            node {
                get(key: $key) {
                    tree {
                        key,
                        value
                    }
                }
            }
        }
    }
}
`,

branches:
`
query {
    branches
}
`
};

if (typeof exports != "undefined") {
    exports.Irmin = Irmin;
    exports.Key = Key;
}
