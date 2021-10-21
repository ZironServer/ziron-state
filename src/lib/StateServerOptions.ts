/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {LogLevel} from "./Logger";

export default interface StateServerOptions {
    logLevel?: LogLevel,
    secret?: string,
    port?: number,
    path?: string,
    scaleDelay?: number,
}