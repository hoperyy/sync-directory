export interface SyncDirectoryEvent {
    type: "add" | "change" | "unlink" | "unlinkDir";
    path: string;
}

export type WatchCallback = (event: SyncDirectoryEvent) => void;

export interface AfterSyncEvent {
    type: "add" | "change" | "unlink" | "unlinkDir";
    relativePath: string;
}

export type AfterSyncCallback = (event: AfterSyncEvent) => void;

export interface Configuration {
    type?: "hardlink" | "copy"
    forceSync?: (file: string) => boolean
    exclude?: RegExp | string | (RegExp | string)[] | null
    watch?: boolean
    deleteOrphaned?: boolean
    supportSymlink?: boolean
    cb?: WatchCallback
    afterSync?: AfterSyncCallback
    filter?: (filepath: string) => boolean
    onError?: (err: Error) => void
}
