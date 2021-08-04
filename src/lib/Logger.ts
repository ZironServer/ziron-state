/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import logUpdate = require('log-update');
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
        if (this.level === LogLevel.Everything)
            console.log('\x1b[33m%s\x1b[0m', '   [BUSY]',msg.join('\n'));
    }

    public logActive(...msg: string[]) {
        if (this.level === LogLevel.Everything)
            console.log('\x1b[32m%s\x1b[0m', '   [ACTIVE]',msg.join('\n'));
    }

    private static RUNNING_TABLE_HEADER = ["Id","Type","IP","Port"];

    public logRunningState(joinedSockets: Socket[],joinToken: string) {
        if(this.level !== LogLevel.Everything) return;

        const joinInformation = `Join a new broker or worker by using the join token: ${joinToken}.`;
        logUpdate(table([Logger.RUNNING_TABLE_HEADER,...joinedSockets
            .map(({node} )=> [
                node.id,
                node.type === ClientType.Worker ? `Worker${node.leader ? " 👑" : ""}` : "Broker",
                node.ip,
                node.port
            ])
        ],{
            header: {
                alignment: 'center',
                content: 'Joined nodes',
            },
        }) + "\n" + joinInformation);
    }

}