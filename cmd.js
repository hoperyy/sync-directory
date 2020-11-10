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
    };
};

// error on unknown commands
commander.on('command:*', function () {
    let { from, to, watch } = parseArgs(commander.args);
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

    run(from, to, {
        watch,
        afterSync({ type, relativePath }) {
            console.log(`${type}: `, relativePath);
        }
    });
});

commander.allowUnknownOption();
commander.parse(process.argv);