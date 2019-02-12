import { snRecord, SNApplication, snTableConfig, SNQPItem } from "../myTypes/globals";
import { SystemLogHelper } from "./LogHelper";
import { InstanceMaster } from "./InstanceConfigManager";
import { RESTClient} from "./RESTClient";
import * as vscode from 'vscode';
import { WorkspaceManager } from "./WorkspaceManager";



export class SNFilePuller{
    
    instanceList:Array<InstanceMaster>;
    logger:SystemLogHelper;
    appScope?:SNApplication;
    activeInstanceData:InstanceMaster;
    lib:string = "SNFilePuller";

    constructor(instanceList:Array<InstanceMaster>, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START', );
        this.instanceList = instanceList;
        this.activeInstanceData = new InstanceMaster();
        this.logger.info(this.lib, func, 'END');
    }

    pullRecord(){
        let func = 'pullRecord';
        let client = new RESTClient(this.activeInstanceData.config);
        let fileRec = <snRecord>{};
        let tableConfig = <snTableConfig>{};

        return new Promise((resolve, reject) =>{
            let qpItems:Array<SNQPItem> = [];
            this.instanceList.forEach((instance) => {
                qpItems.push({"label":instance.config.name, "detail":"Instance URL: " + instance.config.connection.url, value:instance });
            });
            vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{placeHolder:"Select instance to test connection", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true})
            .then((selectedInstance):any =>{
                this.logger.info(this.lib, func, 'Selected:', selectedInstance);
				if(selectedInstance){
                    this.activeInstanceData = selectedInstance.value;
                    client = new RESTClient(this.activeInstanceData.config, this.logger);
                    let encodedQuery = 'super_class.name=sys_metadata^nameIN' + this.activeInstanceData.tableConfig.configured_tables;

                    return client.getRecords('sys_db_object', encodedQuery, ["name","label"], true);
                } else {
                    return false;
                }
            }).then((tableRecs):any =>{
                this.logger.info(this.lib, func, "table records returned:", tableRecs.length);
                let tableqpItems:Array<SNQPItem> = [];
                if(tableRecs.length > 0){
                    tableRecs.forEach((record:snRecord) =>{
                        tableqpItems.push({"label":record.label, "detail": record.name + ' - ' + record.sys_scope, value:record});
                    });
                    this.logger.info(this.lib, func, "Built quick pick options based on table records returned.");
                    return vscode.window.showQuickPick(tableqpItems, <vscode.QuickPickOptions>{"placeHolder":"Select table to retrieve record from. Table Not found? Make sure it's in the table_config. Or configure table using command pallete.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
                } else {
                    return false;
                }
            }).then((selectedTable):any =>{
                if(selectedTable){
                   
                    let tableRec = selectedTable.value;
                    this.logger.info(this.lib, func, "Selected table:", tableRec);
                    this.activeInstanceData.tableConfig.tables.forEach((table) => {
                        if(table.name === tableRec.name){
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
            }).then((fileRecs):any =>{
                this.logger.info(this.lib, func, "Got records from table query:", fileRecs.length);
                if(fileRecs){
                    let fileqpItems:Array<SNQPItem> = [];
                    fileRecs.forEach((record:snRecord) =>{
                        fileqpItems.push({"label":record.name, "detail": record.name + ' - ' + record.sys_scope, value: record});
                    });
                    return vscode.window.showQuickPick(fileqpItems, <vscode.QuickPickOptions>{"placeHolder":"Record to retrieved.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
                } else {
                    return false;
                }
            }).then((selectedFileRec):any =>{
                this.logger.info(this.lib, func, 'Selected file record:', selectedFileRec);
                
                if(selectedFileRec){
                    fileRec = selectedFileRec.value;
                    this.logger.info(this.lib, func, 'selected file', fileRec);
                    let fieldsList = [];
                    fieldsList.push(tableConfig.display_field);
                    tableConfig.fields.forEach((field) =>{
                        fieldsList.push(field.name);
                    });

                    return client.getRecord(tableConfig.name, fileRec.sys_id, fieldsList);
                } else {
                    return false;
                }
            }).then((recordToSave) => {
                this.logger.info(this.lib, func, 'Record to save', recordToSave);
                let wsMgr = new WorkspaceManager(this.logger);
                return new Promise((resolve,reject) =>{
                    let result = wsMgr.createSyncedFile(this.activeInstanceData, tableConfig, recordToSave);
                    resolve(result);
                });
            }).then((result:any) =>{
                resolve(result);
            });
        });
    }

    setAppScope(app:SNApplication){
        this.appScope = app;
    }

    setActiveInstance(instance:InstanceMaster){
        this.activeInstanceData = instance;
    }
}



