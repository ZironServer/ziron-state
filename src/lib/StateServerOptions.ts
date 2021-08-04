/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {LogLevel} from "./Logger";

export default interface StateServerOptions {
    logLevel?: LogLevel,
    secret?: string,
    port?: number,
    path?: string,
    scaleDelay?: number,
}