/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import {Block, prepareMultiTransmit, Server, Socket} from "ziron-server";
import StateServerOptions from "./StateServerOptions";
import Logger from "./Logger";
import {generateSecret, getRandomArrayItem} from "./Crypto";
import {DataType} from "ziron-engine";
import * as uniqId from "uniqid";
import ip = require('ip');
import isIp = require('is-ip');
import {buildOptions} from "./Object";

export const enum ClientType {
    Worker = 0,
    Broker = 1
}

declare module 'ziron-server' {
    interface Socket {
        node: {
            type: ClientType;
            id: string;
            ip: string;
            port: number;
            path: string;
            uri: string;
            leader: boolean;
        }
    }
}

type SocketProcedureListener = (socket: Socket, data: any, end: (data?: any) => void,
                                reject: (err?: any) => void, type: DataType) => void | Promise<void>;
type SocketLeaveListener = (socket: Socket) => void | Promise<void>;
type WorkerJoinMiddleware = (socket: Socket, payload: Record<any, any>) => Promise<void> | void;

type ClusterSession = {
    id: string,
    shared: object,
};

const CLUSTER_VERSION = 1;

export class StateServer {

    private _listenCalled: boolean = false;

    private readonly _options: Required<StateServerOptions> = {
        logLevel: 1,
        secret: generateSecret(),
        port: 7777,
        path: "/",
        scaleDelay: 100,
    };

    private _workerLeader: Socket | null = null;
    private readonly _joinedWorkers: Record<string,Socket> = {};
    private readonly _joinedBrokers: Record<string,Socket> = {};

    private readonly _logger: Logger;
    private readonly _server: Server;

    private readonly _joinToken: string;
    private _clusterSession: ClusterSession | null = null;
    private _scaleTimeout?: NodeJS.Timeout;

    //Middlewares
    public workerJoinMiddleware: WorkerJoinMiddleware | undefined;

    constructor(options: StateServerOptions = {}) {
        this._logger = new Logger(this._options.logLevel);
        this._logger.logBusy('Launching state server...');

        this._options = buildOptions(this._options,options);
        this._joinToken = this._getJoinToken();

        this._server = new Server({
            pingInterval: 1000,
            path: this._options.path
        });
        this._initServer();
    }

    public async listen() {
        if(this._listenCalled) return;
        this._listenCalled = true;
        await this._server.listen(this._options.port);
        this._logger.logActive(`State server launched successfully on port: ${this._options.port}.`);
        this._logRunningState();
    }

    private _logRunningState() {
        this._logger.logRunningState([...Object.values(this._joinedWorkers),
            ...Object.values(this._joinedBrokers)],this._joinToken);
    }

    private _getJoinToken(): string {
        const address = ip.address();
        const path = this._options.path === "" || this._options.path === "/" ? "" :
            !this._options.path.startsWith("/") ? "/" + this._options.path : this._options.path;
        return `${this._options.secret}@ws://${
            isIp.v6(address) ? `[${address}]` : address
        }:${this._options.port}${path}`;
    }

    private _initServer() {
        this._server.handshakeMiddleware = req => {
            const attachment = req.attachment;

            if(typeof attachment !== 'object')
                throw new Block(4005,'Invalid attachment structure');

            if(attachment.secret !== this._options.secret)
                throw new Block(4011,'Permission denied');

            if(attachment.clusterVersion !== CLUSTER_VERSION)
                throw new Block(4010,'Incompatible cluster versions');
        };
        this._server.socketMiddleware = socket => {
            const node = socket.handshakeAttachment.node;
            if(typeof node === 'object' &&
                (node.type === ClientType.Worker || node.type === ClientType.Broker) &&
                typeof node.id === 'string' && typeof node.port === 'number' &&
                typeof node.path === 'string')
            {
                const nodeIp = typeof node.ip === 'string' && isIp(node.ip) ?
                    node.ip : socket.remoteAddress;
                if(!nodeIp) throw new Block(4012,'Could not detect node IP address');

                if(node.path !== "" && !node.path.startsWith('/'))
                    throw new Block(4005,'Invalid node path');

                socket.node = {
                    id: node.id,
                    type: node.type,
                    ip: nodeIp,
                    port: node.port,
                    path: node.path,
                    uri: `ws://${isIp.v6(nodeIp) ? `[${nodeIp}]` : nodeIp}:${node.port}${node.path}`,
                    leader: false,
                };
                return;
            }
            throw new Block(4005,'Invalid attachment structure');
        }
        this._server.connectionHandler = (socket: Socket) => {
            const type = socket.node.type;
            socket.on('disconnect',type === ClientType.Worker ?
                () => this._handleWorkerLeave(socket) :
                () => this._handleBrokerLeave(socket)
            );
            socket.procedures.leave = type === ClientType.Worker ?
                (_,end) => {
                    this._handleWorkerLeave(socket);
                    end();
                } :
                (_,end) => {
                    this._handleBrokerLeave(socket);
                    end();
                }
            socket.procedures.join = type === ClientType.Worker ?
                (...args) => this._handleWorkerJoin(socket,...args) :
                (...args) => this._handleBrokerJoin(socket,...args);
        }
    }

    private _createClusterSession(shared: object) {
        this._clusterSession = {
            id: uniqId(),
            shared
        };
    }

    private _resetClusterSession() {
        this._clusterSession = null;
    }

    private static _getJoinedState(joined: Record<string,Socket>) {
        return {
            time: Date.now(),
            uris: Object.values(joined)
                .map(socket => socket.node.uri)
        };
    }

    public getJoinedBrokersState() {
        return StateServer._getJoinedState(this._joinedBrokers);
    }

    // noinspection JSUnusedGlobalSymbols
    public getJoinedWorkersState() {
        return StateServer._getJoinedState(this._joinedWorkers);
    }

    private _handleWorkerJoin: SocketProcedureListener = async (socket,data,end,reject) => {
        if(typeof data !== 'object') data = {};
        const {shared, payload} = data;

        if(this.workerJoinMiddleware){
            try {await this.workerJoinMiddleware(socket,typeof payload !== 'object' ? {} : payload)}
            catch (err) {
                return reject(new Error(err.message || 'Join was blocked by the join middleware'));
            }
        }

        if(Object.keys(this._joinedWorkers).length === 0) {
            this._createClusterSession(typeof shared !== 'object' ? {} : shared);
        }

        this._joinedWorkers[socket.node.id] = socket;
        this._selectWorkerLeader();

        end({session: this._clusterSession, brokers: this.getJoinedBrokersState(),
            leader: this._workerLeader === socket});
        this._logRunningState();
    }

    private _handleWorkerLeave: SocketLeaveListener = (socket) => {
        delete this._joinedWorkers[socket.node.id];
        if(this._workerLeader === socket) {
            this._workerLeader = null;
            this._selectWorkerLeader();
        }
        if(Object.keys(this._joinedWorkers).length === 0) this._resetClusterSession();
        this._logRunningState();
    }

    private _handleBrokerJoin: SocketProcedureListener = (socket,data,end) => {
        this._joinedBrokers[socket.node.id] = socket;
        this._scaleOut();
        end();
        this._logRunningState();
    }

    private _handleBrokerLeave: SocketLeaveListener = (socket) => {
        delete this._joinedBrokers[socket.node.id];
        this._scaleBack();
        this._logRunningState();
    }

    private _getRandomWorker(): Socket | undefined {
        return getRandomArrayItem(Object.values(this._joinedWorkers));
    }

    private _selectWorkerLeader() {
        let randomWorker: Socket | undefined;
        if(this._workerLeader == null && (randomWorker = this._getRandomWorker()) !== undefined) {
            randomWorker.invoke('addLeadership').then(() => {
                randomWorker!.node.leader = true;
                this._workerLeader = randomWorker!;
                this._logRunningState();
            }).catch(() => {
                this._selectWorkerLeader();
            })
        }
    }

    private _scaleOut() {
        this._setScaleTimeout(() => this._updateWorkersBrokerState());
    }

    private _scaleBack() {
        this._setScaleTimeout(() => this._updateWorkersBrokerState());
    }

    private _setScaleTimeout(callback: () => void) {
        if (this._scaleTimeout != null) clearTimeout(this._scaleTimeout);
        this._scaleTimeout = setTimeout(callback, this._options.scaleDelay);
    }

    private _updateWorkersBrokerState() {
        const preparedPackage = prepareMultiTransmit("updateBrokers", this.getJoinedBrokersState());
        Object.values(this._joinedWorkers).forEach(worker => {
            worker.sendPreparedPackage(preparedPackage);
        });
    }

}