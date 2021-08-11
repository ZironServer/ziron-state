/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {StateServer} from "./lib/StateServer";
import { secrets } from "docker-secret";
import {LogLevel} from "./lib/Logger";

const variables = Object.assign({}, process.env, secrets);

process.title = `Ziron State`;
new StateServer({
    secret: variables.SECRET,
    port: parseInt(variables.PORT) || 7777,
    path: variables.PATH || "/",
    logLevel: parseInt(variables.LOG_LEVEL) || LogLevel.Everything,
    scaleDelay: parseInt(variables.SCALE_DELAY) || 100
}).listen();