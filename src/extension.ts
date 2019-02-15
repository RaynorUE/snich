// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InstanceConfigManager, InstanceMaster } from './classes/InstanceConfigManager';
import { SystemLogHelper } from './classes/LogHelper';
import { RESTClient } from './classes/RESTClient';
import { WorkspaceManager } from './classes/WorkspaceManager';
import { SNFilePuller } from './classes/SNRecordPuller';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let lib = 'extension.ts';
	let func = 'activate';
	let logger:SystemLogHelper = new SystemLogHelper();
    logger.info(lib, func, 'START');
    
    let instanceList:Array<InstanceMaster> = [];

    if(!workspaceValid(logger, lib)){
        deactivate();
        return false;
    }

    let wsManager = new WorkspaceManager(logger);
    let wsFolders = vscode.workspace.workspaceFolders || [];
    if(wsFolders.length > 0){
        instanceList = wsManager.loadWorkspaceInstances(wsFolders);
        wsManager.loadObservers();
    }

	vscode.commands.registerCommand('now-coder.setup.new_instance', () =>{
        let logger = new SystemLogHelper();
        let func = 'setup.new_instance';
        logger.info(lib, func, 'START', );
        let instanceMgr = new InstanceConfigManager(undefined,logger);
        instanceMgr.setupNew(instanceList).then((instanceMaster) =>{
            if(instanceMaster && instanceMaster.setupComplete){
                instanceList.push(instanceMaster);
			}
			logger.info(lib, func, 'END');
        });
	 });

	vscode.commands.registerCommand('now-coder.setup.test_connection', (folder) =>{
        logger.info('Activate', 'test_connection', 'START');
        if(!folder && instanceList.length === 0){
            vscode.window.showErrorMessage("Unable to test connection, no instance specified or no instances available in workspace.");
        }
        if(!folder){
            var qpItems:Array<vscode.QuickPickItem> = [];
            instanceList.forEach((instanceData) => {
                qpItems.push({"label":instanceData.config.name, "detail":"Instance URL: " + instanceData.config.connection.url});
            });
            vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{"placeHolder":"Select instance to test connection"}).then((selected) =>{
                if(selected){
                    instanceList.forEach((instance) => {
                        if(instance.config.name === selected.label){
                            new RESTClient(instance.config).testConnection();
                        }
                    });
                }
            });
        }
		logger.info('Activate', 'test_connection', 'END');
	});

	//instance specific commands
	vscode.commands.registerCommand('now-coder.instance.refresh_meta', () =>{
		//this command will crawl dictionary entries matching the various "development" criteria and store locally the fields/tables/etc. 
		//also executed on first instance setup.
	});

	vscode.commands.registerCommand('now-coder.instance.configure_authentication', () =>{
		//flow ...
		//Pick instance, pick auth type, if oAuth enter key and secret, then prompt ID and PW
		//if auth already exists, prompt to modify or reset if modify, take them through showing current saved values.
	});

	vscode.commands.registerCommand('now-coder.application.load.all', () => {

	});

	vscode.commands.registerCommand('now-coder.application.load.new', () => {

	});

	vscode.commands.registerCommand('now-coder.instance.pull_record', (folder) =>{
		let logger = new SystemLogHelper();
		let func = 'instance.pull_record';
		logger.info(lib, func, 'START', );
		let filePuller = new SNFilePuller(instanceList, logger);
		
		filePuller.pullRecord().then((result) =>{
			logger.info(lib, func, 'END', result);
		});
	});

	vscode.commands.registerCommand('now-coder.folder.application.load.new', () =>{
		//if we can't do this from the application load new call
	});
	vscode.commands.registerCommand('now-coder.folder.application.load.all', () =>{

	});
    
    logger.info(lib, func, "We have finished registering all commands. Extension fully activated!");
    logger.info(lib, func, "END");
}

// this method is called when your extension is deactivated
export function deactivate() {}



function workspaceValid(logger:SystemLogHelper, lib:string) {
    let wsFolders = vscode.workspace.workspaceFolders || [];
    let func = "workspaceValid";
    logger.info(lib, func, 'Going hunting for SN Instances! Workspace Folders', wsFolders);
    if(wsFolders.length === 0){
        vscode.window.showErrorMessage('No workspace folder loaded. Please open a folder for this workspace. This is where all SN instance folders will be created.');
        return false;
    } else if(wsFolders.length > 1){
		vscode.window.showErrorMessage('More than one workspace folder loaded. Unpredictable results may occur, de-activating extension. Please use just one workspace folder.');
        return false;
    }
    return true;
}