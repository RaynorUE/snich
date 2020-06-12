// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InstancesList, InstanceMaster } from './classes/InstanceConfigManager';
import { SystemLogHelper } from './classes/LogHelper';
import { RESTClient } from './classes/RESTClient';
import { SNFilePuller } from './classes/SNRecordPuller';
import { WorkspaceManager } from './classes/WorkspaceManager';
import { TSDefinitionGenerator } from './classes/TSDefinitionGeneator';

export const snichOutput = vscode.window.createOutputChannel('S.N.I.C.H.');


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
    wsManager.loadObservers(instanceList);
    wsManager.loadWorkspaceInstances(instanceList);
    new TSDefinitionGenerator().loadSNTypeDefinitions(context);

    //check current log setting and option to reset...

    (async function(logger){
        if(logger.inChattyMode()){
            let settings = vscode.workspace.getConfiguration();
            var level = settings.get('snich.logLevel') || 0;
            vscode.window.showWarningMessage('S.N.I.C.H Log level currently set to [' + level + '] recommended level is [Error]');
        }
    }(logger));

    
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
            let client = new RESTClient(selectedInstance, logger);
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

        setTimeout(function(){
            //faking it for now. Need to fix "async function in tableData for loop..."
            snichOutput.appendLine('All application files have been loaded. You may need to refresh your workspace file/folder list.');
        }, 4000);

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
        logger.info(lib, func, 'END', instanceList);

	});
    
	vscode.commands.registerCommand('snich.activeEditor.compare_with_server', () =>{
        let logger = new SystemLogHelper();
        let func = 'activeEditor.compare_with_server';
        let wsManager = new WorkspaceManager(logger);
        logger.info(lib, func, 'START');
        wsManager.compareActiveEditor(instanceList).then(() => {logger.info(lib, func, `END`);});
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

    let instancesForMessage = instanceList.getInstances();
    let instanceNamesForMessage = '';
    for(var i = 0; i < instancesForMessage.length; i++){
        let instance = instancesForMessage[i];
        instanceNamesForMessage += instance.getName() + ', ';
    }
    instanceNamesForMessage = instanceNamesForMessage.replace(/, $/, ''); //replace trailing comma.

    vscode.window.showInformationMessage('S.N.I.C.H has been activated with the following ServiceNow Instances:\n' + instanceNamesForMessage);
    logger.info(lib, func, "END");
}

// this method is called when your extension is deactivated
export function deactivate() {
    
}