const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const { setTimeout } = require('timers/promises');
const syncDirectory = require('..');

const assertFileContent = (path, content, msg) =>
	assert.strictEqual(fs.readFileSync(path, 'utf-8'), content, msg || 'file must have content');

const assertFileLink = (a, b, msg) =>
	assert.strictEqual(fs.lstatSync(a).ino, fs.lstatSync(b).ino, msg || 'file must be hard link');

const assertNotFileLink = (a, b, msg) =>
	assert.notStrictEqual(fs.lstatSync(a).ino, fs.lstatSync(b).ino, msg || 'file must not be hard link');

const assertDirTree = (dir, tree) => {
	assert.deepEqual(fs.readdirSync(dir).sort(), Object.keys(tree).sort());
	for (const name in tree) {
		const data = tree[name];
		const file = path.join(dir, name);
		if (typeof (data) === 'string') { assertFileContent(file, data); } else { assertDirTree(file, data); }
	}
};

const mkDirTree = (dir, tree) => {
	fs.ensureDirSync(dir);
	for (const name in tree) {
		const data = tree[name];
		const file = path.join(dir, name);
		if (typeof (data) === 'string') { fs.writeFileSync(file, data, 'utf-8'); } else { mkDirTree(file, data); }
	}
};

const testDir = path.resolve(__dirname, 'tmp');
const srcDir = path.join(testDir, 'srcDir');
const targetDir = path.join(testDir, 'targetDir');
const srcFile = path.join(srcDir, 'test.txt');
const targetFile = path.join(targetDir, 'test.txt');

const canLink = (() => {
	try {
		// no hardlinks on some hosts
		fs.ensureDirSync(srcDir);
		fs.ensureDirSync(targetDir);
		fs.writeFileSync(srcFile, 'data');
		fs.ensureLinkSync(srcFile, targetFile);
		return true;
	} catch (e) {
		return false;
	} finally {
		fs.rmSync(testDir, { recursive: true, force: true });
	}
})();

describe('basic', function () {
	const testTree = {
		srcDir: {
			emptydir: {},
			fulldir: { 'file.txt': 'file data' },
			'test.txt': 'test data',
		},
		targetDir: {},
	};

	beforeEach(function () {
		mkDirTree(testDir, testTree);
		assertDirTree(testDir, testTree);
	});

	afterEach(function () {
		fs.rmSync(testDir, { recursive: true, force: true });
	});

	describe('sync', function () {
		describe('copy', function () {
			const t = syncDirectory => async function () {
				const watcher = await syncDirectory(srcDir, targetDir, {
					type: 'copy',
				});
				assert.strictEqual(watcher, undefined);
				assertDirTree(targetDir, testTree.srcDir);
				assertNotFileLink(targetFile, srcFile);
			};

			it('should copy files (sync)', t(syncDirectory.sync));
			it('should copy files (async)', t(syncDirectory.async));
		});

		describe('hardlink', function () {
			const t = syncDirectory => async function () {
				if (!canLink) this.skip();

				const watcher = await syncDirectory(srcDir, targetDir, {
					type: 'hardlink',
				});
				assert.strictEqual(watcher, undefined);
				assertDirTree(targetDir, testTree.srcDir);
				assertFileLink(targetFile, srcFile);
			};

			it('should hardlink files (sync)', t(syncDirectory.sync));
			it('should hardlink files (async)', t(syncDirectory.async));
		});
	});

	describe('watch', function () {
		describe('copy', function () {
			const t = syncDirectory => async function () {
				let watcher;
				try {
					watcher = await syncDirectory(srcDir, targetDir, {
						type: 'copy',
						watch: true,
					});
					assertDirTree(targetDir, testTree.srcDir);
					assertNotFileLink(targetFile, srcFile);
					await setTimeout(100);
					fs.writeFileSync(srcFile, 'new data');
					await setTimeout(100);
					assertFileContent(targetFile, 'new data');
					assertNotFileLink(targetFile, srcFile);
				} finally {
					await watcher.close();
				};
			};

			it('should copy files and watch changes (sync)', t(syncDirectory.sync));
			it('should copy files and watch changes (async)', t(syncDirectory.async));
		});

		describe('hardlink', function () {
			const t = syncDirectory => async function () {
				if (!canLink) this.skip();

				let watcher;
				try {
					watcher = await syncDirectory(srcDir, targetDir, {
						type: 'hardlink',
						watch: true,
					});
					assertDirTree(targetDir, testTree.srcDir);
					assertFileLink(targetFile, srcFile);
					await setTimeout(100);
					fs.writeFileSync(srcFile, 'new data');
					await setTimeout(100);
					assertFileContent(targetFile, 'new data');
					assertFileLink(targetFile, srcFile);
				} finally {
					await watcher.close();
				};
			};

			it('should hardlink files and watch changes (sync)', t(syncDirectory.sync));
			it('should hardlink files and watch changes (async)', t(syncDirectory.async));
		});
	});
});

describe('options', function () {
	const tree = {
		a: {
			Dsame: {},
			Dupdate: {
				Dsame: {},
				Dadd: {},
				fsame: '7f3',
				fadd: '3b6',
				fupdate: '742',
			},
			Dadd: {
				Dadd: {},
				fadd: '004',
			},
			fsame: '3a2',
			fadd: '9b0',
			fupdate: '47e',
		},
		b: {
			Dsame: {},
			Dupdate: {
				Dsame: {},
				Dold: {},
				same: '7f3',
				old: '97d',
				update: '009',
			},
			Dold: {
				Dold: {},
				old: '65c',
			},
			same: '3a2',
			old: '33c',
			update: '121',
		},
		c: {
			Dccc1: {
				Dccc2: {},
				fccc2: '766',
			},
			fccc1: '333',
		},
		d: {
			Dddd1: {
				Dddd2: {},
				fddd2: '008',
			},
			fddd1: 'dda',
		},
	};
	tree.ab = { ...tree.a, ...tree.b, Dupdate: { ...tree.a.Dupdate, ...tree.b.Dupdate } };

	describe('skipInitialSync', function () {
		const treeBefore = {
			srcDir: tree.a,
			targetDir: tree.b,
		};
		const treeAfter = {
			srcDir: tree.a,
			targetDir: tree.b,
		};

		beforeEach(function () {
			mkDirTree(testDir, treeBefore);
			assertDirTree(testDir, treeBefore);
		});

		afterEach(function () {
			fs.rmSync(testDir, { recursive: true, force: true });
		});

		describe('watch', function () {
			const t = syncDirectory => async function () {
				let watcher;
				try {
					watcher = await syncDirectory(srcDir, targetDir, {
						type: 'copy',
						watch: true,
						skipInitialSync: true,
					});
					assertDirTree(testDir, treeAfter);
					await setTimeout(100);
					fs.writeFileSync(srcFile, 'new data');
					await setTimeout(100);
					assertFileContent(targetFile, 'new data');
				} finally {
					await watcher.close();
				};
			};

			it('only watch changes (sync)', t(syncDirectory.sync));
			it('only watch changes (async)', t(syncDirectory.async));
		});
	});

	describe('deleteOrphaned', function () {
		const treeBefore = {
			srcDir: tree.a,
			targetDir: tree.b,
		};

		beforeEach(function () {
			mkDirTree(testDir, treeBefore);
			assertDirTree(testDir, treeBefore);
		});

		afterEach(function () {
			fs.rmSync(testDir, { recursive: true, force: true });
		});

		describe('true', function () {
			const treeAfter = {
				srcDir: tree.a,
				targetDir: tree.a,
			};

			const t = syncDirectory => async function () {
				await syncDirectory(srcDir, targetDir, {
					type: 'copy',
					deleteOrphaned: true,
				});
				assertDirTree(testDir, treeAfter);
			};

			it('copy new/changed and delete orphaned (sync)', t(syncDirectory.sync));
			it('copy new/changed and delete orphaned (async)', t(syncDirectory.async));
		});

		describe('false', function () {
			const treeAfter = {
				srcDir: tree.a,
				targetDir: tree.ab,
			};

			const t = syncDirectory => async function () {
				await syncDirectory(srcDir, targetDir, {
					type: 'copy',
				});
				assertDirTree(testDir, treeAfter);
			};

			it('copy new/changed files (sync)', t(syncDirectory.sync));
			it('copy new/changed files (async)', t(syncDirectory.async));
		});
	});

	describe('exclude', function () {
		const treeBefore = {
			srcDir: { ...tree.a, ...tree.c, ...tree.d },
			targetDir: tree.b,
		};

		beforeEach(function () {
			mkDirTree(testDir, treeBefore);
			assertDirTree(testDir, treeBefore);
		});

		afterEach(function () {
			fs.rmSync(testDir, { recursive: true, force: true });
		});

		describe('string', function () {
			const treeAfter = {
				srcDir: treeBefore.srcDir,
				targetDir: { ...tree.ab, ...tree.d },
			};

			const t = syncDirectory => async function () {
				await syncDirectory(srcDir, targetDir, {
					type: 'copy',
					exclude: 'ccc',
				});
				assertDirTree(testDir, treeAfter);
			};

			it('copy new/changed except excluded string (sync)', t(syncDirectory.sync));
			it('copy new/changed except excluded string (async)', t(syncDirectory.async));
		});

		describe('array', function () {
			const treeAfter = {
				srcDir: treeBefore.srcDir,
				targetDir: tree.ab,
			};

			const t = syncDirectory => async function () {
				await syncDirectory(srcDir, targetDir, {
					type: 'copy',
					exclude: ['ccc', 'ddd'],
				});
				assertDirTree(testDir, treeAfter);
			};

			it('copy new/changed except excluded array (sync)', t(syncDirectory.sync));
			it('copy new/changed except excluded array (async)', t(syncDirectory.async));
		});
	});

	describe('forceSync', function () {
		const treeBefore = {
			srcDir: { ...tree.a, ...tree.c, ...tree.d },
			targetDir: tree.b,
		};

		beforeEach(function () {
			mkDirTree(testDir, treeBefore);
			assertDirTree(testDir, treeBefore);
		});

		afterEach(function () {
			fs.rmSync(testDir, { recursive: true, force: true });
		});

		describe('string', function () {
			const treeAfter = {
				srcDir: treeBefore.srcDir,
				targetDir: { ...tree.ab, ...tree.c },
			};

			const t = syncDirectory => async function () {
				await syncDirectory(srcDir, targetDir, {
					type: 'copy',
					exclude: ['ccc', 'ddd'],
					forceSync: 'ccc',
				});
				assertDirTree(testDir, treeAfter);
			};

			it('copy new/changed and forceSync string (sync)', t(syncDirectory.sync));
			it('copy new/changed and forceSync string (async)', t(syncDirectory.async));
		});

		describe('array', function () {
			const treeAfter = {
				srcDir: treeBefore.srcDir,
				targetDir: { ...tree.ab, ...tree.c, ...tree.d },
			};

			const t = syncDirectory => async function () {
				await syncDirectory(srcDir, targetDir, {
					type: 'copy',
					exclude: ['ccc', 'ddd'],
					forceSync: ['ccc', 'ddd'],
				});
				assertDirTree(testDir, treeAfter);
			};

			it('copy new/changed and forceSync array (sync)', t(syncDirectory.sync));
			it('copy new/changed and forceSync array (async)', t(syncDirectory.async));
		});
	});
});
