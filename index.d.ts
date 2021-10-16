export default function syncDirectory(srcDir: string, targetDir: string, options?: {
    type?: string;
    forceSync?(filePath?: string): boolean;
    exclude?: string | RegExp | Array<string | RegExp | Function>;
    watch?: boolean;
    deleteOrphaned?: boolean;
    supportSymlink?: boolean;
    afterEachSync?(params?: { eventType: string; nodeType: string; relativePath: string, srcPath: string; targetPath: string }): any;
    filter?(filePath?: string): boolean;
    onError?(err?: object): any;
    chokidarWatchOptions?: Object;
}): object | void
