/// <reference types="node" />
import { ChildProcess } from 'child_process';
import { API_TYPES } from '../constants';
import { InitOptions } from '../utils/options';
import { AdminDebugLogger } from '../utils/adminDebugLogger';
export interface ApiCommandArg {
    apiName: API_TYPES;
    method: string;
    options?: object;
    timeout?: number;
}
/**
 * A Client base.
 * @ignore
 */
declare class ClientBase {
    initialized: boolean;
    username: void | string;
    devicename: void | string;
    homeDir: void | string;
    verbose: boolean;
    protected _spawnedProcesses: ChildProcess[];
    private _workingDir;
    private _initializedWithOptions;
    protected _adminDebugLogger: AdminDebugLogger;
    constructor(workingDir: string, adminDebugLogger: AdminDebugLogger);
    _init(homeDir: void | string, options?: InitOptions): Promise<void>;
    _deinit(): Promise<void>;
    protected _runApiCommand(arg: ApiCommandArg): Promise<any>;
    protected _guardInitialized(): Promise<void>;
    protected _pathToKeybaseBinary(): string;
}
export default ClientBase;
