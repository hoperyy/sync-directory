## Description

`sync-directory` can sync files form src directory to target directory.

We have two ways to sync files: `hardlink` and `copy`.

If type is `copy`, `sync-directory` will copy files from src directory to target directory.

If type is `hardlink`, `sync-directory` can create hardlink files in target directory from src directory.

Apparently, the type `hardlink` is quicker than type `copy`, and `sync-directory` uses `hardlink` by default.

## API

```
require('sync-directory')(srcDir, targetDir[, config]);
```

+   parames

    name | description | type | values | default
    ---- | ---- | ---- | ---- | ----
    `srcDir` | src directory | String | absolute path | -
    `targetDir` | target directory | String | absolute path | -
    `config.watch` | watch files change | Boolean | - | false
    `config.type` | way to sync files | String | `'copy' / 'hardlink'` | `'hardlink'`
    `config.deleteOrphaned` | Decide if you want to delete other files in targetDir when srcDir files are removed | Boolean | - | true
    `config.cb` | callback function when files synced | Function | - | blank function
    `config.exclude` | files that should not sync to target directory. | RegExp / String / Array (item is RegExp / String) | - | null
    `config.filter` | callback function to filter synced files. Sync file when returning `true` | Function | - | `filepath => true`
    `config.onError` | callback function when something wrong | Function | - | `(err) => { throw new Error(err) }`

+   return

    ```
    const watcher = require('sync-directory')(A, B);
    ```

    `watcher` is `undefined`.

    ```
    const watcher = require('sync-directory')(A, B, {
        watch: true
    });
    ```

    `watcher` is a [chokidar watcher](https://github.com/paulmillr/chokidar).

## Params & Examples

+   `watch`

    ```
    require('sync-directory')(srcDir, targetDir, {
        watch: true
    });
    ```

+   `cb`

    ```
    require('sync-directory')(srcDir, targetDir, {
        watch: true,
        cb({ type, path }) {
            // type: add / remove / unlink / unlinkDir
            // path: file path
        }
    });
    ```

+   `type`

    copy

    ```
    require('sync-directory')(srcDir, targetDir, {
        type: 'copy'
    });
    ```

    hardlink (default)

    ```
    require('sync-directory')(srcDir, targetDir);
    ```

+   `exclude`

    exclude `node_modules`

    +   String

        ```
        require('sync-directory')(srcDir, targetDir, {
            exclude: 'node_modules'
        });
        ```

    +   RegExp

        ```
        require('sync-directory')(srcDir, targetDir, {
            exclude: /node\_modules/
        });
        ```

    +   Array

        ```
        require('sync-directory')(srcDir, targetDir, {
            exclude: [/node\_modules/]
        });
        ```

        ```
        require('sync-directory')(srcDir, targetDir, {
            exclude: ['node_modules']
        });
        ```
