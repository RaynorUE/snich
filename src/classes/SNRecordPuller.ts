import { snTableField, snRecord, snTableConfig, SNApplication } from "../myTypes/globals";
import { SystemLogHelper } from "./LogHelper";
import { Uri } from "vscode";
import { InstanceMaster } from "./InstanceConfigManager";
import { RESTClient} from "./RESTClient"
import * as vscode from 'vscode';


export class SNFilePuller{
    
    instanceList:Array<InstanceMaster>;
    logger:SystemLogHelper;
    appScope?:SNApplication;
    activeInstanceData:InstanceMaster;
    client:RESTClient;
    lib:string = "SNFilePuller";

    constructor(instanceList:Array<InstanceMaster>, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START', );
        this.instanceList = instanceList;
        this.activeInstanceData = new InstanceMaster();
        this.client = new RESTClient(this.activeInstanceData.config, this.logger);
        this.logger.info(this.lib, func, 'END');

    }

    pullRecord(){
        let func = 'pullRecord';
        return new Promise((resolve, reject) =>{
            let qpItems:Array<any> = [];
            this.instanceList.forEach((instance) => {
                qpItems.push({"label":instance.config.name, "detail":"Instance URL: " + instance.config.connection.url, value:instance });
            });
            vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{placeHolder:"Select instance to test connection", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true})
            .then((selectedInstance) =>{
				this.logger.info(this.lib, func, 'Selected:', selectedInstance);
				if(selectedInstance){
					this.activeInstanceData = selectedInstance.value;
					this.logger.info(this.lib, func, 'Selected instance:', this.activeInstanceData );
					
					this.client = new RESTClient(this.activeInstanceData.config, this.logger);
                    return this.client.getRecords('sys_db_object', 'super_class.name=sys_metadata', ["sys_id","name","label","sys_scope"], true);
                } else {
                    return false;
                }
            }).then((tableRecs) =>{
                this.logger.info(this.lib, func, "records returned:", tableRecs.length);
                let tableqpItems:Array<any> = [];
                if(tableRecs.length > 0){
                    tableRecs.forEach((record:any) =>{
                        tableqpItems.push({"label":record.label, "detail": record.name + ' - ' + record.sys_scope, value:record});
                    });
                    this.logger.info(this.lib, func, "Built quick pick options based on records returned.");
                    return vscode.window.showQuickPick(tableqpItems, <vscode.QuickPickOptions>{"placeHolder":"Select table to retrieve record from.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
                } else {
                    return false;
                }
            }).then((selectedTable) =>{
                if(selectedTable){
                    let tableRec = selectedTable.value;
                    this.logger.info(this.lib, func, "Selected table:", tableRec);
                    return this.client.getRecords(tableRec.name, "", ["name","sys_id","sys_scope"], true);
                }
            }).then((fileRecs) =>{
                this.logger.info(this.lib, func, "Got records from table query:", fileRecs.length);
                if(fileRecs){
                    let fileqpItems:Array<any> = [];
                    fileRecs.forEach((record:any) =>{
                        fileqpItems.push({"label":record.name, "detail": record.name + ' - ' + record.sys_scope, value: record});
                    });
                    return vscode.window.showQuickPick(fileqpItems, <vscode.QuickPickOptions>{"placeHolder":"Select table to retrieve record from.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
                } else {
                    return false;
                }
            }).then((selectedFileRec) =>{
                if(selectedFileRec){
                    let fileRec:snRecord = selectedFileRec.value;
                    return this.client.getRecord(fileRec.name, fileRec.sys_id, ['name','sys_id','script']);
                } else {
                    return false;
                }
            }).then(function(rec:any){
                return vscode.workspace.openTextDocument({content:rec.script || "Script field not found",language:"javascript"});
            }).then((doc) => {
                return vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, false);
            }).then((result) =>{
                resolve(true);
            });
        });
    }

    /*createFileFromSNRecord(snTableConfig:snTableConfig, snTableField:snTableField, record:snRecord){
        let sycnedFile = new SyncedFile(this.instanceData.name, snTableField, record);
    }
    */

    updateSNRecord(){
        
    }


    setAppScope(app:SNApplication){
        this.appScope = app;
    }

    setActiveInstance(instance:InstanceDataObj){
        this.activeInstanceData = instance;
    }
}



export class SyncedFile {
    uri:Uri = Uri.parse('./');
    table:string = "";
    sys_id:string = "";
    content_field:string = "";
    sys_scope:string = "";
    sys_package:string = "";
    
    constructor(instanceName:string, snTableField:snTableField, snRecordObj:snRecord){
        this.table = snTableField.table;
        this.sys_id = snRecordObj.sys_id;
        this.content_field = snTableField.name;
        this.sys_scope = snRecordObj.sys_scope || "global";
        this.sys_package = snRecordObj.sys_package || "";
    }
}