import { snTableField, SNQPItem, snRecord } from "../myTypes/globals";
import { InstanceMaster} from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from "vscode";
import { SystemLogHelper } from "./LogHelper";
import { WorkspaceManager } from "./WorkspaceManager";


export class SyncedTableManager {
    instanceList:Array<InstanceMaster>;
    instance:InstanceMaster;
    logger:SystemLogHelper;
    lib:string = 'SyncedTableManager';
    
    constructor(instanceList?:Array<InstanceMaster>, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START');
        
        this.instanceList = instanceList || [];
        this.instance = new InstanceMaster();
        
        this.logger.info(this.lib, func, 'END');
    }
    
    /**
    * Configure a new Table to be synced for a given instance.
    * @return Returns modified instance that was selected. 
    */
    syncNew(){
        let func = 'syncNew';
        this.logger.info(this.lib, func, 'START');
        let client = <RESTClient>{};
        let qpItems:Array<SNQPItem> = [];
        let tableConfig = <TableConfig>{};
        
        this.logger.info(this.lib, func, 'About to build QP Items from instanceList', this.instanceList);
        
        this.instanceList.forEach((instance) => {
            qpItems.push({"label":instance.config.name, "detail":"Instance URL: " + instance.config.connection.url, value:instance });
        });
        
        this.logger.info(this.lib, func, 'About to show quick pick.');
        
        return vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{placeHolder:"Select instance to test connection", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true})
        .then((selectedInstance):any =>{
            if(selectedInstance){
                this.instance = selectedInstance.value;
                client = new RESTClient(this.instance.config);
                let encodedQuery = 'super_class.name=sys_metadata';
                return client.getRecords('sys_db_object', encodedQuery, ['name', 'label']);
            } else {
                return false;
            }
        })
        .then((tableRecs):any =>{
            if(tableRecs){
                let tableQPItems = <Array<SNQPItem>>[];
                tableRecs.forEach((table:snRecord) =>{
                    let label = table.label;                    
                    if(this.instance.tableConfig.configured_tables.indexOf(table.name) > -1){
                        label = table.label + '  ::Table Exists. Continuing Will Update Existing Configuration::';
                    }
                    tableQPItems.push({"label":label, "detail": table.name + ' - ' + table.sys_scope, value:table});
                });
                return vscode.window.showQuickPick(tableQPItems, {placeHolder:"Select a table to configure for syncing", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
            } else {
                return false;
            }
        }).then((selectedTable):any => {
            if(selectedTable){
                let tableObj = <snRecord>selectedTable.value;
                tableConfig = new TableConfig(tableObj.name);
                let dicQuery = 'name=' + tableObj.name + '^elementISNOTEMPTY';
                return client.getRecords('sys_dictionary', dicQuery, ['element', 'column_label', 'internal_type']);
            } else {
                return false;
            }
        }).then((dicRecs):any =>{
            
            if(dicRecs){
                this.logger.info(this.lib, func, "Dictionary records received. Building QPItems");
                let dicQPItems = <Array<SNQPItem>>[];
                dicRecs.forEach((dic:snRecord) => {
                    dicQPItems.push({"label":dic.column_label || "", "detail": dic.element + ' - ' + dic.internal_type, value:dic});
                });
                return vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{placeHolder:"Select all fields you want to sync.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true, canPickMany:true});
            } else {
                return false;
            }
        }).then((selectedFields) => {
            this.logger.info(this.lib, func, "Selected fields:", selectedFields);
            
            if(selectedFields.length > 0){
                let extensionAsker = (selectedPosition:number) => {
                    let func = 'extensionAsker';
                    
                    this.logger.info(this.lib,func, 'START', {position:selectedPosition, fieldsLength:selectedFields.length});
                    
                    return new Promise((resolve, reject) =>{
                        if(selectedPosition < selectedFields.length){
                            let selectedField = selectedFields[selectedPosition].value;
                            
                            this.logger.debug(this.lib, func, "Selected Field:", selectedField);
                            
                            return vscode.window.showInputBox(<vscode.InputBoxOptions>{placeHolder:"Do not include the . symmbol. Suggestions: js, html, css, txt", prompt:"Enter the file extension for field: " + selectedField.column_label + ' [' + selectedField.internal_type + ']', ignoreFocusOut:true}).then((extension) => {
                                if(extension){
                                    tableConfig.addField(selectedField.element, selectedField.column_label, extension);
                                    this.logger.debug(this.lib, func, 'Added field to table config.', tableConfig);
                                }
                                selectedPosition++;
                                this.logger.debug(this.lib, func, 'Going to ask next field.');
                                resolve(extensionAsker(selectedPosition));
                            });
                        } else {
                            this.logger.info(this.lib, func, 'No more fields to get extensions for!');
                            this.logger.info(this.lib, func, 'END');
                            
                            resolve(true);
                        }
                    });
                };
                
                //return our function, that is returning a promise, so i can continue my function chain when we're done looping!
                return extensionAsker(0);
            } else {
                vscode.window.showWarningMessage('No fields selected. Please be sure to checkbox, using mouse or space bar on item to select it. Then click okay or press enter to capture.');
                return false;
            }
        }).then((completed) =>{
            this.logger.info(this.lib, func, 'Performing final steps.');
            if(completed){
                
                this.logger.info(this.lib, func, 'Adding table config to instance tableConfig. Saving file using WorkspaceManaget');
                this.instance.tableConfig.addTable(tableConfig);
                let wsMgr = new WorkspaceManager(this.logger);
                wsMgr.writeTableConfig(this.instance);
                
                this.logger.info(this.lib, func, 'END');
                return this.instance;
            } else {
                this.logger.info(this.lib, func, 'END');
                return false;
            }
        });
    }
    
}

export class SNDefaultTables {
    tables:Array<TableConfig> = [];
    configured_tables:Array<string> = [];
    
    constructor(defaultTables?:Array<TableConfig>){
        if(defaultTables){
            this.tables = defaultTables;
        } else {
            this.setupDefaults();
        }
    }
    
    setupDefaults(){
        //==== sys_script ======
        let sys_script = new TableConfig('sys_script');
        sys_script.setDisplayField('name');
        sys_script.addField('script', 'Script', 'js');
        this.addTable(sys_script);
        
        //==== sp_widget ========
        let sp_widget = new TableConfig('sp_widget');
        sp_widget.setLabel('Widget');
        sp_widget.setDisplayField("name");
        sp_widget.addField('template', 'Body HTML template', 'html');
        sp_widget.addField('css', 'CSS', 'css');
        sp_widget.addField('script', 'Server Script', 'js');
        sp_widget.addField('client_script', 'Client script', 'js');
        sp_widget.addField('link', 'Link', 'js');
        sp_widget.addField('demo_data', 'Demo data', 'json');
        sp_widget.addField('option_schema', 'Option schema', 'json');
        this.addTable(sp_widget);
        
        let sys_script_include = new TableConfig('sys_script_include');
        sys_script_include.setDisplayField('name');
        sys_script_include.addField('script', 'Script', 'js');
        this.addTable(sys_script_include);


        
    }
    /**@todo Remove this and subsequent calls to this function. This will likely come when re-structing this class to be the master tables config class. */
    getTables(){
        return this.tables;
    }
    
    addTable(table:TableConfig){
        this.configured_tables.push(table.name);
        this.tables.push(table);
    }
    
}

export class InstanceTableConfig {
    tableNameList:Array<string> = [];
    tables:Array<TableConfig> = [];
    
    setupCommon(){
        //==== sys_script ======
        let sys_script = new TableConfig('sys_script');
        sys_script.setDisplayField('name');
        sys_script.addField('script', 'Script', 'js');
        this.addTable(sys_script);
        
        //==== sp_widget ========
        let sp_widget = new TableConfig('sp_widget');
        sp_widget.setLabel('Widget');
        sp_widget.setDisplayField("name");
        sp_widget.addField('template', 'Body HTML template', 'html');
        sp_widget.addField('css', 'CSS', 'css');
        sp_widget.addField('script', 'Server Script', 'js');
        sp_widget.addField('client_script', 'Client script', 'js');
        sp_widget.addField('link', 'Link', 'js');
        sp_widget.addField('demo_data', 'Demo data', 'json');
        sp_widget.addField('option_schema', 'Option schema', 'json');
        this.addTable(sp_widget);
        
        let sys_script_include = new TableConfig('sys_script_include');
        sys_script_include.setDisplayField('name');
        sys_script_include.addField('script', 'Script', 'js');
        this.addTable(sys_script_include);

        let ui_page = new TableConfig('sys_ui_page');
        ui_page.setDisplayField('name');
        ui_page.addField('html', 'HTML', 'xml');
        ui_page.addField('client_script', 'Client Script', 'js');
        ui_page.addField('processing_script', 'Processing Script', 'js');
        this.addTable(ui_page);
    }
    
    addTable(table:TableConfig){
        this.tableNameList.push(table.name);
        let existingIndex = -1;
        this.tables.forEach((existingTable, index) =>{
            if(existingTable.name === table.name){
                existingIndex = index;
            }
        });
        if(existingIndex > -1){
            this.tables[existingIndex] = table;
        } else {
            this.tables.push(table);
        }
        
    }

}



export class TableConfig{
    name:string = "";
    label:string = "";
    display_field:string = "name";
    fields:Array<snTableField> = [];
    children:Array<TableConfig> = [];
    
    constructor(name:string){
        this.name = name;
    }
    
    setLabel(label:string){
        this.label = label;
    }
    
    setDisplayField(fieldName:string){
        this.display_field = fieldName;
    }
    
    addField(name:string, label:string, extension:string){
        this.fields.push(<snTableField>{
            table:this.name,
            name: name,
            label: label,
            extention: extension
        });
    }
    
    addChildTable(tableConfig:TableConfig){
        this.children.push(tableConfig);
    }
}
