/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {StateServer} from "./lib/StateServer";
import { secrets } from "docker-secret";

const variables = Object.assign({}, process.env, secrets);

process.title = `Ziron State`;
new StateServer({
    secret: variables.SECRET
}).listen();