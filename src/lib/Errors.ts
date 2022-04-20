/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella
 */

export class IdAlreadyUsedInClusterError extends Error {
    readonly name: string = "IdAlreadyUsedInClusterError";
    constructor(id: string) {super(`The id: "${id}" is already used by a server of the cluster.`);}
}