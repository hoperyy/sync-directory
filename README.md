## Description

`sync-directory` can sync files from src directory to target directory.

We have two ways to sync files: `hardlink` and `copy`.

If type is `copy`, `sync-directory` will copy files from src directory to target directory.

If type is `hardlink`, `sync-directory` can create hardlink files in target directory from src directory.

Apparently, the type `hardlink` is quicker than type `copy`, and `sync-directory` uses `hardlink` by default.

## Cli

```bash
npm i sync-directory -g
```

```bash
syncdir <from> <to> [options]
```

Example: `syncdir aaa bbb -w`

options:

+   `-w, --watch`

    Watch changes. `false` as default.
    
    Same as api `watch`.

+   `--quiet`

    Disable unnecessary logs.

+   `-do, --deleteOrphaned`

    Delete orphaned files/folders in target folder. `false` as default.

    Same as api `deleteOrphaned`.

+   `-c, --copy`

    Sync with type `copy`, `hardlink` as default.

    Same as api `type: 'copy'`.

+   `-symlink, --symlink`

    support symlink while sync running. `false` as default.

    Same as api `supportSymlink`.

## API Example

### sync

```js
const syncDirectory = require('sync-directory');

const delay = () => new Promise(r => setTimeout(r, 2000))

syncDirectory.sync(srcDir, targetDir, {
    afterEachSync({ type, relativePath, absolutePath }) {
        console.log(type, relativePath, absolutePath);
    },
});
```

### async

```js
const syncDirectory = require('sync-directory');

const delay = (time = 2000) => new Promise(r => setTimeout(r, time))

console.log('start'); // time a

// wait several 2s: 2 * file number
syncDirectory.async(srcDir, targetDir, {
    async afterEachSync({ type, relativePath, absolutePath }) {
        console.log(type, relativePath, absolutePath);
        await delay(2000); // delay 2s after one file was synced
    },
});

console.log('end'); // time a + 2 * (file number)
```

## Pick Your API

```js
const syncDirectory = require('sync-directory');
syncDirectory(srcDir, targetDir[, config]);
```

### Syntax

Function | Returns | Syntax | Block the thread?
---- | ---- | ---- | ----
`syncDirectory()`<br>`syncDirectory.sync()` | `undefined` or [chokidar watcher](https://github.com/paulmillr/chokidar) | Synchronous | Yes
`syncDirectory.async()` | `Promise` | `async / await`<br>`Promise.then()` | No
    
### Returns

```js
const watcher = syncDirectory(A, B);
```

`watcher` is `undefined`.

```js
const watcher = syncDirectory(A, B, {
    watch: true
});
```

`watcher` is a [chokidar watcher](https://github.com/paulmillr/chokidar).

### Params

+   list

    name | description | type | values | default | can be `async`
    ---- | ---- | ---- | ---- | ---- | ----
    `srcDir` | src directory | String | absolute path | - | -
    `targetDir` | target directory | String | absolute path | - | -
    `config.watch` | watch files change | Boolean | - | false | -
    `config.chokidarWatchOptions` | watch options ([chokidar](https://github.com/paulmillr/chokidar) is used for watching) | Object | - | `{}` | -
    `config.type` | way to sync files | String | `'copy' / 'hardlink'` | `'hardlink'` | -
    `config.deleteOrphaned` | Decide if you want to delete other files in targetDir when srcDir files are removed | Boolean | - | true | -
    `config.afterEachSync` | callback function when every file synced | Function | - | blank function | Yes when `syncDirectory.async()`
    `config.supportSymlink` | ensure symlink in target if src has symlinks | Boolean | - | false | -
    `config.exclude` | files that should not sync to target directory. | RegExp / String / Array (item is RegExp / String) | - | null | -
    `config.forceSync` | some files must be synced even though 'excluded' | Function | - | `(file) => { return false }` | No
    `config.filter` | callback function to filter synced files. Sync file when returning `true` | Function | - | `filepath => true` | No
    `config.onError` | callback function when something wrong | Function | - | `(err) => { throw new Error(err) }` | Yes when `syncDirectory.async()`

+   Example

    +   `watch`

        ```js
        syncDirectory(srcDir, targetDir, {
            watch: true
        });
        ```

    +   `chokidarWatchOptions`

        ```js
        syncDirectory(srcDir, targetDir, {
            chokidarWatchOptions: {
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                }
            },
        });
        ```

    +   `afterEachSync`

        ```js
        syncDirectory.sync(srcDir, targetDir, {
            afterEachSync({ type, relativePath, absolutePath }) {
                // type: init:hardlink / init:copy / add / change / unlink / unlinkDir
                // - init type: "init:hardlink" / "init:copy"
                // - watch type: "add" / "change" / "unlink" / "unlinkDir"

                // relativePath: relative file path
            }
        });

        await syncDirectory.async(srcDir, targetDir, {
            async afterEachSync({ type, relativePath, absolutePath }) {
                // type: init:hardlink / init:copy / add / change / unlink / unlinkDir
                // - init type: "init:hardlink" / "init:copy"
                // - watch type: "add" / "change" / "unlink" / "unlinkDir"

                // relativePath: relative file path
            }
        });
        ```

    +   `type`

        +   `copy`

            ```js
            syncDirectory(srcDir, targetDir, {
                type: 'copy'
            });
            ```

        +   `hardlink` (default)

            ```js
            syncDirectory(srcDir, targetDir);
            ```

    +   `exclude`

        exclude `node_modules`

        +   String

            ```js
            syncDirectory(srcDir, targetDir, {
                exclude: 'node_modules'
            });
            ```

        +   RegExp

            ```js
            syncDirectory(srcDir, targetDir, {
                exclude: /node\_modules/
            });
            ```

        +   Array

            ```js
            syncDirectory(srcDir, targetDir, {
                exclude: [/node\_modules/]
            });
            ```

            ```js
            syncDirectory(srcDir, targetDir, {
                exclude: ['node_modules']
            });
            ```

    +   `forceSync`

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude: 'node_modules',
            forceSync(file) {
                // all files in "node_modules" will be synced event though "exclude" is configed
                return /node_modules/.test(file);
            }
        });
        ```

    +   `supportSymlink`

        ```js
        // srcFolder:
        //     a/     a is symlink
        //      1.js

        // targetFolder:
        //     a/     a is not symlink
        //      1.js
        syncDirectory(srcDir, targetDir, {
            supportSymlink: false,
        });
        ```

        ```js
        // srcFolder:
        //     a/     a is symlink
        //      1.js

        // targetFolder:
        //     a/     a is the same symlink
        //      1.js
        syncDirectory(srcDir, targetDir, {
            supportSymlink: true,
        });
        ```