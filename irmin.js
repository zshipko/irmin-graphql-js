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
            return null;
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

    // Store a value in Irmin
    set(key, value){
        key = makeKey(key);
        return new Promise ((resolve, reject) => {
            this.execute({
                body: query.set,
                variables: {
                    key: key.string(),
                    value: value,
                }
            }).then((x) => {
                resolve(x.set)
            }, reject);
        })
    }

    // Remove a value
    remove(key){
        key = makeKey(key);
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.remove,
                variables: {
                    key: key.string(),
                }
            }).then((x) => {
                resolve(x.remove)
            }, reject);
        })
    }

    // Merge branches
    merge(from){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.merge,
                variables: {
                    from: from,
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
    pull(remote){
        return new Promise((resolve, reject) => {
            this.execute({
                body: query.pull,
                variables: {
                    remote: remote,
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
                    b[a[i].key] = a[i].value;
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

set:
`
mutation Set($branch: String, $key: String!, $value: String!) {
    set(branch: $branch, key: $key, value: $value, info: null) {
        hash
    }
}
`,

remove:
`
mutation Remove($branch: String, $key: String!) {
    remove(branch: $branch, key: $key, info: null) {
        hash
    }
}
`,

merge:
`
mutation Merge($branch: String, $from: String!) {
    merge(branch: $branch, from: $from, info: null) {
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
mutation Pull($branch: String, $remote: String!) {
    pull(branch: $branch, remote: $remote, info: null) {
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

};
