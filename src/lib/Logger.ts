/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

import * as logUpdate from 'log-update';
import {Socket} from "ziron-server";
import {table} from 'table';
import {ClientType} from "./StateServer";

export enum LogLevel {
    Nothing,
    Everything
}

export default class Logger {

    constructor(private readonly level: LogLevel) {}

    public logBusy(...msg: string[]) {
        if (this.level >= LogLevel.Everything)
            console.log('\x1b[33m%s\x1b[0m', '   [BUSY]',msg.join('\n'));
    }

    public logActive(...msg: string[]) {
        if (this.level >= LogLevel.Everything)
            console.log('\x1b[32m%s\x1b[0m', '   [ACTIVE]',msg.join('\n'));
    }

    public logFailed(...msg: string[]) {
        if (this.level >= LogLevel.Everything)
            console.log("\x1b[31m%s\x1b[0m", "   [FAILED]", msg.join("\n"));
    }

    private static RUNNING_TABLE_HEADER = ["Id","Type","IP","Port"];

    public logRunningState(joinedWorkers: Socket[],joinedBrokers: Socket[],joinToken: string) {
        if(this.level <= LogLevel.Nothing) return;

        const postFixInformation: string[] = [];
        if(joinedWorkers.length > 1 && joinedBrokers.length <= 0)
            postFixInformation.push("\x1b[33m[WARNING] The cluster has no brokers! Channel messages will not be distributed to other workers.\x1b[0m️️️");
        postFixInformation.push(`Join a new broker or worker by using the join token: \x1b[36m${joinToken}\x1b[0m`);

        logUpdate(table([Logger.RUNNING_TABLE_HEADER,...([...joinedWorkers,...joinedBrokers])
            .map(({node}) => [
                node.id,
                node.type === ClientType.Worker ? `Worker${node.leader ? " 👑" : ""}` : "Broker",
                node.ip,
                node.port
            ])
        ],{
            header: {
                alignment: 'center',
                content: 'Cluster',
            },
        }) + postFixInformation.join("\n"));
    }

}