
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

const excludeUtil = require('./exclude');
const isDirectoryUtil = require('./is-directory');
const { ignoredSymlinkDirs } = require('./config');

const copyFileOrFolder = ({ srcPath, srcDir, targetDir, exclude, forceSync, type, stayHardlink }) => {
    const relativeFilePath = srcPath.substring(srcDir.length);
    const targetPath = path.join(targetDir, relativeFilePath);

    const isDirectory = isDirectoryUtil(srcPath);

    const relativePath = `${relativeFilePath}${isDirectory ? '/' : ''}`;
    
    // ignored
    if (!forceSync(relativePath) && excludeUtil.test(relativePath, exclude)) {
        return;
    }

    try {
        if (isDirectory) { // folder
            fse.copySync(srcPath, targetPath, { overwrite: true });
        } else { // file
            if (type === 'hardlink') {
                if (!stayHardlink) {
                    fse.removeSync(targetPath); // remove hardlink first
                    fse.copySync(srcPath, targetPath, { overwrite: true });
                }
            } else {
                fse.copySync(srcPath, targetPath, { overwrite: true });
            }
        }
    } catch (err) {}
};

const removeFileOrFolder = ({ srcPath, srcDir, targetDir, exclude, forceSync }) => {
    const relativeFilePath = srcPath.substring(srcDir.length);
    const targetFile = path.join(targetDir, relativeFilePath);

    const isDirectory = isDirectoryUtil(srcPath);
    const relativePath = `${relativeFilePath}${isDirectory ? '/' : ''}`;

    if (!forceSync(relativePath) && excludeUtil.test(relativePath, exclude)) {
        return;
    }

    if (targetFile && fs.existsSync(targetFile)) {
        try {
            fse.removeSync(targetFile);
        } catch(err) {

        }
    }
};

const processor = (srcDir, targetDir, { type, stayHardlink, exclude, forceSync, afterSync, deleteOrphaned, onError, chokidarWatchOptions }) => {
    const watchOptions = Object.assign({
        persistent: true,
        alwaysStat: true,
        ignored: exclude
    }, chokidarWatchOptions);

    const chokidarWatcher = chokidar.watch(srcDir, watchOptions);

    const shouldExclude = (filePath) => {
        const relativeFilePath = filePath.substring(srcDir.length);

        const isDirectory = isDirectoryUtil(filePath);
        const relativePath = `${relativeFilePath}${isDirectory ? '/' : ''}`;

        if (forceSync(relativePath)) {
            return false;
        }
        
        if (excludeUtil.test(relativePath, exclude)) {
            return true;
        }

        return false;
    };

    chokidarWatcher.on('ready', () => {
        const actorProcessor = async ({ srcPath, eventType, nodeType, actor }) => {
            if (shouldExclude(srcPath)) {
                return;
            }
            // if file is in ignoredSymlinkDirs, ignore
            if (excludeUtil.test(srcPath, ignoredSymlinkDirs)) {
                return;
            }

            const relativePath = srcPath.replace(srcDir, '');
            const targetPath = path.join(targetDir, relativePath);

            try {
                await actor();

                await afterSync({
                    eventType,
                    nodeType,
                    relativePath: srcPath.replace(srcDir, ''),
                    srcPath,
                    targetPath,
                });   
            } catch(err) {
                await onError(err);
            }
        }

        // add file
        chokidarWatcher.on('add', async srcPath => {
            await actorProcessor({
                srcPath,
                eventType: 'add',
                nodeType: 'file',
                async actor() {
                    await copyFileOrFolder({ srcPath, srcDir, targetDir, exclude, forceSync, type, stayHardlink });
                }
            });
        });

        // add dir
        chokidarWatcher.on('addDir', async srcPath => {
            await actorProcessor({
                srcPath,
                eventType: 'addDir',
                nodeType: 'dir',
                async actor() {
                    await copyFileOrFolder({ srcPath, srcDir, targetDir, exclude, forceSync, type, stayHardlink });
                }
            });
        });

        // change file
        chokidarWatcher.on('change', async srcPath => {
            await actorProcessor({
                srcPath,
                eventType: 'change',
                nodeType: 'file',
                async actor() {
                    await copyFileOrFolder({ srcPath, srcDir, targetDir, exclude, forceSync, type, stayHardlink });
                }
            });
        });

        // remove file
        chokidarWatcher.on('unlink', async srcPath => {
            await actorProcessor({
                srcPath,
                eventType: 'unlink',
                nodeType: 'file',
                async actor() {
                    removeFileOrFolder({ srcPath, srcDir, targetDir, exclude, forceSync });
                }
            });
        });

        // remove folder
        chokidarWatcher.on('unlinkDir', async srcPath => {
            await actorProcessor({
                srcPath,
                eventType: 'unlinkDir',
                nodeType: 'dir',
                async actor() {
                    removeFileOrFolder({ srcPath, srcDir, targetDir, exclude, forceSync });
                }
            });
        });
    });

    return chokidarWatcher;
};

module.exports = processor;
