import * as vscode from 'vscode';
import * as path from 'path';
import { InstancesList, SNSyncedFile } from './InstanceConfigManager';
import { SystemLogHelper } from './LogHelper';

export class ExceptionFileOpener {
    logger: SystemLogHelper;

    constructor(logger?: SystemLogHelper) {
        this.logger = logger || new SystemLogHelper();
    }

    async openSNFilePath(instanceList: InstancesList) {
        const snFilePath = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: `Please copy/paste an SN File Path value like 'sys_script_include.b8a6ada687baf0107bb3a86e0ebb357c.script'. Typically these patterns can be found in exception reports and reports from TPP App Review.` });
        if (!snFilePath) {
            vscode.window.showInformationMessage("Open File by table.sys_id.field aborted! No Path specified.");
            return;
        }

        const snFilePaths = snFilePath.split('.');
        if (snFilePaths.length > 3) {
            vscode.window.showErrorMessage('Value provided is not an SN File Path. Please try again.');
            return;
        }

        var instances = instanceList.getInstances();
        let foundFile = false;
        loop1:
        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            let files = instance.getSyncedFiles();

            let fileEntry = files.getFileBySysID(snFilePaths[1].trim(), snFilePaths[0].trim(), snFilePaths[2].trim());
                if (fileEntry.fsPath) {
                    var fileUri = vscode.Uri.file(path.resolve(fileEntry.fsPath))
                    
                vscode.window.showTextDocument(fileUri);
                foundFile = true;
                break loop1;
            }

        }

        if (!foundFile) {
            vscode.window.showErrorMessage('Could not find file provided.');
        }

    }
}