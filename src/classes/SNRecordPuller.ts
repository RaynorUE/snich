import { snRecord, SNApplication, snTableConfig, SNQPItem } from "../myTypes/globals";
import { SystemLogHelper } from "./LogHelper";
import { InstanceMaster, InstancesList } from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from 'vscode';
import { WorkspaceManager } from "./WorkspaceManager";

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
            vscode.window.showWarningMessage('Aborted Sync Record');
            return;
        }
        
        let client = new RESTClient(selectedInstance.getConfig(), this.logger);
        let encodedQuery = 'super_class.name=sys_metadata^nameIN' + selectedInstance.tableConfig.tableNameList;
        
        let tableRecs:Array<snRecord> = await client.getRecords('sys_db_object', encodedQuery, ["name", "label"], true);
        
        if(!tableRecs || tableRecs.length === 0){
            vscode.window.showWarningMessage('Attempted to get configured tables from instance and failed. Aborting sync record. See logs for detail.');
            return;
        }
        
        let tableqpItems:Array<SNQPItem> = [];
        tableRecs.forEach((record: snRecord) => {
            tableqpItems.push({ "label": record.label, "detail": record.name + ' - ' + record.sys_scope, value: record });
        });
        
        this.logger.info(this.lib, func, "Built quick pick options based on table records returned.");
        
        let tableSelection = await vscode.window.showQuickPick(tableqpItems, <vscode.QuickPickOptions>{ "placeHolder": "Select table to retrieve record from. Table Not found? Make sure it's in the table_config. Or configure table using command pallete.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
        if(!tableSelection){
            vscode.window.showWarningMessage('Sync record aborted. No Table Selected.');
            return;
        }
        let tableRec = tableSelection.value;
        let tableConfig = <snTableConfig>{};
        selectedInstance.tableConfig.tables.forEach((table) =>{
            if (table.name === tableRec.name) {
                this.logger.info(this.lib, func, 'Found table config.', table);
                tableConfig = table;
            }
        });
        
        let fields = ["name"];
        fields.push(tableConfig.display_field);
        
        let tableFileRecs = await client.getRecords(tableRec.name, "", fields, true);
        if(!tableFileRecs || tableFileRecs.length === 0){
            vscode.window.showWarningMessage('Did not find any records for table. Aborting sync record.');
            return undefined;
        }
        
        let fileqpitems:Array<SNQPItem> = [];
        tableFileRecs.forEach((record:snRecord) => {
            fileqpitems.push({ "label": record.name, "detail": record.name + ' - ' + record.sys_scope, value: record });
            
        });
        
        let selectedFileRec = await vscode.window.showQuickPick(fileqpitems, <vscode.QuickPickOptions>{ "placeHolder": "Record to retrieved.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
        if(!selectedFileRec){
            vscode.window.showWarningMessage('No record selected. Sync record aborted.');
            return undefined;        
        }
        this.logger.info(this.lib, func, 'Selected file record:', selectedFileRec);
        
        
        let fileRec = selectedFileRec.value;
        this.logger.info(this.lib, func, 'selected file', fileRec);
        let fieldsList = [];
        fieldsList.push(tableConfig.display_field);
        tableConfig.fields.forEach((field) => {
            fieldsList.push(field.name);
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
        client = new RESTClient(selectedInstance.getConfig());
        let appRecords = await client.getRecords('sys_scope', 'scope!=global', ['name', 'scope', 'short_description']);
        
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
        //await recordRecursor(selectedInstance, 0, appScope);

        let tables = selectedInstance.tableConfig.tables;
        
        tables.forEach(async (tableConfig) => {
            //build our fields to get from server for this table config.
            let fields = <Array<string>>[];
            fields.push(tableConfig.display_field);
            tableConfig.fields.forEach((field) => {
                fields.push(field.name);
            });
            let encodedQuery = 'sys_scope.scope=' + appScope;
            let tableRecs = await client.getRecords(tableConfig.name, encodedQuery, fields);
            if(!tableRecs || tableRecs.length === 0){
                vscode.window.showInformationMessage(`Did not find any records for table: ${tableConfig.label} [${tableConfig.name}]`);
                return false;
            }

            if (tableRecs) {
                tableRecs.forEach(async (record) => {
                    await wsManager.createSyncedFile(selectedInstance, tableConfig, record, false);
                });
                vscode.window.showInformationMessage(`Created ${tableRecs.length} files for: ${tableConfig.label} [${tableConfig.name}]` );
                wsManager.writeSyncedFiles(selectedInstance);
            }
        });


        this.logger.info(this.lib, func, "About to write synced files!:", selectedInstance);
        vscode.window.showInformationMessage('All application files have been loaded. You may need to refresh your workspace explorer.');
        this.logger.info(this.lib, func, 'END');
        return true;
        
    }
}