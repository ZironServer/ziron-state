/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import {StateServer} from "./lib/StateServer";
import { secrets } from "docker-secret";
import {LogLevel} from "./lib/Logger";

const variables = Object.assign({}, process.env, secrets);

process.title = `Ziron State`;
new StateServer({
    secret: variables.SECRET,
    port: parseInt(variables.PORT) || 7777,
    path: variables.SERVER_PATH || "/",
    logLevel: parseInt(variables.LOG_LEVEL) || LogLevel.Everything,
    scaleDelay: parseInt(variables.SCALE_DELAY) || 100
}).listen().catch(() => process.exit(1));