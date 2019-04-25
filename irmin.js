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
            let tree = res.branch.tree.get_tree.list_contents_recursively;
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

    list(key){
        return this._query("list", {
            key: key,
        }, res => {
            let a = res.branch.head.tree.get_tree.list;
            let b = {};
            for (var i = 0; i < a.length; i++){
                if (typeof a[i].value == "undefined") continue;
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
  "get": `query Get($branch: BranchName!, $key: Key!) {
      branch(name: $branch) {
          tree {
              get(key: $key)
          }
      }
  }`,

  "get_tree": `query GetTree($branch: BranchName!, $key: Key!) {
      branch(name: $branch) {
          tree {
              get_tree(key: $key) {
                list_contents_recursively {
                    key
                    value
                    metadata
                }
             }
          }
      }
  }`,

  "set": `mutation Set($branch: BranchName!, $key: Key!, $value: Value!, $info: InfoInput) {
      set(branch: $branch, key: $key, value: $value, info: $info) {
          hash
      }
  }`,

  "update_tree": `mutation UpdateTree($branch: BranchName!, $key: Key!, $tree: [TreeItem!]!, $info: InfoInput) {
      update_tree(branch: $branch, key: $key, tree: $tree, info: $info) {
          hash
      }
  } `,

  "set_tree": `mutation SetTree($branch: BranchName!, $key: Key!, $tree: [TreeItem!]! , $info: InfoInput) {
      set_tree(branch: $branch, key: $key, tree: $tree, info: $info) {
          hash
      }
  }`,

  "remove": `mutation Remove($branch: BranchName!, $key: Key!, $info: InfoInput) {
      remove(branch: $branch, key: $key, info: $info) {
          hash
      }
  } `,

  "merge": `mutation Merge($branch: BranchName, $from: BranchName!, $info: InfoInput) {
      merge(branch: $branch, from: $from, info: $info) {
          hash
      }
  }`,

  "push": `mutation Push($branch: BranchName, $remote: Remote!) {
      push(branch: $branch, remote: $remote)
  }`,

  "pull": `mutation Pull($branch: BranchName, $remote: Remote!, $info: InfoInput) {
      pull(branch: $branch, remote: $remote, info: $info) {
          hash
      }
  } `,

  "clone": `mutation Clone($branch: BranchName, $remote: Remote!) {
      clone(branch: $branch, remote: $remote) {
          hash
      }
  } `,

  "revert": `mutation Revert($branch: BranchName, $commit: CommitHash!) {
      revert(branch: $branch, commit: $commit) {
          hash     }
  } `,

  "branch_info": `query BranchInfo($branch: BranchName!) {
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
  } `,

  "commit_info": `query CommitInfo($hash: CommitHash!) {
      commit(hash: $hash) {
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
  } `,

  "branches": `query { branches }`,
  "get_all": `query GetAll($branch: BranchName!, $key: Key!) {
      branch(name: $branch) {
          get_all(key: $key) {
              value
              metadata
          }
      }
  } `,

  "set_all": `mutation SetAll($branch: BranchName, $key: Key!, $value: Value!, $metadata: Metadata, $info: InfoInput) {
      set_all(branch: $branch, key: $key, value: $value, metadata: $metadata, info: $info) {
          hash
      }
  } `,

  "list": `query List($branch: BranchName!, $key: Key!) {
      branch(name: $branch) {
          head {
              tree {
                  get_tree(key: $key) {
                      list {
                          ... on Contents {
                              key,
                              value
                          }
                      }
                  }
              }
          }
      }
  } `,
}
