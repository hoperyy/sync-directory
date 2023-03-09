## Description

`sync-directory` can sync files from src directory to target directory.

**CLI** and **API** are supported.

We have two ways to sync files: `hardlink` and `copy`.

If type is `copy`, `sync-directory` will copy files from src directory to target directory.

If type is `hardlink`, `sync-directory` can create hardlink files in target directory from src directory.

`sync-directory` uses `copy` by default for safety. (`hardlink` will be quicker but some watchers can't trigger change event for target files.)

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
    
    Same as config `watch`.

+   `--quiet`

    Disable unnecessary logs.

+   `--exclude <strings...>`

    Exclude some path. Such as `syncdir a b --exclude node_modules package-lock.json`.

    Same as config `exclude`

+   `-si, --skipInitialSync`

    Skip the first time sync actions when it's `true`. It's useful when you just want the srcFolder to be watched. `false` as default.

    Same as config `skipInitialSync`.

+   `-nd, --nodeep`

    Just walk the first level sub files/folders. Avoids deep scanning of big folders.

    Same as config `nodeep`.

+   `-do, --deleteOrphaned`

    Delete orphaned or `excluded` (when using API) files/folders in target folder. `false` as default.

    Same as config `deleteOrphaned`.

+   `-hardlink, --hardlink`

    Sync with type `hardlink`, `copy` as default.

    Same as config `type: 'hardlink'`.

+   `-symlink, --symlink`

    support symlink while sync running. `false` as default.

    Same as config `staySymlink`.

## API (commonjs and esm are supported)

### sync

+   commonjs

    ```js
    const syncDirectory = require('sync-directory');
    ```

+   esm

    ```js
    import syncDirectory from 'sync-directory/index.mjs'
    ```

```js
syncDirectory(srcDir, targetDir, {
    afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {

    },
});
```

### async

+   commonjs

    ```js
    const { async } = require('sync-directory');
    ```

+   esm

    ```js
    import { async } from 'sync-directory/index.mjs'
    ```

```js
(async () => {
    const delay = (time = 2000) => new Promise(r => setTimeout(r, time));

    console.log('start'); // time a

    // wait several 2s: 2 * file number
    await async(srcDir, targetDir, {
        async afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {
            await delay(2000); // delay 2s after one file/folder was synced
        },
    });

    console.log('end'); // time a + 2 * (file number)
})()
```

## Pick Your API

+   commonjs

    ```js
    const syncDirectory = require('sync-directory');
    ```

+   esm

    ```js
    import syncDirectory from 'sync-directory/index.mjs';
    ```

```js
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

#### Params Overview

name | description | type | values | default | can be `async` ?
---- | ---- | ---- | ---- | ---- | ----
`srcDir` | src directory | String | absolute or relative path | - | -
`targetDir` | target directory | String | absolute or relative path | - | -
`config.cwd` | when srcDir or targetDir is a relative path, they will be formatted to absolute path by `path.join(cwd, srcDir | targetDir)` | string | - | `process.cwd()` | -
`config.watch` | watch file changes | Boolean | - | false | -
`config.chokidarWatchOptions` | watch options ([chokidar](https://github.com/paulmillr/chokidar) is used for watching) | Object | - | `{}` | -
`config.type` | way to sync files | String | `'copy' \| 'hardlink'` | `'copy'` | -
`config.skipInitialSync` | skip the first time sync actions when it's `true`. It's useful when you just want the srcFolder to be watched. | Boolean | `true \| false` | `false` | -
`config.deleteOrphaned` | delete orphaned or `excluded` (API using) files/folders in target folder. `false` as default. | Boolean | - | `false` | -
`config.afterEachSync` | callback function when every file synced | Function | - | blank function | Yes when `syncDirectory.async()`
`config.staySymlink` | if src folder "A/" is a symlink, the target folder "A/" will also be the same symlink.  | Boolean | - | false | -
`config.stayHardlink` | only worked when `type: 'hardlink'`. When `stayHardlink: true`, if src file is "src/a.js", the target file "target/a.js" will be a hardlink of "src/a.js".  | Boolean | - | `true` | -
`config.exclude` | Priority: `forceSync > exclude`. Filter which src files should not be synced. | RegExp / String / Array (item is RegExp / String) | - | null | -
`config.forceSync` | Priority: `forceSync > exclude`. Force sync some files even though they are `excluded`. | RegExp / String / Array (item is RegExp / String) | - | `(file) => { return false }` | No
`config.nodeep` | Just walk the first level sub files/folders. | Boolean | - | `false` | -
`config.onError` | callback function when something wrong | Function | - | `(err) => { throw new Error(err) }` | Yes when `syncDirectory.async()`

#### Some confusing params

![image](https://user-images.githubusercontent.com/5757051/171374990-b42a6978-9041-4265-b87d-a2950ec0da36.png)

#### Params Details

+   `cwd`

    Type: `String`

    Default: `process.cwd()`

    For: format `srcDir | targetDir` to absolute path when they are relative paths

    ```js
    syncDirectory(srcDir, targetDir, {
        cwd: __dirname
    });
    ```

+   `watch`

    Type: `true | false`

    Default: `false`

    For: watch file changes.

    ```js
    syncDirectory(srcDir, targetDir, {
        watch: true
    });
    ```

+   `chokidarWatchOptions`

    Type: `Object`

    Default: `{}`

    For: watch options ([chokidar](https://github.com/paulmillr/chokidar) is used for watching).

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

    Type: `Function`

    Default: `() => {}`

    For: callback function when every file synced.

    ```js
    syncDirectory.sync(srcDir, targetDir, {
        afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {

        }
    });

    await syncDirectory.async(srcDir, targetDir, {
        async afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {
            
        }
    });
    ```

    +   `eventType`: `"init:hardlink"` / `"init:copy"` / `"add"` / `"change"` / `"unlink"` / `"unlinkDir"` / `"addDir"`
    +   `nodeType`: `"file"` / `"dir"`
    +   `relativePath`: relative file/folder path
    +   `srcPath`: absolute or relative src file/folder path
    +   `targetPath`: absolute or relative target file/folder path

+   `type`

    Type: `'copy' | 'hardlink'`

    Default: `'copy'`

    For: way to sync files.

    +   `copy` (default)

        ```js
        syncDirectory(srcDir, targetDir);
        ```

    +   `hardlink`

        ```js
        syncDirectory(srcDir, targetDir, {
            type: 'hardlink'
        });
        ```

+   `skipInitialSync`

    Type: `true | false`

    Default: `false`

    For: enhance the performance

    It's for enhancing the sync performance when you just want `srcDir` to be watched.

    ```js
    syncDirectory(srcDir, targetDir, {
        skipInitialSync: true,
        watch: true,
    })
    ```

    The `srcDir` won't be synced to `targetDir` when `skipInitialSync: true` and the `srcDir`'s file changes will be watched and synced to `targetDir`.

+   `stayHardlink`

    Type: `true | false`

    Default: `true`

    Only works when `type: 'hardlink'`. 
    
    When `stayHardlink: true`, if src file is "src/a.js", the target file "target/a.js" will be a hardlink of "src/a.js". 
    
    Then when "src/a.js" changed, "target/a.js" will remain a hardlink. Otherwise will be a copied file.

    >   Some watchers will not be able to watch changes of "target/a.js".

+   `nodeep`

    Type: `true | false`

    Default: `false`

    Just walk the first level sub files/folders. Avoids deep scanning of big folders.

    > The reason why `deep` was not used is that cli options is `--nodeep`. Just keep this two the same.

    ```js
    // srcFolder:
    //     a/     a is symlink
    //      1.js

    // targetFolder:
    //     a/
    syncDirectory(srcDir, targetDir, {
        nodeep: true, // 1.js will be ignored
    });
    ```

+   `deleteOrphaned`

    Type: `true | false`

    Default: `false`

    Delete orphaned or `excluded` (when using API) files/folders in target folder. `false` as default.

    For instance:

    ```bash
    srcDir:

    dir1/
        1.js
        2.js

    targetDir:
    
    dir2/
        1.js
        2.js
        3.js
    ```

    ```js
    syncDirectory(srcDir, targetDir, {
        deleteOrphaned: true,
        excluded: [ '2.js' ]
    });

    // dir2/3.js will be removed because dir1/3.js does not exist.
    // dir2/2.js will be removed because dir1/2.js is excluded.
    ```

+   `exclude`

    Type:  Function / RegExp / String / Array (item is RegExp / String)

    Priority: `forceSync > exclude`.

    Default: `null`

    For: declare files that should not sync to target directory.

    +   Function

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude(filePath) {
                return /node_modules/.test(filePath);
            }
        });
        ```

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

    Type: Function / RegExp / String / Array (item is RegExp / String)

    Priority: `forceSync > exclude`.

    Default: `null`

    For: some files must be synced even though 'excluded'.

    +   Function

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude: ['node_modules'],
            forceSync(filePath) {
                return /node_modules\/jquery/.test(filePath);
            }
        });
        ```

    +   String

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude: ['node_modules'],
            forceSync: 'node_modules/jquery'
        });
        ```

    +   RegExp

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude: ['node_modules'],
            forceSync: /node_modules\/jquery/
        });
        ```

    +   Array

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude: ['node_modules'],
            forceSync: [/node_modules\/jquery/]
        });
        ```

        ```js
        syncDirectory(srcDir, targetDir, {
            exclude: ['node_modules'],
            forceSync: ['node_modules/jquery']
        });
        ```

+   `staySymlink`

    Type: `true | false`

    Default: `false`

    If src folder "A/" is a symlink, the target folder "A/" will also be the same symlink.

    ```js
    // srcFolder:
    //     a/     a is symlink
    //      1.js

    // targetFolder:
    //     a/     a is not symlink
    //      1.js
    syncDirectory(srcDir, targetDir, {
        staySymlink: false,
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
        staySymlink: true,
    });
    ```

+   `onError`

    Type: `Function`

    Default: `(err) => { throw new Error(err) }`

    For: callback function when something wrong.

    ```js
    syncDirectory(srcDir, targetDir, {
        onError(err) {
            console.log(err.message);
        },
    });
    ```

## LICENSE

MIT
