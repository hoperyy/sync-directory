## Description

该模块实现目录间同步，从 `dir A` 目录同步到 `dir B` 目录

支持两种方式的同步：`copy` 和 `hardlink`

如果是 `copy`，就是从 `dir A` 目录直接复制文件到 `dir A` 目录

如果是 `hardlink`，就是在 `dir B` 目录生成 `dir A` 目录内文件的硬连接。相对于复制，这种操作轻量，因此是默认同步方式。

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
    `config.cb` | callback function when files change | Function | - | blank function
    `config.exclude` | files that should not sync to target directory. | RegExp / String / Array (item is RegExp / String) | - | null

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

## Examples

+   `watch`

    ```
    require('sync-directory')(srcDir, targetDir, {
        watch: true
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
