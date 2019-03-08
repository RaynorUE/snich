// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InstancesList, InstanceMaster } from './classes/InstanceConfigManager';
import { SystemLogHelper } from './classes/LogHelper';
import { RESTClient } from './classes/RESTClient';
import { SNFilePuller } from './classes/SNRecordPuller';
import { WorkspaceManager } from './classes/WorkspaceManager';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let lib = 'extension.ts';
	let func = 'activate';
	let logger:SystemLogHelper = new SystemLogHelper();
    logger.info(lib, func, 'START');
    
    let instanceList = new InstancesList();
    let wsManager = new WorkspaceManager(logger);

    if(!wsManager.workspaceValid(logger, lib)){
        deactivate();
        return false;
    }

    //load observers for our workspace.
    wsManager.loadObservers();
    wsManager.loadWorkspaceInstances(instanceList);

    
    /**
     * Setup New Instance
     */
	vscode.commands.registerCommand('snich.setup.new_instance', async () =>{
        let logger = new SystemLogHelper();
        let func = 'setup.new_instance';
        logger.info(lib, func, 'START');
        await instanceList.setupNew();
        logger.info(lib, func, 'END');

    });
    
    /**
     * Test Instance Connection
     */
	vscode.commands.registerCommand('snich.setup.test_connection', async () =>{
        let logger = new SystemLogHelper();
        let func = 'setup.test_connection';
        logger.info(lib, func, 'START');

        if(!instanceList.atLeastOneConfigured()){
            return;
        }

        let selectedInstance = await instanceList.selectInstance();
        if(selectedInstance){
            let client = new RESTClient(selectedInstance.getConfig(), logger);
            await client.testConnection();
        }
        logger.info(lib, func, 'END', instanceList);
	});
    
    vscode.commands.registerCommand('snich.instance.setup.new_table', async () => {
        let logger = new SystemLogHelper();
        let func = 'snich.instance.setup.new_table';
        logger.info(lib, func, 'START');

        if(!instanceList.atLeastOneConfigured()){
            return;
        }
        let selectedInstance:InstanceMaster = await instanceList.selectInstance();
        if(!selectedInstance){
            vscode.window.showWarningMessage('Table Configuration Aborted.');
            return undefined;
        }
        await selectedInstance.tableConfig.syncNew(selectedInstance);
        logger.info(lib, func, 'END', instanceList);
        
        
	});
    
	vscode.commands.registerCommand('snich.application.load.all', async () => {
        let func = 'application.load.all';
        logger.info(lib, func, 'START', );
        if(!instanceList.atLeastOneConfigured()){
            return;
        }
        let fp = new SNFilePuller(instanceList, logger);
        await fp.pullAllAppFiles();

        logger.info(lib, func, 'END', instanceList);
	});
    
	vscode.commands.registerCommand('snich.application.load.new', () => {
        
	});
    
	vscode.commands.registerCommand('snich.instance.pull_record', async (folder) =>{
		let logger = new SystemLogHelper();
		let func = 'instance.pull_record';
        logger.info(lib, func, 'START', );
        if(!instanceList.atLeastOneConfigured()){
            return;
        }
		let filePuller = new SNFilePuller(instanceList, logger);
		
        await filePuller.syncRecord();
        logger.info(lib, func, 'START', instanceList);

	});
    
	vscode.commands.registerCommand('snich.folder.application.load.new', () =>{
		//if we can't do this from the application load new call
	});

    
    //** INSTANCE REMOVAL WATCHER!! */
    let fsWatcher = vscode.workspace.createFileSystemWatcher('**/*/');
    fsWatcher.onDidDelete((uri) =>{
        let func = 'InstanceDeleteWatcher';
        logger.info(lib, func, 'File deleted:', uri);
        let instanceLocation = -1;
        instanceList.getInstances().forEach((instance, index) =>{
            logger.debug(lib, func, "Testing if instance matches.", {instanceListPath:instance.getConfig().rootPath, loadedFromFile:uri.fsPath});
            if(instance.getConfig().rootPath === uri.fsPath){
                logger.info(lib, func, `Found instance in instance list at position ${index}`);
                instanceLocation = index;
            }
        });
        
        if(instanceLocation > -1){
            instanceList.getInstances().splice(instanceLocation, 1);
            logger.info(lib, func, "Removed instance from instanceList.", instanceList);
        }
    });
    
    logger.info(lib, func, "We have finished registering all commands. Extension fully activated!");
    logger.info(lib, func, "END");
}

// this method is called when your extension is deactivated
export function deactivate() {
    
}