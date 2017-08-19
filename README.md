## Description

该模块实现目录间同步，从 `a` 目录同步到 `b` 目录

支持两种方式的同步：`copy` 和 `hardlink`

如果是 `copy`，就是从 `a` 目录直接复制文件到 `b` 目录

如果是 `hardlink`，就是在 `b` 目录生成 `a` 目录内文件的硬连接。相对于复制，这种操作轻量，因此是 `sync-directory` 的默认同步方式。

`sync-directory` can sync files form src directory to target directory.

We have two ways to sync files: `hardlink` and `copy`.

If type is `copy`, `sync-directory` will copy files from src directory to target directory.

If type is `hardlink`, `sync-directory` can create hardlink files in target directory from src directory.

Apparently, the type `hardlink` is quicker than type `copy`, and `sync-directory` uses `hardlink` by default.

## API

```
require('sync-directory')(srcDir, targetDir[, config]);
```

+   `srcDir`

    desciption: src directory

    type: `String`

+   `targetDir`

    desciption: target directory

    type: `String`

+   `config.watch`

    description: watch files change and sync files from src to target.

    type: `Boolean`

    default: `false`

+   `config.type`

    description: sync type

    default: `hardlink`

    type: `String`

    available values: `hardlink`、`copy`

+   `config.ignored`

    description: files that should not sync to target directory.

    default: null

    type: `RegExp`

## Examples

+   create hardlink files in dir B by reading dir A

    ```
    require('sync-directory')(A, B);
    ```

+   copy files from dir A to dir B

    ```
    require('sync-directory')(A, B, {
        type: 'copy'
    })
    ```

+   don't create `node_modules` files in dir B

    ```
    require('sync-directory')(A, B, {
        ignored: /node\_modules/i
    })
    ```
