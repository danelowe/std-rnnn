"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
function publish() {
    return __awaiter(this, void 0, void 0, function* () {
        const packageJson = require(path_1.default.join(__dirname, '/package.json'));
        const tag = `v${packageJson.version}`;
        const exec = util_1.default.promisify(child_process_1.execFile);
        const buildId = (0, crypto_1.randomUUID)();
        const tmpDir = yield fs_1.promises.mkdir(path_1.default.join(os_1.default.tmpdir(), buildId), { recursive: true });
        if (!tmpDir) {
            throw new Error('Failed to create temporary directory');
        }
        const tmpRepoDir = path_1.default.join(tmpDir, 'package');
        const archiveFilename = path_1.default.join(tmpDir, 'archive.tgz');
        const git = (...args) => exec('git', args);
        const gitInTmpRepo = (...args) => exec('git', args, { cwd: tmpRepoDir });
        try {
            yield exec('yarn', ['build']);
            yield exec('yarn', ['pack', '--filename', archiveFilename]);
            yield exec('tar', ['-xzf', archiveFilename, '-C', tmpDir]);
            yield fs_1.promises.rm(archiveFilename);
            yield gitInTmpRepo('init');
            const currentCommitMessage = (yield git('log', '-n', '1', '--pretty=oneline', '--decorate=full')).stdout.trim();
            const message = `Published\n${currentCommitMessage}`;
            yield gitInTmpRepo('add', '-A');
            yield gitInTmpRepo('commit', '-m', message);
            yield git('remote', 'add', '-f', buildId, tmpRepoDir);
            yield git('tag', tag, `${buildId}/main`);
            try {
                yield git('push', 'origin', tag);
            }
            catch (e) {
                yield git('tag', '-d', tag);
                throw e;
            }
            console.log(`Published ${tag}`);
        }
        finally {
            // await fs.rm(tmpDir, {recursive: true, force: true});
            try {
                yield git('remote', 'remove', buildId);
            }
            catch (e) { }
        }
    });
}
void publish();
