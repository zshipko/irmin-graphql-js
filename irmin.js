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

    _query(name, variables, callback, operationName) {
        for (var k in variables) {
            var v = variables[k];
            if (v instanceof Key) {
                variables[k] = v.string()
            }
        }
        return new Promise ((resolve, reject) => {
            this.execute({body: query[name], variables: variables, operationName: operationName}).then((x) => {
                resolve(callback(x));
            }, reject);
        })
    }

    // Get a value from Irmin
    get(key){
        key = makeKey(key);
        return this._query("get", {
            key: key
        }, (res) => {
            return res.branch.get;
        });
    }

    // Get a value with metadata from Irmin
    getAll(key){
        key = makeKey(key);
        return this._query("get_all", {
            key: key
        }, (res) => {
            return res.branch.get_all;
        });
    }

    getTree(key){
        key = makeKey(key);
        return this._query("get_tree", {
            key: key,
        }, (res) => {
            let tree = res.branch.get_tree;
            var obj = {};
            for(var i = 0; i < tree.length; i++){
                var item = tree[i];
                obj[makeKey(item.key).string()] = {metadata: item.metadata, value: item.value};
            }
            return obj;
        })
    }

    // Store a value in Irmin
    set(key, value, info=null){
        key = makeKey(key);
        return this._query("set", {
            key: key,
            value: value,
            info: info,
        }, (res) => {
            return res.set;
        });
    }

    // Store a value in Irmin with provided metadata
    setAll(key, value, metadata, info=null){
        key = makeKey(key);
        return this._query("set_all", {
            key: key,
            value: value,
            metadata: metadata,
            info: info,
        }, (res) => {
            return res.set_all;
        });
    }

    setTree(key, tree, info=null){
        key = makeKey(key);
        var treeArray = [];

        for (var k in tree) {
            treeArray.push({key: k, value: tree[k].value, metadata: tree[k].metadata})
        }
        return this._query("set_tree", {
            key: key,
            tree: treeArray,
            info: info,
        }, res => {
            return res.set_all;
        });
    }

    // Remove a value
    remove(key, info=null){
        key = makeKey(key);
        return this._query("remove", {
            key: key.string(),
            info: info,
        }, res => {
            return res.remove;
        });
    }

    // Merge branches
    merge(from, info=null){
        return this._query("merge", {
            from: from,
            info: info,
        }, res => {
            return res.merge;
        });
    }

    // Push to a remote repository
    push(remote){
        return this._query("push", {
            remote: remote,
        }, res => {
            return res.push;
        });
    }

    // Pull from a remote repository
    pull(remote, info=null){
        return this._query("pull", {
            remote: remote,
            info: info,
        }, res => {
            return res.pull;
        });
    }

    // Restore Irmin to a previous state
    revert(commit){
        return this._query("revert", {
            commit: commit,
        }, res => {
            return res.revert.hash === commit;
        });
    }

    // Clone from a remote repository
    clone(remote){
        return this._query("clone", {
            remote: remote,
            branch: branch,
        }, res => {
            return res.clone;
        });
    }

    // Returns information about the selected branch
    info(){
        return this._query("branch_info", {}, res => {
            return res.branch;
        });
    }

    list(step){
        return this._query("list", {
            step: step,
        }, res => {
            console.log(res);
            let a = res.branch.head.node.get.tree;
            let b = {};
            for (var i = 0; i < a.length; i++){
                b[makeKey(a[i].key).string()] = a[i].value;
            }
            return b;
        });
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
                    console.log(x);
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
  "branch_info": "\n  query BranchInfo($branch: BranchName!) {\n      branch(name: $branch) {\n        name,\n        head {\n          hash,\n          info {\n            message,\n            author,\n            date\n          }\n          parents {\n            hash\n          }\n        }\n      }\n  }\n",
  "commit_info": "\n  query CommitInfo($hash: CommitHash!) {\n    commit(hash: $hash) {\n      hash,\n      info {\n          message,\n          author,\n          date\n      }\n      parents {\n          hash\n      }\n    }\n  }\n",
  "branches": "query { branches }",
  "get_all": "\n  query GetAll($branch: BranchName!, $key: Key!) {\n      branch(name: $branch) {\n          get_all(key: $key) {\n              value\n              metadata\n          }\n      }\n  }\n",
  "set_all": "\n  mutation SetAll($branch: BranchName, $key: Key!, $value: Value!, $metadata: Metadata, $info: InfoInput) {\n      set_all(branch: $branch, key: $key, value: $value, metadata: $metadata, info: $info) {\n          hash\n      }\n  }\n",
  "list": "\n  query List($branch: BranchName!, $step: Step!) {\n      branch(name: $branch) {\n          head {\n              node {\n                  get(step: $step) {\n                      tree {\n                          key,\n                          value\n                      }\n                  }\n              }\n          }\n      }\n  }\n"
}
