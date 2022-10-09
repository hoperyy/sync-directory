#!/usr/bin/env node
'use strict';

const commander = require('commander');
const { sync: run, formatParams } = require('./index');

const actor = function actor({ srcDir, targetDir, options }, { quiet }) {
    if (!quiet) {
        console.log([
            '',
            'sync-directory cli: syncdir <srcDir> <targetDir> [options]',
            `   - srcDir:  ${srcDir}`,
            `   - targetDir:   ${targetDir}`,
            `   - watch: ${options.watch}`,
            `   - skipInitialSync: ${options.skipInitialSync}`,
            `   - deleteOrphaned: ${options.deleteOrphaned}`,
            `   - type: ${options.type}`,
            `   - exclude: ${options.exclude}`,
            `   - nodeep: ${options.nodeep}`,
            `   - supportSymlink: ${options.supportSymlink}`,
            '',
        ].join('\n'));
    }

    run(srcDir, targetDir, {
        ...options,
        cwd: process.cwd(),
        afterEachSync({ eventType, relativePath }) {
            if (!quiet) {
                console.log(`${eventType}: `, relativePath);
            }
        },
    });
};

commander
    .version(require('./package.json').version, '-v, --version')
    .arguments('<srcDir> <targetDir>')
    .option('-w, --watch', 'Watch unnecessary changes')
    .option('--quiet', 'disable logs')
    .option('-si, --skipInitialSync', 'skip the first time sync actions')
    .option('-do, --deleteOrphaned', 'delete orphaned files/folders in target folder')
    .option('-symlink, --symlink', 'support symlink while sync running')
    .option('-c, --copy', 'Sync with type `copy`, `copy` as default')
    .option('-hardlink, --hardlink', 'Sync with type `hardlink`, `copy` as default')
    .option('-e, --exclude <strings...>', 'Filter which src files should not be synced')
    .option('-nd, --nodeep', 'Just walk the first level sub files/folders')
    .action((srcDir, targetDir, options) => {
        const standardParams = formatParams(srcDir, targetDir, {
            watch: !!options.watch,
            skipInitialSync: !!options.skipInitialSync,
            deleteOrphaned: !!options.deleteOrphaned,
            supportSymlink: !!options.symlink,
            exclude: options.exclude,
            nodeep: !!options.nodeep,
            type: options.hardlink ? 'hardlink' : 'copy',
        });

        actor(standardParams, { quiet: options.quiet });
    });

commander.parse(process.argv)
