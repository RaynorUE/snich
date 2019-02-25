import { snRecord, SNApplication, snTableConfig, SNQPItem } from "../myTypes/globals";
import { SystemLogHelper } from "./LogHelper";
import { InstanceMaster } from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from 'vscode';
import { WorkspaceManager } from "./WorkspaceManager";

export class SNFilePuller {
    
    instanceList: Array<InstanceMaster>;
    logger: SystemLogHelper;
    appScope?: SNApplication;
    activeInstanceData: InstanceMaster;
    lib: string = "SNFilePuller";
    
    constructor(instanceList: Array<InstanceMaster>, logger?: SystemLogHelper) {
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START');
        this.instanceList = instanceList;
        this.activeInstanceData = new InstanceMaster();
        this.logger.info(this.lib, func, 'END');
    }
    
    pullRecord() {
        let func = 'pullRecord';
        let client = new RESTClient(this.activeInstanceData.config);
        let fileRec = <snRecord>{};
        let tableConfig = <snTableConfig>{};
        
        return new Promise((resolve, reject) => {
            let qpItems: Array<SNQPItem> = [];
            this.instanceList.forEach((instance) => {
                if(instance.lastSelected){
                    qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
                }
            });
            this.instanceList.forEach((instance) => {
                if(instance.lastSelected == false){
                    qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
                }
            });
            vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{ placeHolder: "Select instance to test connection", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true })
            .then((selectedInstance): any => {
                this.logger.info(this.lib, func, 'Selected:', selectedInstance);
                if (selectedInstance) {
                    this.activeInstanceData = selectedInstance.value;
                    client = new RESTClient(this.activeInstanceData.config, this.logger);
                    let encodedQuery = 'super_class.name=sys_metadata^nameIN' + this.activeInstanceData.tableConfig.tableNameList;
                    
                    return client.getRecords('sys_db_object', encodedQuery, ["name", "label"], true);
                } else {
                    return false;
                }
            }).then((tableRecs): any => {
                this.logger.info(this.lib, func, "table records returned:", tableRecs.length);
                let tableqpItems: Array<SNQPItem> = [];
                if (tableRecs.length > 0) {
                    tableRecs.forEach((record: snRecord) => {
                        tableqpItems.push({ "label": record.label, "detail": record.name + ' - ' + record.sys_scope, value: record });
                    });
                    this.logger.info(this.lib, func, "Built quick pick options based on table records returned.");
                    return vscode.window.showQuickPick(tableqpItems, <vscode.QuickPickOptions>{ "placeHolder": "Select table to retrieve record from. Table Not found? Make sure it's in the table_config. Or configure table using command pallete.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
                } else {
                    return false;
                }
            }).then((selectedTable): any => {
                if (selectedTable) {
                    
                    let tableRec = selectedTable.value;
                    this.logger.info(this.lib, func, "Selected table:", tableRec);
                    this.activeInstanceData.tableConfig.tables.forEach((table) => {
                        if (table.name === tableRec.name) {
                            this.logger.info(this.lib, func, 'Found table config.', table);
                            tableConfig = table;
                        }
                    });
                    
                    let fields = ["name"];
                    fields.push(tableConfig.display_field);
                    return client.getRecords(tableRec.name, "", fields, true);
                } else {
                    return false;
                }
            }).then((fileRecs): any => {
                this.logger.info(this.lib, func, "Got records from table query:", fileRecs.length);
                if (fileRecs) {
                    let fileqpItems: Array<SNQPItem> = [];
                    fileRecs.forEach((record: snRecord) => {
                        fileqpItems.push({ "label": record.name, "detail": record.name + ' - ' + record.sys_scope, value: record });
                    });
                    return vscode.window.showQuickPick(fileqpItems, <vscode.QuickPickOptions>{ "placeHolder": "Record to retrieved.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
                } else {
                    return false;
                }
            }).then((selectedFileRec): any => {
                this.logger.info(this.lib, func, 'Selected file record:', selectedFileRec);
                
                if (selectedFileRec) {
                    fileRec = selectedFileRec.value;
                    this.logger.info(this.lib, func, 'selected file', fileRec);
                    let fieldsList = [];
                    fieldsList.push(tableConfig.display_field);
                    tableConfig.fields.forEach((field) => {
                        fieldsList.push(field.name);
                    });
                    
                    return client.getRecord(tableConfig.name, fileRec.sys_id, fieldsList);
                } else {
                    return false;
                }
            }).then((recordToSave) => {
                this.logger.info(this.lib, func, 'Record to save', recordToSave);
                let wsMgr = new WorkspaceManager(this.logger);
                return new Promise((resolve, reject) => {
                    let result = wsMgr.createSyncedFile(this.activeInstanceData, tableConfig, recordToSave);
                    resolve(result);
                });
            }).then((result: any) => {
                if(result){
                    resolve(this.activeInstanceData);
                }
                resolve(false);
            });
        });
    }
    
    pullAllAppFiles() {
        let func = 'pullAllAppFiles';
        var client: RESTClient;
        this.logger.info(this.lib, func, 'START');
        
        let wsManager = new WorkspaceManager();
        let recordRecursor = function (instanceData: InstanceMaster, tableConfigIndex: number, appScope: string) {
            return new Promise((resolve, reject) => {
                
                let tables = instanceData.tableConfig.tables;
                let tablePromises = <Array<Promise<any>>>[];
                console.log('Table count:', tables.length);
                tables.forEach((tableConfig) => {
                    let fields = <Array<string>>[];
                    fields.push(tableConfig.display_field);
                    tableConfig.fields.forEach((field) => {
                        fields.push(field.name);
                    });
                    let encodedQuery = 'sys_scope.scope=' + appScope;
                    console.log('Processing table.', tableConfig);                    
                    let tableProm = new Promise((resolve,reject) => {
                        return client.getRecords(tableConfig.name, encodedQuery, fields)
                        .then((tableRecs) => {
                            if (tableRecs) {
                                tableRecs.forEach((record) => {
                                    wsManager.createSyncedFile(instanceData, tableConfig, record);
                                });
                                resolve();
                            }
                        });
                    });
                    
                    
                    console.log('Table prom is:', tableProm);
                    tablePromises.push(tableProm)
                });
                Promise.all(tablePromises).then(() =>{
                    console.log('all fulfilled');
                    resolve(true);
                });
            });
        };
        
        let qpItems: Array<SNQPItem> = [];
        this.instanceList.forEach((instance) => {
            if(instance.lastSelected){
                qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
            }
        });
        this.instanceList.forEach((instance) => {
            if(instance.lastSelected == false){
                qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
            }
        });
        return vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{ placeHolder: "Select instance", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true })
        .then((selectedInstance): any => {
            this.logger.info(this.lib, func, 'Selected:', selectedInstance);
            if (selectedInstance) {
                this.activeInstanceData = selectedInstance.value;
                client = new RESTClient(this.activeInstanceData.config, this.logger);
                
                return client.getRecords('sys_scope', 'scope!=global', ['name', 'scope', 'short_description']);
            } else {
                return false;
            }
        })
        .then((appRecords): any => {
            let vsConfig = vscode.workspace.getConfiguration();
            let showSNApps = vsConfig.get('snich.showSNApps');
            
            let appItems = <Array<SNQPItem>>[];
            if (appRecords.length > 0) {
                appRecords.forEach((appRec: any) => {
                    if (!showSNApps && appRec.scope.indexOf('sn_') === 0) {
                        //don't add if we aren't showing sn app, and app returned was an sn_ app scope. 
                    } else {
                        appItems.push({ label: appRec.name + " (" + appRec.scope + ")", description: appRec.short_description, value: appRec });
                    }
                });
                if (appItems.length === 0) {
                    vscode.window.showWarningMessage('Selected instance: ' + this.activeInstanceData.config.name + ' did not have any applications that were not in the SN Scope. Adjust settings to allow SN apps or create a scopped application to start syncing records.');
                    return false;
                } else {
                    return vscode.window.showQuickPick(appItems, { placeHolder: "Select application to retrieve files from.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
                }
            } else {
                return false;
            }
        }).then((appSelected): any => {
            if (appSelected) {
                let appScope = appSelected.value.scope;
                return recordRecursor(this.activeInstanceData, 0, appScope).then((finished) => {
                    if (finished) {
                        vscode.window.showInformationMessage('All application files have been loaded. You may need to refresh your workspace explorer.');
                        return this.activeInstanceData;
                    }
                });
            } else {
                return false;
            }
        });
    }
    
    setAppScope(app: SNApplication) {
        this.appScope = app;
    }
    
    setActiveInstance(instance: InstanceMaster) {
        this.activeInstanceData = instance;
    }
}
