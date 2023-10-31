import { snTableField, SNQPItem, snRecord, snRecordDVAll } from "../myTypes/globals";
import { InstanceMaster } from "./InstanceConfigManager";
import { RESTClient } from "./RESTClient";
import * as vscode from "vscode";
import { SystemLogHelper } from "./LogHelper";
import { WorkspaceManager } from "./WorkspaceManager";


export class ConfiguredTables {
    version: number = 2;
    tables: Array<TableConfig> = [];
    tableNameList: Array<string> = [];
    private table_upgraded: boolean = false;
    private logger: SystemLogHelper;
    private lib: string = 'SyncedTableManager';

    constructor(tableData?: ConfiguredTables, logger?: SystemLogHelper) {
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START');

        if (tableData) {
            this.setFromConfigFile(tableData);
        } else {
            this.setupCommon();
            this.upgradeV1toV2();
        }

        this.logger.info(this.lib, func, 'END');
    }

    /**
    * Configure a new Table to be synced for a given instance.
    * @return Returns modified instance that was selected. 
    */
    async syncNew(selectedInstance: InstanceMaster) {
        let func = 'syncNew';
        this.logger.info(this.lib, func, 'START');
        let client = <RESTClient>{};


        //query instance for tables extending sys_metadata
        client = new RESTClient(selectedInstance);
        let encodedQuery = 'super_class.nameINSTANCEOFsys_metadata';
        let tableRecs = await client.getRecords<snRecord>('sys_db_object', encodedQuery, ['name', 'label']);
        if (tableRecs.length === 0) {
            vscode.window.showWarningMessage('Attempted to get tables from instance, but no tables extending sys_metadata were found. See logs for details.');
            return undefined;
        }

        //have them select a table..
        let tableQPItems: SNQPItem[] = [];
        tableRecs.forEach((table: snRecord) => {
            let label = table.label;
            if (selectedInstance.tableConfig.tableNameList.indexOf(table.name) > -1) {
                label = table.label + ' |=> Table Config Exists. Continuing Will Overwrite Existing Configuration.';
            }
            tableQPItems.push({ "label": label, "detail": table.name + ' - ' + table.sys_scope, value: table });
        });

        let selectedTable = await vscode.window.showQuickPick(tableQPItems, { placeHolder: "Select a table to configure for syncing", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
        if (!selectedTable) {
            vscode.window.showWarningMessage('No table selectd. Aborting new table config.');
            return false;
        }

        let tableConfig = new TableConfig(selectedTable.value.name);
        tableConfig.setLabel(selectedTable.value.label);
        let dicRecs = await this.getTableFields(tableConfig.name, client);

        if (!dicRecs.length) {
            vscode.window.showWarningMessage(`Attempted to get dictionary entries for table [${tableConfig.name}] and none were found! Aborting table configuration.`);
            return;
        }

        this.logger.info(this.lib, func, "Dictionary records received. Building QPItems");
        let dicQPItems = <Array<SNQPItem>>[];
        let missingNameField = true;
        let primaryDisplayField = 'name';
        dicRecs.forEach((dic: snRecord) => {
            if (dic.element === 'name') {
                missingNameField = false;
            }
            dicQPItems.push({ "label": dic.column_label || "", "detail": dic.element + ' - ' + dic.internal_type, value: dic });
        });


        let settings = vscode.workspace.getConfiguration();
        let multiFieldNameSep = settings.get('snich.syncedRecordNameSeparator') || "^";
        let alwaysAskPrimField = settings.get('snich.alwaysAskPrimaryDisplayField') || false;
        let selectedPrimeDisplayField: SNQPItem | undefined = dicQPItems.filter((item) => item.value.element == primaryDisplayField)[0];

        if (alwaysAskPrimField || missingNameField) {
            selectedPrimeDisplayField = await vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{ placeHolder: "Select field to use for file name.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
            if (!selectedPrimeDisplayField) {
                vscode.window.showWarningMessage('No Field selected as primary for file name generation. Aborting Table configuration');
                return;
            }

            primaryDisplayField = selectedPrimeDisplayField.value.element;
        }

        tableConfig.setDisplayField(primaryDisplayField);

        let selectedAdditionalDisplayFields = await this.pickField(
            "Select a Field for file name generation. Will use seperator in settings (currently: " + multiFieldNameSep + ")",
            "Would you like to select additional fields for File Name generation",
            dicQPItems,
            [selectedPrimeDisplayField],
            false,
            true
        );
        let groupByfields = await this.pickField(
            "Select a Field to group these records by. Will create subfolders, in order, based on selections.",
            "Would you like to selection additional fields to group the files into sub folders",
            dicQPItems,
            [],
            false,
            true
        );
        let selectedSyncFields = await this.pickField(
            "Select a Field of data you want to sync.",
            "Would you like to sync additional fields of data",
            dicQPItems,
            [],
            true,
            true
        );


        if (selectedAdditionalDisplayFields && selectedAdditionalDisplayFields.length > 0) {
            selectedAdditionalDisplayFields.forEach((selectedOption: SNQPItem) => {
                if (selectedOption.value.element != primaryDisplayField) {
                    let selectedField = selectedOption.value;
                    tableConfig.addDisplayField(selectedField.element);
                }
            });
        }

        if (!selectedSyncFields || selectedSyncFields.length === 0) {
            vscode.window.showWarningMessage('No data fields to syncselected. Aborting Table configuration');
            return;
        }

        if (groupByfields && groupByfields.length > 0) {
            groupByfields.forEach((selectedItem) => {
                tableConfig.addGroupBy(selectedItem.value.element);
            })
        }

        this.logger.info(this.lib, func, "Selected fields:", selectedSyncFields);
        if (selectedSyncFields.length > 0) {
            let extensionAsker = async (selectedPosition: number) => {
                let func = 'extensionAsker';

                this.logger.info(this.lib, func, 'START', { position: selectedPosition, fieldsLength: selectedSyncFields.length });

                return new Promise((resolve, reject) => {
                    if (selectedPosition < selectedSyncFields.length) {
                        let selectedField = selectedSyncFields[selectedPosition].value;

                        this.logger.debug(this.lib, func, "Selected Field:", selectedField);

                        return vscode.window.showInputBox(<vscode.InputBoxOptions>{ placeHolder: "Suggestions: js, html, css, txt", prompt: "Enter the file extension for Field [Type]: " + selectedField.column_label + ' [' + selectedField.internal_type + ']', ignoreFocusOut: true }).then((extension) => {
                            if (extension) {
                                extension = extension.replace(/^\./g, ''); //replace if it starts with a . (since we are adding that)
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
        vscode.window.showInformationMessage('Table added to configuration.', 'Sync New Record').then((choice) => {
            if (choice === "Sync New Record") {
                vscode.commands.executeCommand('snich.instance.pull_record');
            }
        });
        this.logger.info(this.lib, func, 'END');
    }

    async pickField(placeHolder: string, selectionAddPlaceHolder: string, dicQPItems: SNQPItem[], pickedItems?: SNQPItem[], firstPick = false, canPickMany = false): Promise<SNQPItem[]> {
        let func = 'pickField';
        this.logger.info(this.lib, func, 'START');

        if (!pickedItems) {
            pickedItems = [];
        }

        let pickMoreFields;

        if (firstPick) {
            pickMoreFields = true;
        } else if (canPickMany) {
            let yesNo: SNQPItem[] = [{ label: "Yes", value: true, alwaysShow: true }, { label: "No", value: false, alwaysShow: true }]
            var fieldsSoFar = pickedItems.map((item) => {
                return item.value.element;
            })
            let pickMoreFieldsAnswer = await vscode.window.showQuickPick(yesNo, <vscode.QuickPickOptions>{ placeHolder: `${selectionAddPlaceHolder}? Selected so far: [${fieldsSoFar.length > 0 ? fieldsSoFar.join(', ') : "NONE"}]`, ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
            if (pickMoreFieldsAnswer) {
                pickMoreFields = pickMoreFieldsAnswer.value;
            }
        }

        if (pickMoreFields) {
            let newItem = await vscode.window.showQuickPick(dicQPItems, <vscode.QuickPickOptions>{ placeHolder: `${placeHolder}`, ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
            if (newItem) {
                pickedItems.push(newItem);
            }
            return await this.pickField(placeHolder, selectionAddPlaceHolder, dicQPItems, pickedItems, false, canPickMany);
        }

        this.logger.info(this.lib, func, 'END');
        return pickedItems;



    }

    async getTableFields(tableName: String, RESTClient: RESTClient) {
        let func = 'getTableFields';
        this.logger.info(this.lib, func, 'START');

        let tableFields: Array<any> = [];
        /**
         * @todo Need to solve this dependency on PAUtils() at some point. Not a fan of it... As not everyone has PA turned on (Depending on age of installation)
         */
        let includeParents = "javascript:new PAUtils().getTableAncestors('" + tableName + "')";
        let dicQuery = 'name=' + includeParents + '^elementISNOTEMPTY^ORDERBYlabel';
        var dicRecs = await RESTClient.getRecords('sys_dictionary', dicQuery, ['column_label', 'element', 'name', 'internal_type']);

        if (dicRecs.length === 0) {
            return tableFields;
        }

        this.logger.info(this.lib, func, 'END');
        return dicRecs;

    }

    getTable(tableName: String): TableConfig {
        var selectedTable = new TableConfig('');
        this.tables.forEach((table) => {
            if (table.name === tableName) {
                selectedTable = table;
            }
        });

        return selectedTable;
    }

    addTable(table: TableConfig) {
        this.tableNameList.push(table.name);
        let existingIndex = -1;
        this.tables.forEach((existingTable, index) => {
            if (existingTable.name === table.name) {
                existingIndex = index;
            }
        });
        if (existingIndex > -1) {
            this.tables[existingIndex] = table;
        } else {
            this.tables.push(table);
        }

    }

    setFromConfigFile(tableData: ConfiguredTables) {
        this.tables = []; //clear it and use only what is in config file.
        const oldVer = tableData.version || 0;

        tableData.tables.forEach((table) => {
            const config = new TableConfig(table.name);
            config.setFromConfigFile(table);
            this.tables.push(config);
        });

        this.tableNameList = tableData.tableNameList;

        if (oldVer < 2) {
            this.upgradeV1toV2();
            this.table_upgraded = true;
        }
    }

    setupCommon() {
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
        sp_widget.addField('script', 'Server script', 'js');
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
        let sys_script_fix = new TableConfig('sys_script_fix');
        sys_script_fix.setDisplayField('name');
        sys_script_fix.addField('script', 'Script', 'js');
        this.addTable(sys_script_fix);

        //==== Scheduled Jobs =======
        let sysauto_script = new TableConfig('sysauto_script');
        sysauto_script.setDisplayField('name');
        sysauto_script.addField('script', 'Run this script', 'js');
        this.addTable(sysauto_script);

        //==== Record Producer =======
        let sys_cat_item_producer = new TableConfig('sc_cat_item_producer');
        sys_cat_item_producer.setDisplayField('name');
        sys_cat_item_producer.addField('script', 'Script', 'js');
        this.addTable(sys_cat_item_producer);

        //==== MID Server Script Include =======
        let ecc_agent_script_include = new TableConfig('ecc_agent_script_include');
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

    upgradeV1toV2() {
        this.getTable('sys_script')?.setGroupBy(['collection', 'when', 'order']);
        this.getTable('sp_angular_provider')?.setGroupBy(['type']);
        var uiActionTable = this.getTable('sys_ui_action');
        uiActionTable?.setGroupBy(['table']);
        uiActionTable?.setAdditionalDisplayFields([]);
        this.getTable('sys_script_client')?.setGroupBy(['table']);
        this.getTable('sys_ws_operation')?.setGroupBy(['web_service_definition', 'http_method']);
        this.getTable('sc_cat_item_producer')?.setGroupBy(['table_name']);
    }

    upgraded() { return this.table_upgraded }

}

export class TableConfig {
    name: string = "";
    label: string = "";
    display_field: string = "name";
    fields: Array<snTableField> = [];
    children: Array<TableConfig> = [];
    additional_display_fields: Array<string> = [];
    group_by: string[] = [];

    constructor(name: string) {
        this.name = name;
    }

    setLabel(label: string) {
        this.label = label;
    }

    setDisplayField(fieldName: string) {
        this.display_field = fieldName;
    }

    setGroupBy(fieldList: string[]) {
        this.group_by = fieldList;
    }

    addGroupBy(fieldName: string) {
        this.group_by.push(fieldName);
    }

    getGroupBy() {
        return this.group_by;
    }

    addDisplayField(fieldName: string) {
        if (!fieldName) {
            //do nothing
            return;
        }

        var fieldFound = false;
        this.additional_display_fields.forEach((displayField) => {
            if (displayField === fieldName) {
                fieldFound = true;
            }
        });

        if (!fieldFound) {
            this.additional_display_fields.push(fieldName);
        }
    }

    setAdditionalDisplayFields(fieldNames: string[]) {
        this.additional_display_fields = fieldNames;
    }

    addField(name: string, label: string, extension: string) {
        this.fields.push(<snTableField>{
            table: this.name,
            name: name,
            label: label,
            extention: extension
        });
    }

    addChildTable(tableConfig: TableConfig) {
        this.children.push(tableConfig);
    }

    //will get display value based on record passed in.
    getDisplayValue(record: snRecordDVAll) {
        var dv = record[this.display_field].display_value || "";

        if (this.additional_display_fields && this.additional_display_fields.length && this.additional_display_fields.length > 0) {

            let settings = vscode.workspace.getConfiguration();
            let multiFieldNameSep = settings.get('snich.syncedRecordNameSeparator') || "^";
            this.additional_display_fields.forEach((fieldName) => {
                dv += multiFieldNameSep + record[fieldName].display_value;
            });
        }
        return dv;
    }

    setFromConfigFile(table: any) {
        this.setLabel(table.label);
        this.setDisplayField(table.display_field);
        this.setAdditionalDisplayFields(table.additional_display_fields);
        this.group_by = table.group_by;
        this.fields = table.fields;
        this.children = table.children;
    }
}
