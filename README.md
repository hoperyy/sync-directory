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
syncdir [<from> <to>] [options]
```

Example:

Sync from `aaa` to `bbb`: `syncdir aaa bbb -w`

Sync from `aaa` to `bbb` and `ccc` to `ddd`: `syncdir -i aaa -o bbb -i ccc -o ddd -w`

options:

+   `-i, --source`

    Source directory. Can be specified multiple times to sync several source directories.

    Same as api `srcDirs`.

+   `-o, --target`

    Target directory. Can be specified multiple times to sync several target directories. The target directories are paired with source directories in order.

    Same as api `targetDirs`.

+   `-w, --watch`

    Watch changes. `false` as default.

    Same as api `watch`.

+   `-do, --deleteOrphaned`

    Delete orphaned files/folders. `false` as default.

    Same as api `deleteOrphaned`.

+   `-c, --copy`

    Sync with type `copy`, `hardlink` as default.

    Same as api `type: 'copy'`.

+   `-symlink, --symlink`: support symlink while sync running. `false` as default.

    Same as api `supportSymlink`.

## API

```js
require('sync-directory')(srcDir, targetDir[, config]);
```

+   parames

    name | description | type | values | default
    ---- | ---- | ---- | ---- | ----
    `srcDirs` | src directory(s) | String/String[] | absolute path(s) | -
    `targetDirs` | target directory(s) | String/String[] | absolute path(s) | -
    `config.watch` | watch files change | Boolean | - | false
    `config.type` | way to sync files | String | `'copy' / 'hardlink'` | `'hardlink'`
    `config.deleteOrphaned` | Decide if you want to delete other files in targetDir when srcDir files are removed | Boolean | - | true
    `config.afterSync` | callback function when files synced | Function | - | blank function
    `config.supportSymlink` | ensure symlink in target if src has symlinks | Boolean | - | false
    `config.exclude` | files that should not sync to target directory. | RegExp / String / Array (item is RegExp / String) | - | null
    `config.forceSync` | some files must be synced even though 'excluded' | Function | - | `(file) => { return false }`
    `config.filter` | callback function to filter synced files. Sync file when returning `true` | Function | - | `filepath => true`
    `config.onError` | callback function when something wrong | Function | - | `(err) => { throw new Error(err) }`

+   return

    ```js
    const watcher = require('sync-directory')(A, B);
    ```

    `watcher` is `undefined`.

    ```js
    const watcher = require('sync-directory')(A, B, {
        watch: true
    });
    ```

    `watcher` is a [chokidar watcher](https://github.com/paulmillr/chokidar).

## Params & Examples

+   `watch`

    ```js
    require('sync-directory')(srcDir, targetDir, {
        watch: true
    });
    ```

+   `afterSync`

    ```js
    require('sync-directory')(srcDir, targetDir, {
        afterSync({ type, relativePath }) {
            // type: add / change / unlink / unlinkDir
            // relativePath: relative file path
        }
    });
    ```

+   `type`

    copy

    ```js
    require('sync-directory')(srcDir, targetDir, {
        type: 'copy'
    });
    ```

    hardlink (default)

    ```js
    require('sync-directory')(srcDir, targetDir);
    ```

+   `exclude`

    exclude `node_modules`

    +   String

        ```js
        require('sync-directory')(srcDir, targetDir, {
            exclude: 'node_modules'
        });
        ```

    +   RegExp

        ```js
        require('sync-directory')(srcDir, targetDir, {
            exclude: /node\_modules/
        });
        ```

    +   Array

        ```js
        require('sync-directory')(srcDir, targetDir, {
            exclude: [/node\_modules/]
        });
        ```

        ```js
        require('sync-directory')(srcDir, targetDir, {
            exclude: ['node_modules']
        });
        ```

+   `forceSync`

    ```js
    require('sync-directory')(srcDir, targetDir, {
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
    require('sync-directory')(srcDir, targetDir, {
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
    require('sync-directory')(srcDir, targetDir, {
        supportSymlink: true,
    });
    ```