import { SystemLogHelper } from '../classes/LogHelper';
import { SNICHInstance } from '../SNICH/SNICHInstance/SNICHInstance';
import * as vscode from 'vscode';
import { SNICHTableConfig } from '../SNICH/SNICHTableConfig/SNICHTableConfig';
import { SNICHConnection } from '../SNICH/SNICHConnection/SNICHConnection';

export class ActivateCommandsInstance {

    type = `ActivateCommandsInstance`;
    logger: SystemLogHelper;

    constructor() {
        var func = 'constructor';
        this.logger = new SystemLogHelper();
        this.logger.info(this.type, func, `ENTERING`);

        this.logger.info(this.type, func, `LEAVING`);
    }

    async setup() {
        let func = 'setup.new_instance';
        this.logger.info(this.type, func, `ENTERING`);
        await new SNICHInstance(this.logger).setup();
        this.logger.info(this.type, func, `LEAVING`);

    }


    async testConnection() {
        let func = 'testConnection';
        this.logger.info(this.type, func, `ENTERING`);
        let sInstance = new SNICHInstance(this.logger);
        let loadResult = await sInstance.load();

        if (loadResult == false) {
            vscode.window.showWarningMessage('Test connection aborted! No instance selected!');
        } else if (loadResult == undefined) {
            vscode.window.showErrorMessage('Got here and no instances were available. Odd...');
        } else if (loadResult == true) {

            const connection = new SNICHConnection(this.logger);
            await connection.load(sInstance.getId());
            let connResult = await connection.testConnection();
            this.logger.debug(this.type, func, `connResult: `, connResult);
            if (connResult) {
                vscode.window.showInformationMessage('Test connection succesful!');
            } else {
                vscode.window.showErrorMessage('Test connection failed!');
            }

        } else {
            throw new Error('Weird.. super weird..');
        }

        this.logger.info(this.type, func, 'LEAVING');
    }
    /*

    async pullRecord() {
        let logger = new SystemLogHelper();
        let func = 'pullRecord';
        logger.info(this.lib, func, 'START');
        if (!instanceList.atLeastOneConfigured()) {
            return;
        }
        let filePuller = new SNFilePuller(instanceList, logger);

        await filePuller.syncRecord();
        logger.info(this.lib, func, 'END', instanceList);
    }
    */
    async configureAppFileTable() {
        let func = 'configureTable';
        this.logger.info(this.type, func, `ENTERING`);

        let sInstance = new SNICHInstance(this.logger);
        let instanceLoaded = await sInstance.load();

        if (!instanceLoaded) {
            if (instanceLoaded == false) {
                vscode.window.showWarningMessage('No instances configured.');
            }
            else if (instanceLoaded == undefined) {
                vscode.window.showWarningMessage('Table config aborted. No Instance selected.');
            }
            return undefined;
        }

        let tConfig = new SNICHTableConfig(this.logger);
        let loaded = await tConfig.load(sInstance.getId());


        if (!loaded) {
            vscode.window.showWarningMessage('Failed to load table config.');
        }

        await tConfig.setupTable(true);
        this.logger.info(this.type, func, `LEAVING`);
    }

}