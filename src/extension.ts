import * as vscode from 'vscode';
import { WSFileMan } from './FileMan/WSFileMan';

import { ActivateCommandsInstance } from './commands/ActivateCommandsInstance';
import { SNICHLogger } from './SNICH/SNICHLogger/SNICHLogger';

export const snichOutput = vscode.window.createOutputChannel('S.N.I.C.H.');
export let extensionContext: vscode.ExtensionContext; //for imports into other classes.

export const currentSNRelease = 'rome';
let registeredCommands: vscode.Disposable[] = [];



export async function activate(context: vscode.ExtensionContext) {

    extensionContext = context;

    let logger = new SNICHLogger();
    let lib = "extension.ts";
    let func = "activate";
    logger.info(lib, func, "ENTERING");

    let wsFileMan = new WSFileMan(logger);
    let workspaceState = await wsFileMan.validateWorkspace();

    logger.debug(lib, func, "Valid Workspace? ", workspaceState);

    //TODO: Consider expanding the results of validateWorkspace, so we can account for things like "Folder open, not empty, and does not look like a root SNICH folder."
    if (workspaceState === undefined) {
        let errorSelection = await vscode.window.showErrorMessage("No folder opened in workspace. Please Create / Open an empty folder or a SNICH Folder.", "Open Folder", "Cancel");
        if (errorSelection == "Open") {
            vscode.commands.executeCommand('workbench.action.files.openFolder');
            deactivate();
            return;
        } else {
            deactivate();
            return;
        }
        //TODO: Consider this if block to be "Net new folder / workspace root is empty"
    } else if (workspaceState === "empty") {
        //we have a workspace folder open. Set it up!
        await wsFileMan.setupNewWorkspace();

        if (logger.logLevel === logger._DEBUG) {
            await wsFileMan.setDebugMode(true);
        } else {
            await wsFileMan.setDebugMode(false);
        }
    } else if (workspaceState === "not_empty") {
        let notEmptySelection = await vscode.window.showErrorMessage(`Workspace root folder not empty and SNICH is not configured in this folder. It is recommended to start with an empty folder.`, "Open Folder", "Cancel")
        if (notEmptySelection == "Open") {
            vscode.commands.executeCommand('workbench.action.files.openFolder');
            deactivate();
            return;
        } else {
            deactivate();
            return;
        }
    } else if (workspaceState === "multiple_workspace_root_folders") {
        vscode.window.showErrorMessage(`Multiple Root Folders detected in workspace. Multi-Folder workspaces are not supported at this time.`);
        deactivate();
        return;
    } else if (workspaceState === "has_dot_snich") {

        //TODO: Consider moving this into an "activate workspace" function, separate from "First time setup". This will give us a place we can continue to add functionality

        await wsFileMan.configureDotVScodeSettings(); //always make sure we are on the latest version of this...

        if (logger.logLevel === logger._DEBUG) {
            await wsFileMan.setDebugMode(true);
        } else {
            await wsFileMan.setDebugMode(false);
        }

    }


    //add to this array for registering commands so that deactivate can unregister them.
    registeredCommands = [
        vscode.commands.registerCommand('snich.instance.setup', () => new ActivateCommandsInstance().setup()),
        vscode.commands.registerCommand('snich.instance.test_connection', () => new ActivateCommandsInstance().testConnection()),
        vscode.commands.registerCommand('snich.instance.setup.new_app_file_table', () => new ActivateCommandsInstance().configureAppFileTable()),
        vscode.commands.registerCommand('snich.instance.delete', () => new ActivateCommandsInstance().deleteInstance()),
        vscode.commands.registerCommand('snich.instance.packages.load.all', () => new ActivateCommandsInstance().pullAllPackageFiles())
    ];


    /* vscode.commands.registerCommand('snich.instance.pull_record', new ActivateCommandsInstance().pullRecord);*/


    logger.info(lib, func, "LEAVING");

}


export function deactivate() {

    /**
     * Cleanup? When does the extension deactivate? I don't think there is a cleanup scenario
     */

    //de-registered all commands that were registered.
    registeredCommands.forEach((vCommand) => vCommand.dispose());
    registeredCommands = [];
}


export interface qpWithValue extends vscode.QuickPickItem {
    value: any;
}