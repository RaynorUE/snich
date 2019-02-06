// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InstanceManager } from './classes/instancemanager';
import { SystemLogHelper } from './classes/loghelper';
import { RESTClient } from './classes/restclient';
import { InstanceData } from './myTypes/globals';
import { WorkspaceManager } from './classes/workspaceManager';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let lib = 'extension.ts';
	let func = 'activate';
	let logger:SystemLogHelper = new SystemLogHelper();
    logger.info(lib, func, 'START');
    let instanceList:Array<InstanceData> = [];
    
    var wsFolders = vscode.workspace.workspaceFolders || [];
    logger.info(lib, func, 'Going hunting for SN Instances! Workspace Folders', wsFolders);
    if(wsFolders.length === 0){
        vscode.window.showErrorMessage('No workspace folder loaded. Please open a folder for this workspace. This is where all SN instance folders will be created.');
        deactivate();
        return;
    }

    let wsManager = new WorkspaceManager(logger);

    if(wsFolders.length > 0){
        instanceList = wsManager.loadWorkspaceInstances(wsFolders);
    }

	vscode.commands.registerCommand('yansasync.do_nothing', (item1, item2) =>{
		let func = 'openTextDocument';
		logger.info(lib, func, 'START', );
			vscode.workspace.openTextDocument();
			vscode.workspace.openTextDocument({content:'hello world'}).then((doc) => {
				//var location = vscode.window.activeTextEditor !== undefined ? vscode.window.activeTextEditor + 1 || 0;
				vscode.window.showTextDocument(doc, 0, true);
			});
		logger.info(lib, func, 'END');
	});
	/**
	 * ============ COMMAND PALETE ACTIONS ==================
	 */

	 //Global Commands
	 vscode.commands.registerCommand('yansasync.setup.new_instance', () =>{
        let logger = new SystemLogHelper();
        let func = 'setup.new_instance';
        logger.info(lib, func, 'START', );
        let instanceMgr = new InstanceManager(instanceList,logger);
        instanceMgr.setup().then((instanceData) =>{
            if(instanceData){
                instanceList.push(instanceData);
            }
        });
        logger.info(lib, func, 'END');

	 });

	
	//vscode.commands.registerCommand('yansasync.setup.new_instance', (initSetup.configureBase));

	vscode.commands.registerCommand('yansasync.setup.test_connection', (folder) =>{
        logger.info('Activate', 'test_connection', 'START');
        if(!folder && instanceList.length === 0){
            vscode.window.showErrorMessage("Unable to test connection, no instance specified or no instances available in workspace.");
        }
        if(!folder){
            var qpItems:Array<vscode.QuickPickItem> = [];
            instanceList.forEach((instanceData) => {
                qpItems.push({"label":instanceData.name, "detail":"Instance URL: " + instanceData.connection.url});
            });
            vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{"placeHolder":"Select instance to test connection"}).then((selected) =>{
                if(selected){
                    instanceList.forEach((instance) => {
                        if(instance.name === selected.label){
                            new RESTClient(instance).testConnection();
                        }
                    });
                }
            });
        }
		logger.info('Activate', 'test_connection', 'END');
	});

	//instance specific commands
	vscode.commands.registerCommand('yansasync.instance.refresh_meta', () =>{
		//this command will crawl dictionary entries matching the various "development" criteria and store locally the fields/tables/etc. 
		//also executed on first instance setup.
	});

	vscode.commands.registerCommand('yansasync.instance.configure_authentication', () =>{
		//flow ...
		//Pick instance, pick auth type, if oAuth enter key and secret, then prompt ID and PW
		//if auth already exists, prompt to modify or reset if modify, take them through showing current saved values.
	});

	vscode.commands.registerCommand('yansasync.application.load.all', () => {

	});

	vscode.commands.registerCommand('yansasync.application.load.new', () => {

	});

	//Code folders Explorer Context Commands
	vscode.commands.registerCommand('yansasync.folder.sync_record', (folder) =>{
		let func = 'folder.sync_record';
		logger.info(lib, func, "selectedFolder is:", folder);
		if(folder){
			logger.info(lib, func, "Folder is:", folder);
			return;
		}

		if(!folder){
            let qpItems:Array<any> = [];
            instanceList.forEach((instanceData) => {
                qpItems.push({"label":instanceData.name, "detail":"Instance URL: " + instanceData.connection.url, value:instanceData });
            });
            vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{placeHolder:"Select instance to test connection", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true}).then((selected) =>{
				logger.info(lib, func, 'Selected:', selected);
				
				if(selected){
					let selectedInstance = selected.value;
                    instanceList.forEach((instance) => {
						if(instance.name === selected.label){
							logger.info(lib, func, "Selected instance:", instance);
							selectedInstance = instance;
						}
					});
					let client = new RESTClient(selectedInstance, logger);
					client.getRecords('sys_db_object', 'super_class.name=sys_metadata', ["sys_id","name","label","sys_scope"], true).then(function(tableRecs){
						logger.info(lib, func, "records returned:", tableRecs.length);
						let tableqpItems:Array<vscode.QuickPickItem> = [];
						if(tableRecs.length > 0){
							tableRecs.forEach((record:any) =>{
								tableqpItems.push({"label":record.label, "detail": record.name + ' - ' + record.sys_scope});
							});
							logger.info(lib, func, "Built quick pick options based on records returned.");
							vscode.window.showQuickPick(tableqpItems, <vscode.QuickPickOptions>{"placeHolder":"Select table to retrieve record from.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true}).then((selected) =>{
								tableRecs.forEach((tableRec:any) =>{
									if(selected && tableRec.label === selected.label){
										logger.info(lib, func, "Selected table:", tableRec);
										client.getRecords(tableRec.name, "", ["name","sys_id","sys_scope"], true).then((fileRecs) =>{
											logger.info(lib, func, "Got records from table query:", fileRecs.length);
											let fileqpItems:Array<vscode.QuickPickItem> = [];

											fileRecs.forEach((record:any) =>{
												fileqpItems.push({"label":record.name, "detail": record.name + ' - ' + record.sys_scope});
		
											});
											vscode.window.showQuickPick(fileqpItems, <vscode.QuickPickOptions>{"placeHolder":"Select table to retrieve record from.", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true}).then((selected) =>{
												if(selected){
													fileRecs.forEach((rec:any)=>{
														if(rec && rec.name === selected.label){
															client.getRecord(tableRec.name, rec.sys_id).then(function(rec:any){
																vscode.workspace.openTextDocument();
																vscode.workspace.openTextDocument({content:rec.script || "Script field not found",language:"javascript"}).then((doc) => {
																	//var location = vscode.window.activeTextEditor !== undefined ? vscode.window.activeTextEditor + 1 || 0;
																	vscode.window.showTextDocument(doc, 0, true);
																});
															});
														}
													});
												}
											});
										});
									}
								});
							});
						}
					});
                }
            });
        }
	});

	vscode.commands.registerCommand('yansasync.folder.application.load.new', () =>{
		//if we can't do this from the application load new call
	});
	vscode.commands.registerCommand('yansasync.folder.application.load.all', () =>{

	});
    
    
    /* === DO WE NEED TO DO THIS???? NOT SO FAR?? WHAT DOES IT ADD???
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {});
	context.subscriptions.push(disposable);
    */
    
    logger.info(lib, func, "We have finished registering all commands. Extension fully activated!");
    logger.info(lib, func, "END");
}

// this method is called when your extension is deactivated
export function deactivate() {}
