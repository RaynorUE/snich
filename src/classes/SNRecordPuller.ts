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
        let tableqpItems:Array<SNQPItem> = []
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
      
            let fields = ["name"];
            fields.push(tableConfig.display_field);
            return client.getRecords(tableRec.name, "", fields, true);
        });

            }).then((selectedTable): any => {
                if (selectedTable) {
                    
                    let tableRec = selectedTable.value;
                    this.logger.info(this.lib, func, "Selected table:", tableRec);
                    this.activeInstanceData.tableConfig.tables.forEach((table) => {
                        
                    });
    
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
    
    async pullAllAppFiles() {
        let func = 'pullAllAppFiles';
        var client: RESTClient;
        this.logger.info(this.lib, func, 'START');
        
        let wsManager = new WorkspaceManager();
        let recordRecursor = async function (instanceData: InstanceMaster, tableConfigIndex: number, appScope: string) {
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
                    let tableProm = new Promise( (resolve,reject) => {
                        return client.getRecords(tableConfig.name, encodedQuery, fields)
                        .then((tableRecs) => {
                            if (tableRecs) {
                                tableRecs.forEach((record) => {
                                    wsManager.createSyncedFile(instanceData, tableConfig, record);
                                });
                                return true;
                            } else {
                                return false;
                            }
                        });
                    });

                    console.log('Table prom is:', tableProm);
                    tablePromises.push(tableProm);
                });
                
                let result = await Promise.all(tablePromises).then((allResult) =>{
                    return true;
                }).catch((err) => {
                    return false;
                });

                return result;
        };
        
        let qpItems: Array<SNQPItem> = [];
        this.instanceList.forEach((instance) => {
            if(instance.lastSelected){
                qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
            }
        });
        this.instanceList.forEach((instance) => {
            if(instance.lastSelected === false){
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
