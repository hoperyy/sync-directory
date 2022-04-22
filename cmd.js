#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const commander = require('commander');
const isAbsoluteUrl = require('is-absolute');
const run = require('./index').sync;

const actor = function ({ from, to, watch, deleteOrphaned, supportSymlink, type, quiet }) {
    const cwd = process.cwd();

    if (!from) {
        console.error(`[sync-directory] missing source "from" folder path: syncdir <from> <to> [options]`);
        process.exit(1);
    }

    if (!to) {
        console.error(`[sync-directory] missing target "to" folder path: syncdir <from> <to> [options]`);
        process.exit(1);
    }

    if (!isAbsoluteUrl(from)) {
        from = path.join(cwd, from);
    }

    if (!isAbsoluteUrl(to)) {
        to = path.join(cwd, to);
    }

    if (!fs.existsSync(from)) {
        console.error(`[sync-directory] "from" folder does not exist: "${from}"`);
        process.exit(1);
    }

    if (!quiet) {
        console.log('');
        console.log('sync-directory cli: syncdir <from> <to> [options]');
        console.log('   - from: ', from);
        console.log('   - to:   ', to);
        console.log('   - watch:', watch);
        console.log('   - deleteOrphaned:', deleteOrphaned);
        console.log('   - type: ', type);
        console.log('   - supportSymlink: ', supportSymlink);
        console.log('');
    }

    run(from, to, {
        watch,
        type,
        deleteOrphaned,
        afterEachSync({ type, relativePath }) {
            if (!quiet) {
                console.log(`${type}: `, relativePath);
            }
        }
    });
};

commander
    .version(require('./package.json').version, '-v, --version')
    .arguments('<from> <to>')
    .option('-w, --watch', 'Watch unnecessary changes')
    .option('--quiet', 'disable logs')
    .option('-do, --deleteOrphaned', 'delete orphaned files/folders in target folder')
    .option('-symlink, --symlink', 'support symlink while sync running')
    .option('-c, --copy', 'Sync with type `copy`, `copy` as default')
    .option('-hardlink, --hardlink', 'Sync with type `hardlink`, `copy` as default')
    .action((from, to, options) => {
        const { watch, deleteOrphaned, symlink, hardlink, quiet } = options;

        const params = {
            from,
            to,
            watch: !!watch,
            deleteOrphaned: !!deleteOrphaned,
            supportSymlink: !!symlink,
            quiet,
            type: hardlink ? 'hardlink' : 'copy',
        };

        actor(params);
    });

commander.parse(process.argv)