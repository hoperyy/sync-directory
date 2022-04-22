## Description

`sync-directory` can sync files from src directory to target directory.

**Cli** and **API** using are supported.

We have two ways to sync files: `hardlink` and `copy`.

If type is `copy`, `sync-directory` will copy files from src directory to target directory.

If type is `hardlink`, `sync-directory` can create hardlink files in target directory from src directory.

`sync-directory` uses `copy` by default for safe using.

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

+   `-hardlink, --hardlink`

    Sync with type `hardlink`, `copy` as default.

    Same as api `type: 'hardlink'`.

+   `-symlink, --symlink`

    support symlink while sync running. `false` as default.

    Same as api `supportSymlink`.

## API Example

### sync

```js
const syncDirectory = require('sync-directory');

syncDirectory.sync(srcDir, targetDir, {
    afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {

    },
});
```

### async

```js
(async () => {
    const syncDirectory = require('sync-directory');

    const delay = (time = 2000) => new Promise(r => setTimeout(r, time));

    console.log('start'); // time a

    // wait several 2s: 2 * file number
    await syncDirectory.async(srcDir, targetDir, {
        async afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {
            await delay(2000); // delay 2s after one file/folder was synced
        },
    });

    console.log('end'); // time a + 2 * (file number)
})()
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

#### Some confusing params

![image](https://user-images.githubusercontent.com/5757051/148176334-ba741444-7ac1-4d61-b106-5ec306f864a6.png)

#### Params Overview

name | description | type | values | default | can be `async` ?
---- | ---- | ---- | ---- | ---- | ----
`srcDir` | src directory | String | absolute path | - | -
`targetDir` | target directory | String | absolute path | - | -
`config.watch` | watch file changes | Boolean | - | false | -
`config.chokidarWatchOptions` | watch options ([chokidar](https://github.com/paulmillr/chokidar) is used for watching) | Object | - | `{}` | -
`config.type` | way to sync files | String | `'copy' \| 'hardlink'` | `'copy'` | -
`config.stayHardlink` | files at targetDir stay to be the srcDir files' hardlink when srcDir files change. Details as below. | Boolean | - | `false` | -
`config.deleteOrphaned` | decide if you want to delete other files in targetDir when srcDir does not have it | Boolean | - | `false` | -
`config.afterEachSync` | callback function when every file synced | Function | - | blank function | Yes when `syncDirectory.async()`
`config.supportSymlink` | ensure symlink in target if src has symlinks | Boolean | - | false | -
`config.exclude` | declare files that should not sync to target directory | RegExp / String / Array (item is RegExp / String) | - | null | -
`config.forceSync` | some files must be synced even though 'excluded' | Function | - | `(file) => { return false }` | No
`config.filter` | allback function to filter which src files should be synced. Sync file when returning `true` | Function | - | `(absoluteSrcFilePath) => true` | No
`config.onError` | callback function when something wrong | Function | - | `(err) => { throw new Error(err) }` | Yes when `syncDirectory.async()`

#### Params Details

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

    // "eventType": "init:hardlink" / "init:copy" / "add" / "change" / "unlink" / "unlinkDir" / "addDir"
    //          - init type: "init:hardlink" / "init:copy"
    //          - watch type: "add" / "change" / "unlink" / "unlinkDir" / "addDir"
    // "nodeType": "file" / "dir"
    // "relativePath": relative file/folder path
    // "srcPath": absolute src file/folder path
    // "targetPath": absolute target file/folder path
    ```

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

+   `stayHardlink`

    Type: `true | false`

    Default: `false`

    With config `type: 'hardlink'`, after initialized, the targetDir files will be hardlink of srcDir files.

    When srcDir file changes, targetDir files will be changed to the copied version rather than staying at hardlink.

    If `stayHardlink: true`, the targetDir files will stay to be hardlink.

+   `deleteOrphaned`

    Type: `true | false`

    Default: `false`

    For: decide if you want to delete other files in targetDir when srcDir does not have it.

    For instance:

    ```bash
    srcDir:

    dir1/
        1.js
        2.js

    targetDir:
    
    dir2
        1.js
        2.js
        3.js
    ```

    ```js
    syncDirectory(srcDir, targetDir, {
        deleteOrphaned: true,
    });

    // dir2/3.js will be removed
    ```

+   `exclude`

    Type:  RegExp / String / Array (item is RegExp / String)

    Default: `null`

    For: declare files that should not sync to target directory.

    For instance, exclude `node_modules`:

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

    Type: `Function`

    Default: `(file) => { return false }`

    For: some files must be synced even though 'excluded'.

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

    Type: `true | false`

    Default: `true`

    For: ensure symlink in target if src has symlinks.

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


+   `filter`
    
    Type: `Function`

    Default: `(absoluteSrcFilePath) => true`

    For: callback function to filter which src files should be synced. Sync file when returning `true`.

    ```js
    syncDirectory(srcDir, targetDir, {
        filter(absoluteSrcFilePath) {
            return true;
        }
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