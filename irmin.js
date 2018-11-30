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

function trimChar(string, charToRemove) {
    while(string.charAt(0)==charToRemove) {
        string = string.substring(1);
    }

    while(string.charAt(string.length-1)==charToRemove) {
        string = string.substring(0,string.length-1);
    }

    return string;
}

// Used to store keys as an array of strings, this is meant to mirror
// the way keys are represented in Irmin
class Key {
    constructor(k) {
        if (typeof k === 'string'){
            k = trimChar(k, '/');
            if (k == ''){
                this.path = [];
                return;
            }

            this.path = k.split('/');
        } else {
            this.path = k ? k : [];
        }

        for (var i = 0; i < this.path.length; i++){
            if (this.path[i] === ''){
                this.path.splice(i, i+1);
            }
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
                body: query.get_all,
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
                body: query.get_tree,
                variables: {
                    key: key.string()
                },
            }).then((x) => {
                let tree = x.branch.get_tree;
                var obj = {};
                for(var i = 0; i < tree.length; i++){
                    var item = tree[i];
                    obj[makeKey(item.key).string()] = {metadata: item.metadata, value: item.value};
                }
                resolve(obj);
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
                body: query.set_all,
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

    setTree(key, tree, info=null){
        key = makeKey(key);
        return new Promise ((resolve, reject) => {
            var treeArray = [];

            for (var k in tree) {
                treeArray.push({key: k, value: tree[k].value, metadata: tree[k].metadata})
            }

            this.execute({
                body: query.set_tree,
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
                body: query.branch_info,
            }).then((x) => {
                resolve(x.branch)
            }, reject)
        });
    }

    list(key){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.list,
                variables: {
                    key: key,
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
                        resolve(JSON.parse(x).data)
                    } catch (err) {
                        reject(x)
                    }
                });
            }, reject);
        });
    }
}

if (typeof exports != "undefined") {
    exports.Irmin = Irmin;
    exports.Key = Key;
}

// queries

query = {
  "get": "\n  query Get($branch: BranchName!, $key: Key!) {\n    branch(name: $branch) {\n      get(key: $key)\n    }\n  }\n",
  "get_tree": "\n  query GetTree($branch: BranchName!, $key: Key!) {\n    branch(name: $branch) {\n      get_tree(key: $key) {\n        key\n        value\n        metadata\n      }\n    }\n  }\n",
  "set": "\n  mutation Set($branch: BranchName!, $key: Key!, $value: Value!, $info: InfoInput) {\n    set(branch: $branch, key: $key, value: $value, info: $info) {\n      hash\n    }\n  }\n",
  "update_tree": "\n  mutation UpdateTree($branch: BranchName!, $key: Key!, $tree: [TreeItem!]!, $info: InfoInput) {\n    update_tree(branch: $branch, key: $key, tree: $tree, info: $info) {\n      hash\n    }\n  }\n",
  "set_tree": "\n  mutation SetTree($branch: BranchName!, $key: Key!, $tree: [TreeItem!]! , $info: InfoInput) {\n    set_tree(branch: $branch, key: $key, tree: $tree, info: $info) {\n      hash\n    }\n  }\n",
  "remove": "\n  mutation Remove($branch: BranchName!, $key: Key!, $info: InfoInput) {\n    remove(branch: $branch, key: $key, info: $info) {\n      hash\n    }\n  }\n",
  "merge": "\n  mutation Merge($branch: BranchName, $from: BranchName!, $info: InfoInput) {\n      merge(branch: $branch, from: $from, info: $info) {\n          hash\n      }\n  }\n",
  "push": "\n  mutation Push($branch: BranchName, $remote: Remote!) {\n    push(branch: $branch, remote: $remote)\n  }\n",
  "pull": "\n  mutation Pull($branch: BranchName, $remote: Remote!, $info: InfoInput) {\n    pull(branch: $branch, remote: $remote, info: $info) {\n      hash\n    }\n  }\n",
  "clone": "\n  mutation Clone($branch: BranchName, $remote: Remote!) {\n    clone(branch: $branch, remote: $remote) {\n      hash\n    }\n  }\n",
  "revert": "\n  mutation Revert($branch: BranchName, $commit: CommitHash!) {\n    revert(branch: $branch, commit: $commit) {\n      hash\n    }\n  }\n",
  "lca": "\n  query($branch: BranchName!, $hash: CommitHash!) {\n    branch(name: $branch) {\n      lca(commit: $hash) {\n        hash,\n        info {\n          message,\n          author,\n          date\n        }\n        parents {\n          hash\n        }\n      }\n    }\n  }\n",
  "branch_info": "\n  query BranchInfo($branch: BranchName!) {\n      branch(name: $branch) {\n        name,\n        head {\n          hash,\n          info {\n            message,\n            author,\n            date\n          }\n          parents {\n            hash\n          }\n        }\n      }\n  }\n",
  "commit_info": "\n  query CommitInfo($hash: CommitHash!) {\n    commit(hash: $hash) {\n      hash,\n      info {\n          message,\n          author,\n          date\n      }\n      parents {\n          hash\n      }\n    }\n",
  "branches": "query { branches }"
}
