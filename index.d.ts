export default function syncDirectory(srcDir: string, targetDir: string, options?: {
    type?: string;
    forceSync?(filePath?: string): boolean;
    exclude?: Array<string | RegExp | Function>;
    watch?: boolean;
    deleteOrphaned?: boolean;
    supportSymlink?: boolean;
    afterSync?(filePath?: string): any;
    filter?(filePath?: string): boolean;
    onError?(err?: object): any;
}): object | void