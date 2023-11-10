export type options = {
    cwd?: string;
    type?: string;
    forceSync?(filePath?: string): boolean;
    exclude?: string | RegExp | Array<string | RegExp | Function>;
    watch?: boolean;
    nodeep?: boolean;
    deleteOrphaned?: boolean;
    supportSymlink?: boolean;
    afterEachSync?(params?: { eventType: string; nodeType: string; relativePath: string, srcPath: string; targetPath: string }): any;
    filter?(filePath?: string): boolean;
    onError?(err?: object): any;
    chokidarWatchOptions?: Object;
}

export type res = object | void

declare function syncDirectory(srcDir: string, targetDir: string, options?: options): res
declare function asyncSyncDirectory(srcDir: string, targetDir: string, options?: options): Promise<res>

export default syncDirectory

export const sync: typeof syncDirectory
export const async: typeof asyncSyncDirectory