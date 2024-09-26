// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InstancesList, InstanceMaster } from './classes/InstanceConfigManager';
import { SystemLogHelper } from './classes/LogHelper';
import { RESTClient } from './classes/RESTClient';
import { SNFilePuller } from './classes/SNRecordPuller';
import { WorkspaceManager } from './classes/WorkspaceManager';
import { TSDefinitionGenerator } from './classes/TSDefinitionGeneator';
import * as xml2js from 'xml2js';
import { SNQPItem } from './myTypes/globals';
import { WebBrowser } from './classes/WebBrowser';
import { ExtensionMgmt } from './classes/ExtensionMgmt';
import { ExceptionFileOpener } from './classes/ExceptionFileOpener';
import { URIHandlerCore } from './classes/URIHandler/URIHandlerCore';


export const snichOutput = vscode.window.createOutputChannel('S.N.I.C.H.');


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let lib = 'extension.ts';
    let func = 'activate';
    let logger: SystemLogHelper = new SystemLogHelper();
    logger.info(lib, func, 'START');

    let instanceList = new InstancesList();
    let wsManager = new WorkspaceManager(logger);

    if (!wsManager.workspaceValid(logger, lib)) {
        deactivate();
        return false;
    }

    //see if we've upgraded!

    new ExtensionMgmt(context).handleUpgrade();

    //load observers for our workspace.
    wsManager.loadObservers(instanceList);
    wsManager.loadWorkspaceInstances(instanceList);

    /**
     * @todo this is being a bit cloberry... I think this "Activate" function is being ran everytime an action is called..? hrrm...
     */
    new TSDefinitionGenerator().loadSNTypeDefinitions(context);

    //check current log setting and option to reset...

    (async function (logger) {
        if (logger.inChattyMode()) {
            let settings = vscode.workspace.getConfiguration();
            var level = settings.get('snich.logLevel') || 0;
            vscode.window.showWarningMessage('S.N.I.C.H Log level currently set to [' + level + '] recommended level is [Error]');
        }
    }(logger));

    //set everything up... but we should be able to import
    var myURIHandler = new URIHandlerCore();
    context.subscriptions.push(vscode.window.registerUriHandler(myURIHandler));


    vscode.commands.registerCommand('snich.open_file_by.sn_file_path', async () => {
        new ExceptionFileOpener().openSNFilePath();
    });

    /**
     * Setup New Instance
     */
    vscode.commands.registerCommand('snich.setup.new_instance', async () => {
        let logger = new SystemLogHelper();
        let func = 'setup.new_instance';
        logger.info(lib, func, 'START');
        await instanceList.setupNew();
        logger.info(lib, func, 'END');

    });

    /**
     * Test Instance Connection
     */
    vscode.commands.registerCommand('snich.setup.test_connection', async () => {
        let logger = new SystemLogHelper();
        let func = 'setup.test_connection';
        logger.info(lib, func, 'START');

        if (!instanceList.atLeastOneConfigured()) {
            return;
        }

        let selectedInstance = await instanceList.selectInstance();
        if (selectedInstance) {
            let client = new RESTClient(selectedInstance, logger);
            await client.testConnection();
        }
        logger.info(lib, func, 'END', instanceList);
    });

    vscode.commands.registerCommand('snich.application.open_file.in.service_now', async () => {
        let logger = new SystemLogHelper();
        var func = 'application.open_file.in.service_now';
        logger.info(lib, func, 'START');
        let activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor) {
            vscode.window.showWarningMessage('No active editor. Unable to open in ServiceNow');
            return;
        }

        let fsPath = activeEditor.document.uri.fsPath;
        logger.debug(lib, func, 'fsPath:', fsPath);

        let instance = instanceList.getInstanceByFilePath(fsPath);
        if (!instance) {
            vscode.window.showWarningMessage('Does not look like file in active editor is a SNICH file. Unable to determine instance.');
            return;
        }

        let syncedFiles = instance.getSyncedFiles();
        let syncedFile = syncedFiles.getFileByPath(fsPath);
        if (!syncedFile || !syncedFile.sys_package) {
            vscode.window.showWarningMessage('Not a synced file. Unable to determine to open.');
            return;
        }

        let wb = new WebBrowser(instance);
        wb.openFile(syncedFile.table, syncedFile.sys_id, syncedFile.sys_package);
        logger.info(lib, func, "END");

    });

    /**
     * Run a background script. *gasp*
     */

    vscode.commands.registerCommand('snich.application.run.background_script.global', async () => {
        let logger = new SystemLogHelper();
        let func = 'snich.application.run.background_script';
        logger.info(lib, func, 'START');

        var selectedInstance = await instanceList.selectInstance();

        let bsScript = "";

        let activeEditor = vscode.window.activeTextEditor;

        if (activeEditor) {
            logger.info(lib, func, "selected text: ", activeEditor.selection)
            let textSelection = activeEditor.selection;
            let startPosition = new vscode.Position(textSelection.start.line, textSelection.start.character);
            let endPosition = new vscode.Position(textSelection.end.line, textSelection.end.character);
            let textSelectionRange = new vscode.Range(startPosition, endPosition)
            bsScript = activeEditor.document.getText(textSelectionRange);

        } else {
            vscode.window.showWarningMessage("Could not determine active editor to run background script. Please try again.");
            return;
        }

        if (bsScript) {
            await runScript(bsScript);
        } else {

            let documentText = activeEditor?.document.getText() || "";
            logger.debug(lib, func, "DocumentText:", documentText);
            if (selectedInstance.settings.getBSScriptSettings().alwaysAskWhenNoHighlight == false) {
                runScript(documentText);
            } else {
                let bsAnswer = await vscode.window.showWarningMessage('No text Selected/Highlighted. Use all text in active editor.', `Go for it.`, `Don't ask me again.`, `Whoops. Nevermind.`);

                if (bsAnswer == `Go for it.`) {
                    if (documentText) {
                        await runScript(documentText);
                    } else {
                        vscode.window.showWarningMessage('Document is blank or no document open. Cannot run background scripts.');
                    }
                }

                if (bsAnswer == `Don't ask me again.`) {
                    /**
                     * @todo remember / find out how to update settings for a user. This might just be reading .vscode/settings.json for each instance?
                     * @todo once we figure this out, remember to perform that check at the beginning :)
                     */

                    selectedInstance.settings.setBSScriptAlwaysAsk(false);

                    if (documentText) {
                        await runScript(documentText);
                    } else {
                        vscode.window.showWarningMessage('Document is blank or no document open. Cannot run background scripts.');
                    }
                }
            }
        }


        async function runScript(text: string) {

            var rClient = new RESTClient(selectedInstance, logger);

            var scriptResult = await rClient.runBackgroundScript(text, 'global', selectedInstance.getUserName(), selectedInstance.getPassword());

            let scriptResponseParts = scriptResult.match(/\<PRE\>.*\<\/PRE\>/gi);
            if (scriptResponseParts && scriptResponseParts.length > 0) {
                xml2js.parseStringPromise(scriptResponseParts[0].toString().replace(/\<br\/\>/gi, '\n')).then((result: any) => {
                    snichOutput.appendLine('=============== BACKGROUND SCRIPT EXECUTED (' + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString() + ') ===============');
                    snichOutput.appendLine(result.PRE.toString());

                    //will hold off showing this for now and rely on webview..
                    //snichOutput.show();

                });


            }
            //show webview regardless so long as we have a response..
            let now = new Date().toLocaleString();
            let pan = vscode.window.createWebviewPanel("snichBSScript", selectedInstance.getName() + " - Script Result (" + now + ")", { viewColumn: 1, preserveFocus: false });
            pan.webview.html = scriptResult;
        }

        logger.info(lib, func, 'END');

    });

    vscode.commands.registerCommand('snich.application.run.background_script.select_scope', async () => {
        let logger = new SystemLogHelper();
        let func = 'snich.application.run.background_script';
        logger.info(lib, func, 'START');

        var selectedInstance = await instanceList.selectInstance();

        /**
         * @todo Need to add code to determine which application scope the file is in.
         */

        let bsScript = "";
        let appScope = '';

        let activeEditor = vscode.window.activeTextEditor;

        if (activeEditor) {

            let snApp = selectedInstance.getApplicationByPath(activeEditor.document.uri.fsPath);

            if (snApp && snApp.sys_id) {
                appScope = snApp.sys_id;
            }
            let textSelection = activeEditor.selection;
            let startPosition = new vscode.Position(textSelection.start.line, textSelection.start.character);
            let endPosition = new vscode.Position(textSelection.end.line, textSelection.end.character);
            let textSelectionRange = new vscode.Range(startPosition, endPosition)
            bsScript = activeEditor.document.getText(textSelectionRange);

        } else {
            vscode.window.showWarningMessage("Could not determine active editor to run background script. Please try again.");
            return;
        }

        if (!appScope) {
            let appScopes = selectedInstance.getUniqueAppScopes();

            let qpItems: Array<SNQPItem> = [];

            appScopes.forEach((appScope) => {
                qpItems.push({ label: appScope.label, value: appScope.sys_id });
            })

            let qpAnswer = await vscode.window.showQuickPick(qpItems, { placeHolder: "Select app scope to run background script in. You can alleviate this by saving a .js file in the application folder.", ignoreFocusOut: true });

            if (qpAnswer && qpAnswer.value) {
                appScope = qpAnswer.value; //sys_id of app
            } else {
                vscode.window.showWarningMessage("No app scope selected. Aborting Background Script.");
                return;
            }

        }

        if (bsScript) {
            await runScript(bsScript, appScope);
        } else {

            let documentText = activeEditor?.document.getText() || "";
            if (selectedInstance.settings.getBSScriptSettings().alwaysAskWhenNoHighlight == false) {
                runScript(documentText, appScope);
            } else {
                let bsAnswer = await vscode.window.showWarningMessage('No text Selected/Highlighted. Use all text in active editor.', `Go for it.`, `Don't ask me again.`, `Whoops. Nevermind.`);
                if (bsAnswer == `Go for it.`) {
                    if (documentText) {
                        await runScript(documentText, appScope);
                    } else {
                        vscode.window.showWarningMessage('Document is blank or no document open. Cannot run background scripts.');
                    }
                }

                if (bsAnswer == `Don't ask me again.`) {
                    /**
                     * @todo remember / find out how to update settings for a user. This might just be reading .vscode/settings.json for each instance?
                     * @todo once we figure this out, remember to perform that check at the beginning :)
                     */

                    selectedInstance.settings.setBSScriptAlwaysAsk(false);

                    if (documentText) {
                        await runScript(documentText, appScope);
                    } else {
                        vscode.window.showWarningMessage('Document is blank or no document open. Cannot run background scripts.');
                    }
                }
            }
        }


        async function runScript(text: string, scope: string) {

            var rClient = new RESTClient(selectedInstance, logger);

            var scriptResult = await rClient.runBackgroundScript(text, scope, selectedInstance.getUserName(), selectedInstance.getPassword());

            let scriptResponseParts = scriptResult.match(/\<PRE\>.*\<\/PRE\>/gi);
            logger.debug(lib, func, 'Script response matches:', scriptResponseParts);
            if (scriptResponseParts && scriptResponseParts.length > 0) {
                xml2js.parseStringPromise(scriptResponseParts[0].toString().replace(/\<br\/\>/gi, '\n')).then((result: any) => {
                    snichOutput.appendLine('=============== BACKGROUND SCRIPT EXECUTED (' + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString() + ') ===============');
                    snichOutput.appendLine(result.PRE.toString());

                    //not showing for now. Will still exist in the logs though!                    
                    //snichOutput.show();

                });
            }
            let now = new Date().toLocaleString();
            let pan = vscode.window.createWebviewPanel("snichBSScript", selectedInstance.getName() + " - Script Result (" + now + ")", { viewColumn: 1, preserveFocus: false });
            pan.webview.html = scriptResult;
        }

        logger.info(lib, func, 'END');

    });


    /**
     * Table configuration
     */
    vscode.commands.registerCommand('snich.instance.setup.new_table', async () => {
        let logger = new SystemLogHelper();
        let func = 'snich.instance.setup.new_table';
        logger.info(lib, func, 'START');

        if (!instanceList.atLeastOneConfigured()) {
            return;
        }
        let selectedInstance: InstanceMaster = await instanceList.selectInstance();
        if (!selectedInstance) {
            vscode.window.showWarningMessage('Table Configuration Aborted.');
            return undefined;
        }
        await selectedInstance.tableConfig.syncNew(selectedInstance);
        logger.info(lib, func, 'END', instanceList);


    });

    /**
     * Load all files from a given "Package". This primarily for 'global' scoped apps.
     */
    vscode.commands.registerCommand('snich.sys_package.load.all', async () => {
        let func = 'sys_package_load.all';
        logger.info(lib, func, 'START');

        if (!instanceList.atLeastOneConfigured()) {
            return;
        }

        let fp = new SNFilePuller(instanceList, logger);
        await fp.pullAllPackageFiles();
        setTimeout(function () {
            //faking it for now. Need to fix "async function in tableData for loop..."
            snichOutput.appendLine('All Package files have been loaded. You may need to refresh your workspace file/folder list.');
        }, 4000);

    });


    /**
     * Load all application files based on application selection. 
     */
    vscode.commands.registerCommand('snich.application.load.all', async () => {
        let func = 'application.load.all';
        logger.info(lib, func, 'START');

        if (!instanceList.atLeastOneConfigured()) {
            return;
        }
        let fp = new SNFilePuller(instanceList, logger);
        await fp.pullAllAppFiles();

        setTimeout(function () {
            //faking it for now. Need to fix "async function in tableData for loop..."
            snichOutput.appendLine('All application files have been loaded. You may need to refresh your workspace file/folder list.');
        }, 4000);

        logger.info(lib, func, 'END', instanceList);
    });

    //for loading app files we haven't retrieved yet... goal is to "not replace existing" and increase efficiency..?
    vscode.commands.registerCommand('snich.application.load.new', () => {

    });

    /**
     * Pull a single record from an instance.
     */
    vscode.commands.registerCommand('snich.instance.pull_record', async (folder) => {
        let logger = new SystemLogHelper();
        let func = 'instance.pull_record';
        logger.info(lib, func, 'START');
        if (!instanceList.atLeastOneConfigured()) {
            return;
        }
        let filePuller = new SNFilePuller(instanceList, logger);

        await filePuller.syncRecord();
        logger.info(lib, func, 'END', instanceList);

    });

    /**
     * compare active editor with server
     */
    vscode.commands.registerCommand('snich.activeEditor.compare_with_server', () => {
        let logger = new SystemLogHelper();
        let func = 'activeEditor.compare_with_server';
        let wsManager = new WorkspaceManager(logger);
        logger.info(lib, func, 'START');
        wsManager.compareActiveEditor(instanceList).then(() => { logger.info(lib, func, `END`); });
    });


    //** INSTANCE REMOVAL WATCHER!! */
    let fsWatcher = vscode.workspace.createFileSystemWatcher('**/*/');
    fsWatcher.onDidDelete((uri) => {
        let func = 'InstanceDeleteWatcher';
        logger.info(lib, func, 'File deleted:', uri);
        let instanceLocation = -1;
        instanceList.getInstances().forEach((instance, index) => {
            logger.debug(lib, func, "Testing if instance matches.", { instanceListPath: instance.getConfig().rootPath, loadedFromFile: uri.fsPath });
            if (instance.getConfig().rootPath === uri.fsPath) {
                logger.info(lib, func, `Found instance in instance list at position ${index}`);
                instanceLocation = index;
            }
        });

        if (instanceLocation > -1) {
            instanceList.getInstances().splice(instanceLocation, 1);
            logger.info(lib, func, "Removed instance from instanceList.", instanceList);
        }
    });

    logger.info(lib, func, "We have finished registering all commands. Extension fully activated!");

    let instancesForMessage = instanceList.getInstances();
    let instanceNamesForMessage = instancesForMessage.map((item) => {
        return item.getName();
    })

    vscode.window.showInformationMessage('S.N.I.C.H has been activated with the following ServiceNow Instances:\n' + instanceNamesForMessage);
    logger.info(lib, func, "END");
}

// this method is called when your extension is deactivated
export function deactivate() {

}