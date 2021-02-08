import * as vscode from 'vscode';
import { WSFileMan } from '../../FileMan/WSFileMan';
import AsyncNedb from 'nedb-async'
import { SystemLogHelper } from '../../classes/LogHelper';


export class SNICHConnectionsService {
    DB = new AsyncNedb();
    logger: SystemLogHelper;
    type = "SNICHConnectionsService";

    constructor(logger: SystemLogHelper) {
        let func = `constructor`;
        this.logger = logger;
        this.logger.info(this.type, func, "ENTERING");

        const DBfilePath = this.getDBFilePath();
        if (!DBfilePath) {
            throw new Error('Unable to load instance! Somehow this got called without valid workspace!');
        }

        this.DB = new AsyncNedb(this.getDBFilePath())

        this.logger.info(this.type, func, "LEAVING");
    }

    getDBFilePath(): vscode.Uri | undefined {
        const wsRootUri = new WSFileMan(this.logger).getWSRootUri();
        let dbPath = undefined;
        if (wsRootUri) {
            dbPath = vscode.Uri.joinPath(wsRootUri, '.snich', 'db', 'connections.db');
        }

        return dbPath;
    }

    async insert(connectionData: SNICHConfig.Connection) {

    }

    async update(_id: string, data: any) {

    }

    async getById(_id: string) {
        let record: SNICHConfig.Connection | undefined = undefined;
        let foundRecord = await this.DB.asyncFindOne<SNICHConfig.Connection>({ _id: _id });
        if (foundRecord) {
            record = foundRecord;
        }
        return record;
    }

    async get(query: any) {
        let record: SNICHConfig.Connection | undefined = undefined;
        let foundRecord = await this.DB.asyncFindOne<SNICHConfig.Connection>(query)
        if (foundRecord) {
            record = foundRecord;
        }
        return record;
    }

    async getMultiple(query?: any) {
        let records: SNICHConfig.Connection[] = [];
        if (!query) {
            query = {};
        }
        let foundRecords = await this.DB.asyncFind<SNICHConfig.Connection>(query);
        if (foundRecords && foundRecords.length > 0) {
            records = foundRecords;
        }

        return records;
    }

    async delete(id: string) {
        const deleteCount = await <Promise<number>>this.DB.asyncRemove({ _id: id });
        return deleteCount;
    }
}