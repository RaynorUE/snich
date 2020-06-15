import { snRecord, SNApplication, SNQPItem } from "../myTypes/globals";
import { SystemLogHelper } from "./LogHelper";
import { InstanceMaster, InstancesList } from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from 'vscode';
import { WorkspaceManager } from "./WorkspaceManager";

import {snichOutput} from '../extension';

export class SNFilePuller {
    
    instanceList: InstancesList;
    logger: SystemLogHelper;
    appScope?: SNApplication;
    lib: string = "SNFilePuller";
    
    constructor(instanceList: InstancesList, logger?: SystemLogHelper) {
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START');
        this.instanceList = instanceList;
        this.logger.info(this.lib, func, 'END');
    }
    
    async syncRecord() {
        let func = 'syncRecord';
        this.logger.info(this.lib, func, 'START');
        
        let selectedInstance:InstanceMaster = await this.instanceList.selectInstance();
        if(!selectedInstance){
            vscode.window.showWarningMessage('Aborted Sync Record. No Instance Selected.');
            return undefined;
        }

        /** Setup REST Client */
        let client = new RESTClient(selectedInstance, this.logger);
        
        /** Make our calls for table selection. Why do we query for tables we pre-configured? 
         * Just incase the table has been deleted (or was never created!)
        */
        let configuredTables = selectedInstance.tableConfig;
        let encodedQuery = 'nameIN' + configuredTables.tableNameList;
        let tableRecs:Array<snRecord> = await client.getRecords('sys_db_object', encodedQuery, ["name", "label"], true);
        this.logger.debug(this.lib, func, "Table records returned: ", tableRecs);
        if(!tableRecs || tableRecs.length === 0){
            vscode.window.showWarningMessage('Attempted to get configured tables from instance and failed. Aborting sync record. See logs for detail.');
            return undefined;
        }
        
        /** Build our list of tables into an array to be passed into the quick pick */
        let tableqpItems:Array<SNQPItem> = [];
        tableRecs.forEach((record: snRecord) => {
            tableqpItems.push({ "label": record.label, "detail": record.name + ' - ' + record.sys_scope, value: record });
        });

        /** Ask user to select a table to sync from.*/
        let tableSelection = await vscode.window.showQuickPick(tableqpItems, <vscode.QuickPickOptions>{ "placeHolder": "Select table to retrieve record from. Table Not found? Make sure it's in the table_config. Or configure table using command pallete.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
        if(!tableSelection){
            vscode.window.showWarningMessage('Sync record aborted. No Table Selected.');
            return undefined;
        }

        let tableRec = tableSelection.value;
        let tableConfig = configuredTables.getTable(tableRec.name);
        if(!tableConfig || !tableConfig.name){
            vscode.window.showErrorMessage('Sync Record aborted. For some reason we did not find the selected table in the instance tables.. Weird. Try re-configuring the table you are trying to sync a record for.');
            return undefined;
        }
        
        /**Build our field list and query the table for records to sync. */
        let fields = ["name"];
        fields.push(tableConfig.display_field);
        fields = fields.concat(tableConfig.additional_display_fields);
        
        let tableFileRecs = await client.getRecords(tableRec.name, "ORDERBYDESCsys_updated_on", fields, true);
        if(!tableFileRecs || tableFileRecs.length === 0){
            vscode.window.showWarningMessage('Did not find any records for table. Aborting sync record.');
            return undefined;
        }
        
        /**Build our list of records into an array to be passed into the QuickPick */
        let fileqpitems:Array<SNQPItem> = [];
        tableFileRecs.forEach((record:any) => {
            let label = tableConfig.getDisplayValue(record);
            let recordDetail = `${record['sys_package.name']} (${record['sys_scope.name']})`;
            
            fileqpitems.push({ "label": label, "detail": recordDetail, value: record });
        });
        
        /** See if we are allowing select multiple */
        let settings = vscode.workspace.getConfiguration();
        let selectMultiple = settings.get('snich.syncRecordMultiple');

        let selectedFileRecs:any = await vscode.window.showQuickPick(fileqpitems, <vscode.QuickPickOptions>{ "placeHolder": "Select the records to retrieve.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true, canPickMany: selectMultiple });
        this.logger.info(this.lib, func, 'SELECTED FILES TO SYNC: ', selectedFileRecs);
        
        //if we are not in multi-select mode, still make it array so the rest of our code will work.
        if(!selectMultiple){
            selectedFileRecs = [selectedFileRecs];
        }
        
        /** Process our selection result and determine if we have anything to action. If we dont, abort processing and show an error message. */
        if(!selectedFileRecs || selectedFileRecs.length === 0){
            vscode.window.showWarningMessage('No record selected. Sync record aborted.');
            return undefined;        
        }

        if(selectedFileRecs && selectedFileRecs.length > 0 && !selectedFileRecs[0].value.sys_id){
            vscode.window.showErrorMessage('Unknown error occured, but the record that came back did not have a sys_id attribute. Please submit issue on github for this extension.');
            return undefined;
        }
        this.logger.info(this.lib, func, 'Selected file record:', selectedFileRecs);
        
        /** Go through all our selected records and write our files! */
        selectedFileRecs.forEach(async(selectedFile:any) => {
            let fileRec = selectedFile.value;
            this.logger.info(this.lib, func, 'selected file', fileRec);
            let fieldsList = [];
            fieldsList.push(tableConfig.display_field);
            tableConfig.fields.forEach((field) => {
                fieldsList.push(field.name);
            });
            tableConfig.additional_display_fields.forEach((dvField) =>{
                fieldsList.push(dvField);
            });
            
            let recordToSave = await client.getRecord(tableConfig.name, fileRec.sys_id, fieldsList);
            if(!recordToSave){
                vscode.window.showWarningMessage(`For some reason we couldn't grab the file to sync. Aborting sync record.`);
                return undefined;
            }
            
            let wsMgr = new WorkspaceManager(this.logger);
            let fileCreation = wsMgr.createSyncedFile(selectedInstance, tableConfig, recordToSave, true);
            wsMgr.writeSyncedFiles(selectedInstance);
            if(!fileCreation){
                vscode.window.showWarningMessage('Failed to create file during Sync Record. See logs for details.');
            }
        });
    }
    
    async pullAllAppFiles() {
        let func = 'pullAllAppFiles';
        let client: RESTClient;
        this.logger.info(this.lib, func, 'START');
        
        let wsManager = new WorkspaceManager();

        
        let selectedInstance:InstanceMaster = await this.instanceList.selectInstance();
        if(!selectedInstance){
            vscode.window.showWarningMessage('Load all app files aborted. Instances not selected.');
            return undefined;
        }

        //setup our rest client and grab the available application records.
        client = new RESTClient(selectedInstance);
        
        let appRecords = await client.getRecords('sys_scope', 'name!=Global', ['name', 'scope', 'short_description']);
        
        if(!appRecords || appRecords.length === 0){
            vscode.window.showWarningMessage('Load all app files aborted. Did not find any applications for the selected instance.');
            return undefined;
        }
        
        //get config and see if we're showing SN Apps or not. 
        let vsConfig = vscode.workspace.getConfiguration();
        let showSNApps = vsConfig.get('snich.showSNApps');
        
        let appItems = <Array<SNQPItem>>[];
        appRecords.forEach((appRec: any) => {
            if (!showSNApps && appRec.scope.indexOf('sn_') === 0) {
                //don't add if we aren't showing sn app, and app returned was an sn_ app scope. 
            } else {
                appItems.push({ label: appRec.name + " (" + appRec.scope + ")", description: appRec.short_description, value: appRec });
            }
        });

        if (appItems.length === 0) {
            vscode.window.showWarningMessage('Selected instance: ' + selectedInstance.getConfig().name + ' did not have any applications that were not in the SN Scope. Adjust settings to allow SN apps or create a scopped application to start syncing records.');
            return undefined;
        }
        
        let appSelected = await vscode.window.showQuickPick(appItems, { placeHolder: "Select application to retrieve files from.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
        if(!appSelected){
            vscode.window.showWarningMessage('Load all app files aborted. No application selected.');
            return undefined;
        }

        let appScope = appSelected.value.scope;
        let appSys = appSelected.value.sys_id;
        let appName = appSelected.value.name;
        let appFsPath = `${appName} (${appScope})`;

        if(!selectedInstance.getApplicationById(appSys)){
            selectedInstance.addApplication(appName, appSys, appScope, appFsPath);
        };

        let tables = selectedInstance.tableConfig.tables;

        snichOutput.show();
        snichOutput.appendLine('Loading all application files...');
        
        this.logger.info(this.lib, func, "About to process tables: ", tables);
        
        tables.forEach(async (tableConfig) => {
            client.hideProgress();
            //build our fields to get from server for this table config.
            let fields = <Array<string>>[];
            fields.push(tableConfig.display_field);
            fields = fields.concat(tableConfig.additional_display_fields);
            tableConfig.fields.forEach((field) => {
                fields.push(field.name);
            });
            let encodedQuery = 'sys_scope.scope=' + appScope;
            if(appScope === 'global'){
                encodedQuery = 'sys_scope=' + appSys;
            }

            let tableRecs = await client.getRecords(tableConfig.name, encodedQuery, fields);
            if(!tableRecs || tableRecs.length === 0){
                snichOutput.appendLine(`Created 0 files for: ${tableConfig.label} [${tableConfig.name}] (No Records Found)`);
                return false;
            }

            let tableRecFileRequests:Array<Promise<any>> = [];

            if (tableRecs) {
                
                tableRecs.forEach((record) => {
                    tableRecFileRequests.push(wsManager.createSyncedFile(selectedInstance, tableConfig, record, false));
                });

                await Promise.all(tableRecFileRequests);
                snichOutput.appendLine(`Created ${tableRecs.length} files for: ${tableConfig.label} [${tableConfig.name}]`);
            }

            //this.logger.debug(this.lib, func, "About to write synced files!:", selectedInstance);
            wsManager.writeSyncedFiles(selectedInstance);
            client.showProgress();
        });


        this.logger.info(this.lib, func, 'END');
        return true;
        
    }
}