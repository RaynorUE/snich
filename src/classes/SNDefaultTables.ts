import { snTableField, SNQPItem, snRecord } from "../myTypes/globals";
import { InstanceMaster, InstancesList} from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from "vscode";
import { SystemLogHelper } from "./LogHelper";
import { WorkspaceManager } from "./WorkspaceManager";


export class SyncedTables {
    tables:Array<TableConfig> = [];
    instanceList:InstancesList;
    logger:SystemLogHelper;
    lib:string = 'SyncedTableManager';
    
    constructor(instanceList:InstancesList, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START');
        
        this.instanceList = instanceList;
        
        this.logger.info(this.lib, func, 'END');
    }
    
    /**
    * Configure a new Table to be synced for a given instance.
    * @return Returns modified instance that was selected. 
    */
    async syncNew(){
        let func = 'syncNew';
        this.logger.info(this.lib, func, 'START');
        let client = <RESTClient>{};
        
        //select an instance..
        let selectedInstance:InstanceMaster = await this.instanceList.selectInstance();
        if(!selectedInstance){
            vscode.window.showWarningMessage('Table Configuration Aborted.');
            return undefined;
        }

        //query instance for tables extending sys_metadata
        client = new RESTClient(selectedInstance.getConfig());
        let encodedQuery = 'super_class.name=sys_metadata';
        let tableRecs = await client.getRecords('sys_db_object', encodedQuery, ['name','label']);
        if(tableRecs.length === 0){
            vscode.window.showWarningMessage('Attempted to get tables from instance, but no tables extending sys_metadata were found. See logs for details.');
            return undefined;
        }

        //have them select a table..
        let tableQPItems = <Array<SNQPItem>>[];
        tableRecs.forEach((table:snRecord) =>{
            let label = table.label;
            if(selectedInstance.tableConfig.tableNameList.indexOf(table.name) > -1){
                label = table.label + ' |=> Table Config Exists. Continuing Will Overwrite Existing Configuration.';
            }
            tableQPItems.push({"label":label, "detail": table.name + ' - ' + table.sys_scope, value:table});
        });

        let selectedTable = await vscode.window.showQuickPick(tableQPItems, {placeHolder:"Select a table to configure for syncing", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
        if(!selectedTable){
            vscode.window.showWarningMessage('No table selectd. Aborting new table config.');
            return false;
        }

        let tableConfig = new TableConfig(selectedTable.value.name);
        tableConfig.setLabel(selectedTable.value.label);
        let dicQuery = 'name=' + tableConfig.name + '^elementISNOTEMPTY';
        let dicRecs = await client.getRecords('sys_dictionary', dicQuery, ['element', 'column_label', 'internal_type']);

        if(!dicRecs.length){
            vscode.window.showWarningMessage(`Attempted to get dictionary entries for table [${tableConfig.name}] and none were found! Aborting table configuration.`);
            return;
        }
        
        this.logger.info(this.lib, func, "Dictionary records received. Building QPItems");
        let dicQPItems = <Array<SNQPItem>>[];
        dicRecs.forEach((dic:snRecord) => {
            dicQPItems.push({"label":dic.column_label || "", "detail": dic.element + ' - ' + dic.internal_type, value:dic});
        });

        let selectedDics:any = await vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{placeHolder:"Select all fields you want to sync.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true, canPickMany:true});
        if(!selectedDics){
            vscode.window.showWarningMessage('No dictionary entries selected. Aborting Table configuration');
            return;
        }
        
        this.logger.info(this.lib, func, "Selected fields:", selectedDics);
        if(selectedDics.length > 0){
            let extensionAsker = (selectedPosition:number) => {
                let func = 'extensionAsker';
                
                this.logger.info(this.lib,func, 'START', {position:selectedPosition, fieldsLength:selectedDics.length});
                
                return new Promise((resolve, reject) =>{
                    if(selectedPosition < selectedDics.length){
                        let selectedField = selectedDics[selectedPosition].value;
                        
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
        }

        selectedInstance.tableConfig.addTable(tableConfig);
        let wsMgr = new WorkspaceManager(this.logger);
        wsMgr.writeTableConfig(selectedInstance);

    }
    
}

export class InstanceTableConfig {
    tableNameList:Array<string> = [];
    tables:Array<TableConfig> = [];

    constructor(tableData?:InstanceTableConfig){
        if(tableData){
            this.setFromConfigFile(tableData);
        } else {
            this.setupCommon();
        }
    }

    setFromConfigFile(tableData:InstanceTableConfig){
        this.tables = tableData.tables;
        this.tableNameList = tableData.tableNameList;
    }
    
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
