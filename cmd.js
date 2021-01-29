#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const commander = require('commander');
const isAbsoluteUrl = require('is-absolute');
const run = require('./index');

const parseArgs = (args) => {
    const options = {};
    let from = '';
    let to = '';

    for (let i = 0, len = args.length; i < len; i++) {
        const item = args[i];

        if (/^\-/.test(item)) {
            switch(item) {
                case '-w':
                case '--watch':
                    options.watch = true;
                    break;
                case '-do':
                case '--deleteOrphaned':
                    options.deleteOrphaned = true;
                    break;
                case '-symlink':
                case '--symlink':
                    options.supportSymlink = true;
                    break;
                case '-c':
                case '--copy':
                    options.copy = true;
            }
        } else {
            if (!from) {
                from = item;
            } else if (!to) {
                to = item;
            }
        }
    }

    return {
        from,
        to,
        watch: !!options.watch,
        deleteOrphaned: !!options.deleteOrphaned,
        supportSymlink: !!options.supportSymlink,
        type: options.copy ? 'copy' : 'hardlink',
    };
};

const actor = function () {
    let { from, to, watch, deleteOrphaned, supportSymlink, type } = parseArgs(commander.args);

    console.log({ from, to, watch, deleteOrphaned, supportSymlink, type });
    const cwd = process.cwd();

    if (!from) {
        console.error(`missing source folder path`);
        process.exit(1);
    }

    if (!to) {
        console.error(`missing target folder path`);
        process.exit(1);
    }

    if (!isAbsoluteUrl(from)) {
        from = path.join(cwd, from);
    }

    if (!isAbsoluteUrl(to)) {
        to = path.join(cwd, to);
    }

    if (!fs.existsSync(from)) {
        console.error('source folder does not exist.');
        process.exit(1);
    }

    console.log('');
    console.log('sync-directory cli options: ');
    console.log('   - from: ', from);
    console.log('   - to:   ', to);
    console.log('   - watch:', watch);
    console.log('   - deleteOrphaned:', deleteOrphaned);
    console.log('   - type: ', type);
    console.log('   - supportSymlink: ', supportSymlink);
    console.log('');

    run(from, to, {
        watch,
        type,
        deleteOrphaned,
        afterSync({ type, relativePath }) {
            console.log(`${type}: `, relativePath);
        }
    });
};

// error on unknown commands
// commander.on('command:*', actor);

commander.allowUnknownOption();
commander.parse(process.argv);

actor();