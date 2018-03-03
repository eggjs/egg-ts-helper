/// <reference types="node" />
import { EventEmitter } from 'events';
declare global  {
    interface PlainObject {
        [key: string]: any;
    }
}
export interface WatchItem extends PlainObject {
    path: string;
    generator: string;
}
export interface TsHelperOption {
    cwd?: string;
    framework?: string;
    typings?: string;
    watchDirs?: WatchItem[];
    caseStyle?: string;
    watch?: boolean;
    autoRemoveJs?: boolean;
    throttle?: number;
}
export declare type TsHelperConfig = typeof defaultConfig;
export declare type TsGenConfig = {
    dir: string;
} & WatchItem;
export declare type TsGenerator<T> = (config: T, baseConfig: TsHelperConfig) => {
    dist: string;
    content?: string;
} | void;
export declare const defaultConfig: {
    cwd: string;
    framework: string;
    typings: string;
    caseStyle: string;
    autoRemoveJs: boolean;
    throttle: number;
    watch: boolean;
    watchDirs: {
        path: string;
        interface: string;
        generator: string;
    }[];
};
export default class TsHelper extends EventEmitter {
    readonly config: TsHelperConfig;
    readonly watchDirs: string[];
    private tickerMap;
    private watcher;
    private generators;
    constructor(options?: TsHelperOption);
    register<T extends TsGenConfig = TsGenConfig>(name: string, tsGen: TsGenerator<T>): void;
    private initWatcher();
    private findInWatchDirs(p);
    private generateTs(index);
    private onChange(p);
}
