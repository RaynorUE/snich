// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InstanceConfigManager, InstanceMaster } from './classes/InstanceConfigManager';
import { SystemLogHelper } from './classes/LogHelper';
import { RESTClient } from './classes/RESTClient';
import { WorkspaceManager } from './classes/WorkspaceManager';
import { SNFilePuller } from './classes/SNRecordPuller';
import { SyncedTableManager } from './classes/SNDefaultTables';
import { SNQPItem } from './myTypes/globals';

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
    
	vscode.commands.registerCommand('snich.setup.new_instance', () =>{
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
    
	vscode.commands.registerCommand('snich.setup.test_connection', () =>{
        logger.info('Activate', 'test_connection', 'START');
        if(!anyInstancesLoaded(instanceList, logger, lib)){
            return;
        }
        var qpItems:Array<SNQPItem> = [];
        instanceList.forEach((instance) => {
            if(instance.lastSelected){
                qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
            }
        });
        instanceList.forEach((instance) => {
            if(instance.lastSelected == false){
                qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
            }
        });
        vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{"placeHolder":"Select instance to test connection"}).then((selected) =>{
            if(selected){ 
                new RESTClient(selected.value.config).testConnection();

                let updatedInstance = <InstanceMaster>selected.value;
                instanceList.forEach((instance, index) =>{
                    instanceList[index].lastSelected = false;
                    if(instance.config.name === updatedInstance.config.name){
                        updatedInstance.lastSelected = true;
                        instanceList[index] = updatedInstance;
                    }
                });
            }
        });

        logger.info('Activate', 'test_connection', 'END');
	});
    
    vscode.commands.registerCommand('snich.instance.setup.new_table', () => {
        let logger = new SystemLogHelper();
        let func = 'snich.instance.setup.new_table';
        logger.info(lib, func, 'START');
        
        let tableMgr = new SyncedTableManager(instanceList, logger);
        tableMgr.syncNew().then((result) =>{
            logger.info(lib, func, 'Result from new setup:', result);
            if(result){
                let updatedInstance = <InstanceMaster>result;
                instanceList.forEach((instance, index) =>{
                    instanceList[index].lastSelected = false;
                    if(instance.config.name === updatedInstance.config.name){
                        updatedInstance.lastSelected = true;
                        instanceList[index] = updatedInstance;
                    }
                });
            }
            logger.info(lib, func, 'END');
        });
        
        
	});
    
	vscode.commands.registerCommand('snich.application.load.all', () => {
        new SNFilePuller(instanceList).pullAllAppFiles().then((result) =>{
            if(result){
                let updatedInstance = <InstanceMaster>result;
                instanceList.forEach((instance, index) =>{
                    instanceList[index].lastSelected = false;
                    if(instance.config.name === updatedInstance.config.name){
                        updatedInstance.lastSelected = true;
                        instanceList[index] = updatedInstance;
                    }
                });
            }
        });
	});
    
	vscode.commands.registerCommand('snich.application.load.new', () => {
        
	});
    
	vscode.commands.registerCommand('snich.instance.pull_record', (folder) =>{
		let logger = new SystemLogHelper();
		let func = 'instance.pull_record';
        logger.info(lib, func, 'START', );
        if(!anyInstancesLoaded(instanceList, logger, lib)){
            return;
        }
		let filePuller = new SNFilePuller(instanceList, logger);
		
		filePuller.pullRecord().then((result) =>{
            if(result){
                let updatedInstance = <InstanceMaster>result;
                instanceList.forEach((instance, index) =>{
                    instanceList[index].lastSelected = false;
                    if(instance.config.name === updatedInstance.config.name){
                        updatedInstance.lastSelected = true;
                        instanceList[index] = updatedInstance;
                    }
                });
            }
		});
	});
    
	vscode.commands.registerCommand('snich.folder.application.load.new', () =>{
		//if we can't do this from the application load new call
	});
	vscode.commands.registerCommand('snich.folder.application.load.all', () =>{
        
    });
    
    //** INSTANCE REMOVAL WATCHER!! */
    let fsWatcher = vscode.workspace.createFileSystemWatcher('**/*/');
    fsWatcher.onDidDelete((uri) =>{
        let func = 'InstanceDeleteWatcher';
        logger.info(lib, func, 'File deleted:', uri);
        let instanceLocation = -1;
        instanceList.forEach((instance, index) =>{
            logger.debug(lib, func, "Testing if instance matches.", {instanceListPath:instance.config.rootPath, loadedFromFile:uri.fsPath});
            if(instance.config.rootPath === uri.fsPath){
                logger.info(lib, func, `Found instance in instance list at position ${index}`);
                instanceLocation = index;
            }
        });
        
        if(instanceLocation > -1){
            instanceList.splice(instanceLocation, 1);
            logger.info(lib, func, "Removed instance from instanceList.", instanceList);
        }
    });
    
    logger.info(lib, func, "We have finished registering all commands. Extension fully activated!");
    logger.info(lib, func, "END");
}

// this method is called when your extension is deactivated
export function deactivate() {
    
}


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

function anyInstancesLoaded(instanceList:Array<InstanceMaster>, logger:SystemLogHelper, lib:string){
    if(instanceList.length === 0){
        vscode.window.showErrorMessage('No instances configured. Please execute Setup New Instance command.');
        return false;
    } else {
        return true;
    }
}