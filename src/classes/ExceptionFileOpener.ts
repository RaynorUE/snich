import * as vscode from 'vscode';
import { SNSyncedFile } from './InstanceConfigManager';
import { SystemLogHelper } from './LogHelper';

export class ExceptionFileOpener {
    logger: SystemLogHelper;

    constructor(logger?: SystemLogHelper) {
        this.logger = logger || new SystemLogHelper();
    }

    async openSNFilePath() {
        const snFilePath = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: `Please copy/paste an SN File Path value like 'sys_script_include.b8a6ada687baf0107bb3a86e0ebb357c.script'. Typically these patterns can be found in exception reports and reports from TPP App Review.` });
        if (!snFilePath) {
            vscode.window.showInformationMessage("Open File by table.sys_id.field aborted! No Path specified.");
            return;
        }

        if (snFilePath.split('.').length < 3) {
            vscode.window.showErrorMessage('Value provided is not an SN File Path. Please try again.');
        }
        const fs = vscode.workspace.fs;
        const wsFolders = vscode.workspace.workspaceFolders || [];
        const rootPath = wsFolders[0]?.uri;

        const subFolders = await fs.readDirectory(rootPath);

        let fileEntry:SNSyncedFile[] | undefined;

        loop1:
        for (let i = 0; i < subFolders.length; i++) {
            let folder = subFolders[i];
            const dotVScode = await fs.readDirectory(vscode.Uri.joinPath(rootPath, folder[0], '.vscode'));

            if (dotVScode) {
                const syncedFiles = await fs.readFile(vscode.Uri.joinPath(rootPath, folder[0], '.vscode', 'snich_synced_files.json'));
                if (syncedFiles) {
                    var filesData = JSON.parse(syncedFiles.toString());
                    if (filesData?.syncedFiles) {
                        const snFilePathParts = snFilePath.split(',');
                        const table = snFilePathParts[0];
                        const sys_id = snFilePathParts[1];
                        const field = snFilePathParts[2];

                        let syncedFiles:SNSyncedFile[] = filesData.syncedFiles || [];
                        fileEntry = syncedFiles.filter((fileEntry: SNSyncedFile) => fileEntry.content_field == field && fileEntry.sys_id == sys_id && fileEntry.table == table);
                    }
                }
            }
        }

        if(fileEntry && fileEntry.length == 1){
            vscode.workspace.openTextDocument(vscode.Uri.parse(fileEntry[0].fsPath));
        } else {
            vscode.window.showErrorMessage('Could not find file provided.');
        }
    }
}