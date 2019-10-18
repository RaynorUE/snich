import { snTableField, SNQPItem, snRecord } from "../myTypes/globals";
import { InstanceMaster} from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from "vscode";
import { SystemLogHelper } from "./LogHelper";
import { WorkspaceManager } from "./WorkspaceManager";


export class ConfiguredTables {
    tables:Array<TableConfig> = [];
    tableNameList:Array<string> = [];
    private logger:SystemLogHelper;
    private lib:string = 'SyncedTableManager';
    
    constructor(tableData?:ConfiguredTables, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START');
        
        if(tableData){
            this.setFromConfigFile(tableData);
        } else {
            this.setupCommon();
        }
        
        this.logger.info(this.lib, func, 'END');
    }
    
    /**
    * Configure a new Table to be synced for a given instance.
    * @return Returns modified instance that was selected. 
    */
    async syncNew(selectedInstance:InstanceMaster){
        let func = 'syncNew';
        this.logger.info(this.lib, func, 'START');
        let client = <RESTClient>{};


        //query instance for tables extending sys_metadata
        client = new RESTClient(selectedInstance.getConfig());
        let encodedQuery = 'super_class.nameINSTANCEOFsys_metadata';
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
        let dicRecs = await this.getTableFields(tableConfig.name, client);

        if(!dicRecs.length){
            vscode.window.showWarningMessage(`Attempted to get dictionary entries for table [${tableConfig.name}] and none were found! Aborting table configuration.`);
            return;
        }
        
        this.logger.info(this.lib, func, "Dictionary records received. Building QPItems");
        let dicQPItems = <Array<SNQPItem>>[];
        let missingNameField = true;
        let primaryDisplayField = 'name';
        dicRecs.forEach((dic:snRecord) => {
            if(dic.element === 'name'){
                missingNameField = false;
            }
            dicQPItems.push({"label":dic.column_label || "", "detail": dic.element + ' - ' + dic.internal_type, value:dic});
        });

            
        let settings = vscode.workspace.getConfiguration();
        let multiFieldNameSep = settings.get('snich.syncedRecordNameSeparator') || "^";
        let alwaysAskPrimField = settings.get('snich.alwaysAskPrimaryDisplayField') || false;

        if(alwaysAskPrimField || missingNameField){
             let selectedPrimeDisplayField:any = await vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{ placeHolder:"Select field to use for file name.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true});
             if(!selectedPrimeDisplayField){
                vscode.window.showWarningMessage('No Field selected as primary for file name generation. Aborting Table configuration');
                 return;
             }

             primaryDisplayField = selectedPrimeDisplayField.value.element;
        }

        tableConfig.setDisplayField(primaryDisplayField);
        
        let selectedAdditionalDisplayFields:any = await vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{ placeHolder:"Additional fields for file name generation. Will use seperator in settings (currently: " + multiFieldNameSep + ")", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true, canPickMany:true});
        let selectedSyncFields:any = await vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{placeHolder:"Select all fields of data you want to sync.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true, canPickMany:true});

        if(selectedAdditionalDisplayFields && selectedAdditionalDisplayFields.length > 0){
            selectedAdditionalDisplayFields.forEach((selectedOption:SNQPItem) => {
                let selectedField = selectedOption.value;
                tableConfig.addDisplayField(selectedField.element);
            });
        }

        if(!selectedSyncFields || selectedSyncFields.length === 0){
            vscode.window.showWarningMessage('No data fields to syncselected. Aborting Table configuration');
            return;
        }
        
        this.logger.info(this.lib, func, "Selected fields:", selectedSyncFields);
        if(selectedSyncFields.length > 0){
            let extensionAsker = async (selectedPosition:number) => {
                let func = 'extensionAsker';
                
                this.logger.info(this.lib,func, 'START', {position:selectedPosition, fieldsLength:selectedSyncFields.length});
                
                return new Promise((resolve, reject) =>{
                    if(selectedPosition < selectedSyncFields.length){
                        let selectedField = selectedSyncFields[selectedPosition].value;
                        
                        this.logger.debug(this.lib, func, "Selected Field:", selectedField);
                        
                        return vscode.window.showInputBox(<vscode.InputBoxOptions>{placeHolder:"Suggestions: js, html, css, txt", prompt:"Enter the file extension for Field [Type]: " + selectedField.column_label + ' [' + selectedField.internal_type + ']', ignoreFocusOut:true}).then((extension) => {
                            if(extension){
                                extension = extension.replace(/\./g, ''); //replace any periods with nothing.
                                tableConfig.addField(selectedField.element, selectedField.column_label, extension);
                                this.logger.debug(this.lib, func, 'Added field to table config.', tableConfig);
                            }
                            selectedPosition++;
                            this.logger.debug(this.lib, func, 'Going to ask next field.');
                            resolve(extensionAsker(selectedPosition));
                        });
                    } else {
                        this.logger.info(this.lib, func, 'No more fields to get extensions for!');                        
                        resolve(true);
                    }
                });
            };
            await extensionAsker(0);
        }

        this.addTable(tableConfig);
        let wsMgr = new WorkspaceManager(this.logger);
        wsMgr.writeTableConfig(selectedInstance);
        vscode.window.showInformationMessage('Table added to configuration.', 'Sync New Record').then((choice) =>{
            if(choice === "Sync New Record"){
                vscode.commands.executeCommand('snich.instance.pull_record');
            }
        });
        this.logger.info(this.lib, func, 'END');
    }

    async getTableFields (tableName:String, RESTClient:RESTClient){
        let func = 'getTableFields';
        this.logger.info(this.lib, func, 'START', );

        let tableFields:Array<any> = [];
        /**
         * @todo Need to solve this dependency on PAUtils() at some point. Not a fan of it... As not everyone has PA turned on (Depending on age of installation)
         */
        let includeParents = "javascript:new PAUtils().getTableAncestors('"+tableName+"')";
        let dicQuery = 'name=' + includeParents + '^elementISNOTEMPTY^ORDERBYlabel';
        var dicRecs = await RESTClient.getRecords('sys_dictionary', dicQuery, ['column_label','element','name', 'internal_type']);
        
        if(dicRecs.length === 0){
            return tableFields;
        }

        this.logger.info(this.lib, func, 'END');
        return dicRecs;
        
    }

    getTable(tableName:String){
        var selectedTable = <TableConfig>{};
        this.tables.forEach((table) =>{
            if(table.name === tableName){
                selectedTable = table;
            }
        });

        return selectedTable;
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

    setFromConfigFile(tableData:ConfiguredTables){
        tableData.tables.forEach((table) =>{
            var config = new TableConfig(table.name);
            config.setFromConfigFile(table);
            this.tables.push(config);
        });
        this.tableNameList = tableData.tableNameList;
    }

    setupCommon(){
        //==== sys_script ======
        let sys_script = new TableConfig('sys_script');
        sys_script.setDisplayField('name');
        sys_script.addDisplayField('when');
        sys_script.addField('script', 'Script', 'js');
        this.addTable(sys_script);
        
        //==== sp_widget ========
        let sp_widget = new TableConfig('sp_widget');
        sp_widget.setLabel('Widget');
        sp_widget.setDisplayField("name");
        sp_widget.addField('template', 'Body HTML template', 'html');
        sp_widget.addField('css', 'CSS', 'scss');
        sp_widget.addField('script', 'Server sript', 'js');
        sp_widget.addField('client_script', 'Client controller', 'js');
        sp_widget.addField('link', 'Link', 'js');
        sp_widget.addField('demo_data', 'Demo data', 'json');
        sp_widget.addField('option_schema', 'Option schema', 'json');
        this.addTable(sp_widget);

        //==== Angular provider ========
        let sp_angular_provider = new TableConfig('sp_angular_provider');
        sp_angular_provider.setDisplayField('name');
        sp_angular_provider.addDisplayField('type');
        sp_angular_provider.addField('script', 'Client Script', 'js');
        this.addTable(sp_angular_provider);

        //==== Angular NG-Template ========
        let sp_ng_template = new TableConfig('sp_ng_template');
        sp_ng_template.setDisplayField('widget');
        sp_ng_template.addDisplayField('id');
        sp_ng_template.addField('template', 'Template', 'html');
        this.addTable(sp_ng_template);
        
        //==== script include ========

        let sys_script_include = new TableConfig('sys_script_include');
        sys_script_include.setDisplayField('name');
        sys_script_include.addField('script', 'Script', 'js');
        this.addTable(sys_script_include);

        //==== UI Page ========
        let ui_page = new TableConfig('sys_ui_page');
        ui_page.setDisplayField('name');
        ui_page.addField('html', 'HTML', 'xml');
        ui_page.addField('client_script', 'Client Script', 'js');
        ui_page.addField('processing_script', 'Processing Script', 'js');
        this.addTable(ui_page);

        //==== UI Script ========
        let sys_ui_script = new TableConfig('sys_ui_script');
        sys_ui_script.setDisplayField('name');
        sys_ui_script.addField('script', 'Script', 'js');
        this.addTable(sys_ui_script);

        //==== UI Action ========
        let sys_ui_action = new TableConfig('sys_ui_action');
        sys_ui_action.setDisplayField('name');
        sys_ui_action.addDisplayField('table');
        sys_ui_action.addDisplayField('sys_id');
        sys_ui_action.addField('script', 'Script', 'js');
        this.addTable(sys_ui_action);

        //==== Client Script =======
        let sys_script_client = new TableConfig('sys_script_client');
        sys_script_client.setDisplayField('name');
        sys_script_client.addDisplayField('table');
        sys_script_client.addDisplayField('type');
        sys_script_client.addField('script', 'Script', 'js');
        this.addTable(sys_script_client);
        
        //==== Scripted REST Resource =======
        let sys_ws_operation = new TableConfig('sys_ws_operation');
        sys_ws_operation.setDisplayField('name');
        sys_ws_operation.addDisplayField('http_method');
        sys_ws_operation.addField('operation_script', 'Script', 'js');
        this.addTable(sys_ws_operation);

        //==== Fix Scripts =======
        let sys_fix_script = new TableConfig('sys_fix_script');
        sys_fix_script.setDisplayField('name');
        sys_fix_script.addField('script', 'Script', 'js');
        this.addTable(sys_fix_script);

        //==== Scheduled Jobs =======
        let sysauto_script = new TableConfig('sysauto_script');
        sysauto_script.setDisplayField('name');
        sysauto_script.addField('script', 'Run this script', 'js');
        this.addTable(sysauto_script);

        //==== Record Producer =======
        let sys_cat_item_producer = new TableConfig('sysauto_script');
        sys_cat_item_producer.setDisplayField('name');
        sys_cat_item_producer.addField('script', 'Script', 'js');
        this.addTable(sys_cat_item_producer);
        
        //==== MID Server Script Include =======
        let ecc_agent_script_include = new TableConfig('sysauto_script');
        ecc_agent_script_include.setDisplayField('name');
        ecc_agent_script_include.addField('script', 'Script', 'js');
        this.addTable(ecc_agent_script_include);

        //==== UI Macros =======
        //This one's for your @JohnAndersen :)
        let sys_ui_macro = new TableConfig('sys_ui_macro');
        sys_ui_macro.setDisplayField('name');
        sys_ui_macro.addField('xml', 'Xml', 'xml');
        this.addTable(sys_ui_macro);
        
    }
    
}

export class TableConfig{
    name:string = "";
    label:string = "";
    display_field:string = "name";
    fields:Array<snTableField> = [];
    children:Array<TableConfig> = [];
    additional_display_fields:Array<string> = [];
    
    constructor(name:string){
        this.name = name;
    }
    
    setLabel(label:string){
        this.label = label;
    }
    
    setDisplayField(fieldName:string){
        this.display_field = fieldName;
    }

    addDisplayField(fieldName:string){
        if(!fieldName){
            //do nothing
            return;
        }

        var fieldFound = false;
        this.additional_display_fields.forEach((displayField) =>{
            if(displayField === fieldName){
                fieldFound = true;
            }
        });
        
        if(!fieldFound){
            this.additional_display_fields.push(fieldName);
        }
    }

    setAdditionalDisplayFields(fieldNames:Array<string>){
        this.additional_display_fields = fieldNames;
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

    //will get display value based on record passed in.
    getDisplayValue(record:any){
        var dv = record[this.display_field] || "";
        
        if(this.additional_display_fields && this.additional_display_fields.length && this.additional_display_fields.length > 0){

            let settings = vscode.workspace.getConfiguration();
            let multiFieldNameSep = settings.get('snich.syncedRecordNameSeparator') || "^";
            this.additional_display_fields.forEach((fieldName) =>{
                dv += multiFieldNameSep + record[fieldName];
            });
        }
        return dv;
    }

    setFromConfigFile(table:any){
        this.setLabel(table.label);
        this.setDisplayField(table.display_field);
        this.setAdditionalDisplayFields(table.additional_display_fields);
        this.fields = table.fields;
        this.children = table.children;
    }
}
