#!/usr/bin/env node
'use strict';

const fs = require('fs');
const commander = require('commander');
const run = require('./index');

const parseArgs = (args) => {
    const options = {};
    let pathSetWithPositionalArg = false;
    let pathSetWithNamedArg = false;
    const froms = [];
    const tos = [];

    function readPathFromArg(arg, msg) {
        if (arg == null) {
            console.error('Error when reading ' + msg + ': a path is required.');
            process.exit(-1);
        }
        if (arg.startsWith('-')) {
            console.error('Error when reading ' + msg + ': a path-like string is expected when "' + arg + '" is given.');
            process.exit(-1);
        }
        return arg;
    }

    for (let i = 0, len = args.length; i < len; i++) {
        const item = args[i];

        if (/^-/.test(item)) {
            switch (item) {
                case '-i':
                case '--source':
                    if (pathSetWithPositionalArg) {
                        console.error('');
                        process.exit(-1);
                    }
                    froms.push(readPathFromArg(args[i + 1], 'source path'));
                    i += 1;
                    pathSetWithNamedArg = true;
                    break;
                case '-o':
                case '--target':
                    if (pathSetWithPositionalArg) {
                        console.error('');
                        process.exit(-1);
                    }
                    tos.push(readPathFromArg(args[i + 1], 'target path'));
                    i += 1;
                    pathSetWithNamedArg = true;
                    break;
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
        } else if (!pathSetWithNamedArg) {
            if (froms.length === 0) {
                froms.push(item);
                pathSetWithPositionalArg = true;
            } else if (tos.length === 0) {
                tos.push(item);
                pathSetWithPositionalArg = true;
            } else {
                console.error('Cannot set more than one path using positional argument. Use --source <source_path1> --target <target_path1> --source <source_path2> --target <target_path2> instead.');
                process.exit(-1);
            }
        } else {
            console.error('Cannot mix positional path argument with "--input/output".');
            process.exit(-1);
        }
    }

    return {
        froms,
        tos,
        watch: !!options.watch,
        deleteOrphaned: !!options.deleteOrphaned,
        supportSymlink: !!options.supportSymlink,
        type: options.copy ? 'copy' : 'hardlink',
    };
};

// error on unknown commands
commander.on('command:*', function () {
    const { froms, tos, watch, deleteOrphaned, supportSymlink, type } = parseArgs(commander.args);

    if (froms.length === 0) {
        console.error('missing source folder path');
        process.exit(1);
    }

    if (tos.length === 0) {
        console.error('missing target folder path');
        process.exit(1);
    }

    if (froms.length !== tos.length) {
        console.error('the number of source folder paths must match the number of target folder paths');
        process.exit(1);
    }

    for (let i = 0; i < froms.length; i++) {
        if (!fs.existsSync(froms[i])) {
            console.error('source folder does not exist.');
            process.exit(1);
        }
    }

    console.log('');
    console.log('sync-directory cli options: ');
    for (let i = 0; i < froms.length; i++) {
        console.log('   - from[' + i + ']: ', froms[i]);
        console.log('   - to[' + i + ']:   ', tos[i]);
    }
    console.log('   - watch:', watch);
    console.log('   - deleteOrphaned:', deleteOrphaned);
    console.log('   - type: ', type);
    console.log('   - supportSymlink: ', supportSymlink);
    console.log('');

    run(froms, tos, {
        watch,
        type,
        deleteOrphaned,
        afterSync({ type, relativePath }) {
            console.log(`${type}: `, relativePath);
        },
    });
});

commander.allowUnknownOption();
commander.parse(process.argv);
