import * as fs from "fs";
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import { InstanceMaster, InstanceConfig, InstancesList, SyncedFiles } from './InstanceConfigManager';
import { RESTClient } from "./RESTClient";
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfiguredTables, TableConfig } from "./SNDefaultTables";
import { SNPreferencesManager } from './preferences/SNPreferencesManager';
import { DVAllField, snRecordDVAll } from "../myTypes/globals";

/**
* This class is intended to manage the configuration, files, and folders within the workspace. 
* Used For
*  - Creating, Updating, Deleting files/folders within the workspace.
*  - Loading .json data files as objects to be use when needed. 
* Not Used For
*  - Saving Files to SN
*  - Should never be making a REST Call from this class. 
*/

export class WorkspaceManager {

    readonly configFileName: string = "snich_config.json";
    readonly tableConfigFileName: string = "snich_table_config.json";
    readonly syncedFilesName: string = "snich_synced_files.json";
    readonly ignoreFiles: Array<string> = [this.configFileName, this.tableConfigFileName, this.syncedFilesName, 'jsconfig.json'];
    readonly ignoreFolders = ['@Types', '.vscode'];

    logger: SystemLogHelper;
    lib: string = 'ConfigMgr';

    constructor(logger?: SystemLogHelper) {
        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.logger.info(this.lib, func, 'START');

        this.logger.info(this.lib, func, 'END');
    }

    workspaceValid(logger: SystemLogHelper, lib: string) {
        let wsFolders = vscode.workspace.workspaceFolders || [];
        let func = "workspaceValid";
        logger.info(lib, func, 'Going hunting for SN Instances! Workspace Folders', wsFolders);
        if (wsFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder loaded. Please open a folder for this workspace. This is where all SN instance folders will be created.');
            return false;
        } else if (wsFolders.length > 1) {
            vscode.window.showErrorMessage('More than one workspace folder loaded. Unpredictable results may occur, de-activating extension. Please use just one workspace folder.');
            return false;
        }

        return true;
    }

    /**
    * Requires an instanceData object and will create the files/folders based on that.
    * @param instanceData 
    */
    setupNewInstance(instance: InstanceMaster) {
        let func = "setupNewInstance";
        this.logger.info(this.lib, func, 'START');

        if (vscode.workspace.workspaceFolders) {
            let wsFolder = vscode.workspace.workspaceFolders[0];

            let config = instance.getConfig();

            let rootPath = path.resolve(wsFolder.uri.fsPath, config.name);
            config.rootPath = rootPath;

            let configPath = path.resolve(rootPath, '.vscode');
            config.configPath = configPath;

            this.logger.debug(this.lib, func, 'Resolved path is: ', configPath);
            if (!fs.existsSync(rootPath)) {
                fs.mkdirSync(rootPath);
            }
            if (!fs.existsSync(configPath)) {
                fs.mkdirSync(configPath);
            }
            this.logger.info(this.lib, func, 'Folder created. Converting Instance Data to JSON');

            this.writeAll(instance);

        }
        this.logger.info(this.lib, func, 'END', { instance: instance });
        return instance;
    }


    /**
    * Used to load all the instances based on the folder configuration of the workspace. 
    * @param wsFolders 
    */
    loadWorkspaceInstances(instanceList: InstancesList) {
        let func = "loadWorkspaceInstances";
        let wsFolders = vscode.workspace.workspaceFolders || [];
        //@todo need to also watch the folder path, to see if it gets delete that we remove from the instanceList
        this.logger.info(this.lib, func, "Testing Statically First folder");
        let rootPath = wsFolders[0].uri.fsPath;
        let subFolders = fs.readdirSync(rootPath);
        subFolders.forEach((folder) => {
            let snJSONPath = path.resolve(rootPath, folder, '.vscode', this.configFileName);
            this.logger.info(this.lib, func, "Seeing if JSON file exists at:", snJSONPath);
            if (fs.existsSync(snJSONPath)) {
                //setup InstanceMaster class.
                let instance = new InstanceMaster();
                this.logger.debug(this.lib, func, "Found!");
                instance.setConfig(<InstanceConfig>this.loadJSONFromFile(snJSONPath));

                //load table config from stored value.

                let tableConfigPath = path.resolve(rootPath, folder, '.vscode', this.tableConfigFileName);
                this.logger.info(this.lib, func, "Checking for table config at path:", tableConfigPath);
                if (fs.existsSync(tableConfigPath)) {
                    instance.tableConfig.setFromConfigFile(<ConfiguredTables>this.loadJSONFromFile(tableConfigPath));
                    if (instance.tableConfig.upgraded()) {
                        this.writeTableConfig(instance);
                    }

                }

                let syncedFilePath = path.resolve(rootPath, folder, '.vscode', this.syncedFilesName);

                //@todo - This temporary while we wait for the newest version to settle where i changed the structure / pathing of this file. 
                let syncedFileData = <SyncedFiles>this.loadJSONFromFile(syncedFilePath);
                if (syncedFileData.syncedFiles) {
                    instance.syncedFiles.setFromConfigFile(syncedFileData);
                } else {
                    vscode.window.showErrorMessage(`Unable to load instance ${instance.getName()} due to SyncedFiles config file being out of date. Please delete the instance folder and run the setup command to set it back up.`);
                    return;
                }

                instanceList.addInstance(instance);
            }
        });

        this.logger.info(this.lib, func, "Loaded instanceList:", instanceList);
        this.logger.info(this.lib, func, "END");
    }

    writeAll(instance: InstanceMaster) {
        this.writeInstanceConfig(instance);
        this.writeTableConfig(instance);
        this.writeSyncedFiles(instance);
    }

    writeInstanceConfig(instance: InstanceMaster) {
        let func = 'writeInstanceConfig';
        this.logger.info(this.lib, func, "START");

        let config = instance.getConfig();
        if (!config.connection.auth.writeBasicToDisk) {
            config.connection.auth.password = '';
            this.logger.debug(this.lib, func, "Set password to blank, since writeBasicToDisk is false.");
        }
        //If no config path, nothing to write!
        if (config.configPath) {
            let configJSONPath = path.resolve(config.configPath, this.configFileName);
            this.writeJSON(config, configJSONPath);
            this.logger.debug(this.lib, func, 'Saved instance config:', config);
        } else {
            this.logger.warn(this.lib, func, "Attempted to write instance config, but did not have a configPath");
        }

        this.logger.info(this.lib, func, 'END');
    }

    writeTableConfig(instance: InstanceMaster) {
        let func = 'writeTableConfig';
        this.logger.info(this.lib, func, "START");

        let config = instance.getConfig();
        let filePath = path.resolve(config.configPath, this.tableConfigFileName);
        this.writeJSON(instance.tableConfig, filePath);
        this.logger.debug(this.lib, func, "Saved table config.", instance.tableConfig);

        /**
         * Seems dirty to save preferences here...? But for this one, this is kind of what we want? 
         * Suppose we could add it to the "load table config" too... like if setting up instance first time..?
         */

        let prefMgr = new SNPreferencesManager(this.logger);
        let prefMap = instance.getPrefMapByFileName(this.tableConfigFileName);
        if (prefMap) {
            prefMgr.setPreference(instance, prefMap, JSON.stringify(instance.tableConfig));
        } else {
            this.logger.warn(this.lib, func, "Unable to find preferences map when writing table config! will not be saved to instance!");
        }


        this.logger.info(this.lib, func, 'END');
    }

    writeSyncedFiles(instance: InstanceMaster) {
        let func = 'writesyncedFiles';
        this.logger.info(this.lib, func, 'START',);

        let config = instance.getConfig();
        let filePath = path.resolve(config.configPath, this.syncedFilesName);
        this.writeJSON(instance.getSyncedFiles(), filePath);
        this.logger.info(this.lib, func, 'END');
    }

    /**
    * 
    * @param instance - Instance to create the file for
    * @param table - Table the record came from
    * @param record - The record details to create. 
    * @param openFile  - Open file or not. Default: True
    */
    async createSyncedFile(instance: InstanceMaster, table: TableConfig, record: snRecordDVAll, openFile?: boolean, scopeNameField?: string, scopeIdField?: string) {
        let func = 'createSyncedFile';
        this.logger.info(this.lib, func, 'START', { instanceMaster: instance, tableConfig: table, snRecord: record });

        let fsp = fs.promises;

        if (openFile === undefined) {
            openFile = true;
        }

        if (!scopeNameField) {
            scopeNameField = 'sys_scope.name';
        }

        if (!scopeIdField) {
            scopeIdField = 'sys_scope.scope';
        }


        let appName = record[scopeNameField].value + ' (' + record[scopeIdField].value + ')';
        let tableName = table.name;
        let multiFile = false;
        let config = instance.getConfig();
        let syncedFiles = instance.getSyncedFiles();
        let groupByFromTable = table.getGroupBy() || [];

        let groupBys: DVAllField[] = groupByFromTable.map((columnName) => {
            return record[columnName] || { display_value: "", value: "" };
        })
        this.logger.debug(this.lib, func, "Group by fields from table config: ", groupBys);

        let appPath = path.resolve(config.rootPath, this.fixPathForWindows(appName));
        let rootPath = appPath.toString();
        let finalRootFolderPath = '';

        //this.logger.debug(this.lib, func, "rootPath:", rootPath);

        //createAppPath if it doesn't exist.. 

        try {
            await fsp.mkdir(appPath);
        } catch (err) {
            //do nothing
        }

        let rootPath2 = path.resolve(rootPath, this.fixPathForWindows(tableName));
        //this.logger.debug(this.lib, func, "rootPath2:", rootPath2);
        try {
            await fsp.mkdir(rootPath2);
        } catch (err) {
            ///do nothing 
        }

        for (let i = 0; i < groupBys.length; i++) {
            let groupBy = groupBys[i];
            let addPath = '';
            if (groupBy.display_value == groupBy.value) {
                addPath = groupBy.display_value;
            } else {
                addPath = `${groupBy.display_value} [${groupBy.value}]`;
            }
            rootPath2 = path.resolve(rootPath2, this.fixPathForWindows(addPath));
            try {
                await fsp.mkdir(rootPath2);
            } catch (err) {
                ///do nothing 
            }
        }

        finalRootFolderPath = rootPath2;

        if (table.fields.length > 1) {
            //this.logger.debug(this.lib, func, 'Table definition has more than one field. Updating root path to be based on display value of record.');
            let rootPath3 = path.resolve(rootPath2, this.fixPathForWindows(table.getDisplayValue(record)));
            //this.logger.debug(this.lib, func, "rootPath:", rootPath3);
            finalRootFolderPath = rootPath3;
            multiFile = true;
            openFile = false;

            try {
                await fsp.mkdir(rootPath3);
            } catch (err) {
                //do nothing
            }
        }



        this.logger.info(this.lib, func, `Create file(s) in ${finalRootFolderPath} based on table config:`, table);
        let settings = vscode.workspace.getConfiguration();
        let createEmptyFiles = settings.get('snich.createEmptyFiles') || "Yes";


        table.fields.forEach(async (field) => {
            //this.logger.debug(this.lib, func, 'Processing field:', field);
            //sorry linux/mac users, you get clobbered by this too! :(
            let fileName = this.fixPathForWindows(table.getDisplayValue(record));
            if (multiFile) {
                fileName = this.fixPathForWindows(field.label);
            }

            let file = fileName + '.' + field.extention;
            let content = record[field.name].value;

            //this.logger.debug(this.lib, func, "path before we go to create:", file);

            if ((createEmptyFiles === 'Yes' && !content) || content) {
                let fullPath = path.resolve(finalRootFolderPath, this.fixPathForWindows(file));
                this.logger.debug(this.lib, func, `Creating file at ${fullPath}`);
                await fsp.writeFile(fullPath, content);
                syncedFiles.addFile(fullPath + "", instance.getConfig().name + "", field, record);
                this.writeSyncedFiles(instance);
                if (openFile) {
                    //this.logger.debug(this.lib, func, `Opening file found at: ${fullPath}`);
                    vscode.window.showTextDocument(vscode.Uri.file(fullPath));
                }
            } else {
                vscode.window.showWarningMessage(`Attempted to create file (${fileName}) and content was empty. This could be due to protection policy. Configure extension settings to change this behavior.`);
            }
        });

        this.logger.info(this.lib, func, 'END');
        return true;
    }

    loadJSONFromFile(filePath: string) {
        let func = 'loadJSONFromFile';
        this.logger.info(this.lib, func, 'START', { filePah: filePath });
        let returnData = {};
        if (fs.existsSync(filePath)) {
            this.logger.info(this.lib, func, `Loading json from path: ${filePath}`);
            let fileData = fs.readFileSync(filePath).toString();
            this.logger.info(this.lib, func, 'Snippet from file data: ' + fileData.slice(0, 100));
            returnData = JSON.parse(fileData);
        }
        this.logger.info(this.lib, func, 'END', { returnData: returnData });
        return returnData;

    }

    writeJSON(objToJSON: object, filePath: string) {
        let jsonData = JSON.stringify(objToJSON, null, 4);
        fs.writeFileSync(filePath, jsonData, 'utf8');
    }

    compareActiveEditor(instanceList: InstancesList) {
        let func = 'compareActiveEditor';
        this.logger.info(this.lib, func, `START`);

        let activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('No actived text editor to compare against server file.');
            return new Promise((resolve, reject) => {
                resolve([]);
            }).then(() => { });
        }

        return this.compareWithServer(activeEditor.document.uri.fsPath, activeEditor.document.getText(), instanceList, true).then(() => {
            this.logger.info(this.lib, func, `END`);
        });

    }


    loadObservers(instanceList: InstancesList) {
        let func = 'loadObservers';
        this.logger.info(this.lib, func, 'START');
        this.watchAppFileSave(instanceList);
        this.logger.info(this.lib, func, 'END');

    }

    watchAppFileSave(instanceList: InstancesList) {
        let func = "watchAppFileSave";
        this.logger.info(this.lib, func, 'START');

        vscode.workspace.onWillSaveTextDocument((willSaveEvent) => {
            let func = "WillSaveTextDocument";
            this.logger.info(this.lib, func, 'Will save event started. About to step into wawitUntil. WillSaveEvent currently:', willSaveEvent);
            let document = willSaveEvent.document;

            const wsFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
            this.logger.info(this.lib, func, "WS Folder FS Path: " + wsFolder?.uri.fsPath);
            if(!wsFolder || document.uri.fsPath.indexOf(wsFolder.uri.fsPath) == -1){
                this.logger.info(this.lib, func, "File was saved OUTSIDE Workspace path, ignoring!");
                return;
            }

            for (let i = 0; i < this.ignoreFolders.length; i++) {
                let folderName = this.ignoreFolders[i];
                if (document.uri.fsPath.indexOf(folderName) > -1) {
                    this.logger.info(this.lib, func, 'Folder is in exclusion list!');
                    this.logger.info(this.lib, func, 'END');
                    return;
                }
            }

            let isReservedFile = false;
            this.ignoreFiles.forEach((fileName) => {
                if (document.uri.fsPath.indexOf(fileName) > -1) {
                    isReservedFile = true;
                }
            });

            if (isReservedFile) {
                this.logger.info(this.lib, func, 'File saved was not one to be transmitted', document.uri.fsPath);
                this.logger.info(this.lib, func, 'END');
                return;
            }

            willSaveEvent.waitUntil(new Promise((resolve, reject) => {
                let func = "waitUntilPromise";
                //copy and rename our current file so that we have a .old to compare to in our onDidSaveEvent
                let visibleEditors = vscode.window.visibleTextEditors || [];
                this.logger.debug(this.lib, func, "visible editors: ", visibleEditors);

                //See if in compare window
                let compareWindow = this.isEditorCompareWindow(visibleEditors);

                if (compareWindow) {
                    this.logger.debug(this.lib, func, "we are in the compare window. Do not do any of the dot-old stuff.");
                } else {
                    let currentFSPath = document.uri.fsPath;
                    let extensionMatch = currentFSPath.match(/\.\w*$/);
                    let dotOldPath = currentFSPath + '.old';
                    if (extensionMatch && extensionMatch.length > 0) {
                        let newExt = '.old' + extensionMatch[0];
                        dotOldPath = currentFSPath.replace(/\.\w*$/, newExt);
                    }
                    this.logger.debug(this.lib, func, 'currentFSPath: ', currentFSPath);
                    this.logger.debug(this.lib, func, 'dotOldPath', dotOldPath);
                    fs.copyFileSync(currentFSPath, dotOldPath);
                }
                this.logger.info(this.lib, func, "END");
                //This was in another branch to fix something here.. 73-find-by-exception-report--specificall
                //resolve([]);
                //Canary
                var position0 = new vscode.Position(0, 0);
                var textRange = new vscode.Range(position0, position0);
                resolve([new vscode.TextEdit(textRange, "")]);
            }));

            this.logger.info(this.lib, func, 'END');
        });

        vscode.workspace.onDidSaveTextDocument(async (didSaveDocument) => {
            let func = 'onDidSaveTextDocument';
            this.logger.debug(this.lib, func, 'START', didSaveDocument);

            const wsFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
            this.logger.info(this.lib, func, "WS Folder FS Path: " + wsFolder?.uri.fsPath);
            if(!wsFolder || didSaveDocument.uri.fsPath.indexOf(wsFolder.uri.fsPath) == -1){
                this.logger.info(this.lib, func, "File was saved OUTSIDE Workspace path, ignoring!");
                return;
            }
            for (let i = 0; i < this.ignoreFolders.length; i++) {
                let folderName = this.ignoreFolders[i];
                if (didSaveDocument.uri.fsPath.indexOf(folderName) > -1) {
                    this.logger.info(this.lib, func, 'Folder is in exclusion list!');
                    this.logger.info(this.lib, func, 'END');
                    return;
                }
            }

            let isReservedFile = false;
            this.ignoreFiles.forEach((fileName) => {
                if (didSaveDocument.uri.fsPath.indexOf(fileName) > -1) {
                    isReservedFile = true;
                }
            });

            if (isReservedFile) {
                this.logger.info(this.lib, func, 'File saved was not one to be transmitted', didSaveDocument.uri.fsPath);
                this.logger.info(this.lib, func, 'END');
                return;
            }

            let visibleEditors = vscode.window.visibleTextEditors || [];
            //See if in compare window
            let compareWindow = false;
            visibleEditors.forEach((editor) => {
                if (editor.document.fileName.indexOf('compare_files_temp') > -1) {
                    compareWindow = true;
                }
            })

            if (compareWindow) {
                this.logger.debug(this.lib, func, "we are in the compare window.");
                let currentFSPath = didSaveDocument.uri.fsPath;
                await this.compareWithServer(currentFSPath, didSaveDocument.getText(), instanceList, false);
            } else {
                this.logger.debug(this.lib, func, 'Is not compare window.');
                let currentFSPath = didSaveDocument.uri.fsPath;
                let extensionMatch = currentFSPath.match(/\.\w*$/);
                let dotOldPath = currentFSPath + '.old';
                if (extensionMatch && extensionMatch.length > 0) {
                    let newExt = '.old' + extensionMatch[0];
                    dotOldPath = currentFSPath.replace(/\.\w*$/, newExt);
                }
                this.logger.debug(this.lib, func, 'currentFSPath: ', currentFSPath);
                await this.compareWithServer(currentFSPath, didSaveDocument.getText(), instanceList, false, dotOldPath);
                this.logger.debug(this.lib, func, "Deleting old file: " + dotOldPath);
                fs.unlinkSync(dotOldPath);
            }

            this.logger.debug(this.lib, func, 'END');
        });
    }

    /**
    * 
    * @param fsPath File path that we will use to find the SN File information (Field to sync, table, etc);
    * @param newContent New text content to save to server if choosing to overwrite
    * @param instanceList List of instances
    * @param onDemand Are we just doing a compare? 
    * @param dotOldPath path to .old file for comparison. 
    */
    async compareWithServer(fsPath: string, newContent: string, instanceList: InstancesList, onDemand?: boolean, dotOldPath?: string) {

        let func = 'compareWithServer';
        this.logger.info(this.lib, func, 'START', { fsPath: fsPath, newContent: newContent });

        let visibleEditors = vscode.window.visibleTextEditors || [];
        let isCompareWindow = this.isEditorCompareWindow(visibleEditors);


        let isReservedFile = false;
        this.ignoreFiles.forEach((fileName) => {
            if (fsPath.indexOf(fileName) > -1) {
                isReservedFile = true;
            }
        });

        if (isReservedFile) {
            this.logger.info(this.lib, func, 'File saved was not one to be transmitted', fsPath);
            this.logger.info(this.lib, func, 'END');
            return;
        }

        let wsFolder = <vscode.WorkspaceFolder>{};
        if (vscode.workspace.workspaceFolders) {
            wsFolder = vscode.workspace.workspaceFolders[0];
        }

        //escace path components...
        let replaceWithPath = "/";
        if (path.sep === "\\") {
            replaceWithPath = "\\\\";
        }

        let regexPreparedPath = wsFolder.uri.fsPath.replace(new RegExp("\\" + path.sep, 'g'), replaceWithPath) + replaceWithPath + "(.*?)" + replaceWithPath + "(\\w*)";
        this.logger.debug(this.lib, func, 'RegexPreparedPath', regexPreparedPath);

        let InstanceAppComponents = new RegExp(regexPreparedPath);
        this.logger.debug(this.lib, func, 'InstanceAppComponents', InstanceAppComponents.toString());

        let matches = fsPath.match(InstanceAppComponents);
        this.logger.debug(this.lib, func, 'Matches:', matches);

        if (!matches || matches.length === 0 || !matches[1]) {
            this.logger.error(this.lib, func, `Couldn't determine instance on save. Matched values:`, matches);
            //@todo need to determine if we're a file in our SNICH workspace... This is due to to the extensino being activated in all workspaces when activated... 
            //vscode.window.showErrorMessage('Unable to save file, could not determine instance.');
            return;
        }

        let instanceName = matches[1]; //2nd grouping will be instance name;
        let instance = instanceList.getInstance(instanceName);
        let syncedFiles = instance.getSyncedFiles();
        if (!instance.getName) {
            this.logger.error(this.lib, func, `Attempted to get instance by name [${instanceName}] and did not find it in our list of configured instances.`);
            return;
        }


        this.logger.info(this.lib, func, 'Loaded synced files and instance config.', syncedFiles);
        this.logger.info(this.lib, func, 'Loaded instance config.', instance.getConfig());

        if (syncedFiles.syncedFiles.length > 0) {
            let filePath = fsPath;
            this.logger.info(this.lib, func, 'We have synced files!');
            let fileConfig = syncedFiles.getFileByPath(filePath);

            if (fileConfig.fsPath) {
                //read what we have currently on disk so we can compare what's on server to see if server has a newer version.
                let localContentPath = dotOldPath || fileConfig.fsPath;

                let localContent = fs.readFileSync(localContentPath).toString();
                let localContentHash = crypto.createHash('md5').update(localContent).digest("hex");
                let newContentHash = crypto.createHash('md5').update(newContent).digest("hex");
                let serverContent = "";
                let serverContentHash = "";

                let client = new RESTClient(instance);
                let contentField = fileConfig.content_field;
                let action = 'Overwrite Server File'; //default to overwriting on server. This way if no differences we save to server.
                let serverRecord: any = {};
                if (!isCompareWindow) {
                    serverRecord = await client.getRecord(fileConfig.table, fileConfig.sys_id, [contentField]);
                }

                if (!serverRecord && !isCompareWindow) {
                    vscode.window.showWarningMessage(`Saved file [${fileConfig.fsPath}] does not seem to exist on the server any longer. sys_id:${fileConfig.sys_id} -- table:${fileConfig.table}`);
                    return;
                }

                serverContent = serverRecord[contentField] || "";
                serverContentHash = crypto.createHash('md5').update(serverContent).digest("hex");
                this.logger.info(this.lib, func, 'Comparing Server to Local MD5 Hash:', { serverHash: serverContentHash, localHash: localContentHash });

                if (localContentHash !== serverContentHash && !isCompareWindow && !onDemand) {
                    this.logger.warn(this.lib, func, "Server has is different than current copy on disk.");
                    action = await vscode.window.showWarningMessage('Server version is newer. If saving from compare window, choose overwrite to update.', 'Overwrite Local File', 'Overwrite Server File', 'Compare', 'Cancel') || "";
                    if (!action) {
                        vscode.window.showWarningMessage(`No choice was made to action file ${fileConfig.fsPath}. Was saved to disk and not to server.`);
                        return;
                    }

                    if (action === "Cancel") {
                        vscode.window.showInformationMessage('File was still saved to disk.');
                        return;
                    }

                }

                //regex like: \\(.+\\)*(.+)\.(.+)$  replacing with our determined path replacer above..
                let fileNameRegEx = new RegExp(replaceWithPath + '(.+' + replaceWithPath + ')*(.+)\\.(.+)$');

                this.logger.debug(this.lib, func, "looking for file name with regex:" + fileNameRegEx);
                let fileNameMatch = fileConfig.fsPath.match(fileNameRegEx);
                this.logger.debug(this.lib, func, 'Matches:', fileNameMatch);

                let fileName = 'server_version.txt';

                if (fileNameMatch && fileNameMatch.length > 1) {
                    fileName = 'server_version_' + fileNameMatch[2];
                    if (fileNameMatch[3]) {
                        fileName += '.' + fileNameMatch[3]; //extension if exists.
                    }
                }

                let wsFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
                let wsFolderCode = path.resolve(wsFolder, instanceName, ".vscode");
                let wsFolderTemp = path.resolve(wsFolderCode, 'compare_files_temp');
                let serverTempFilePath = path.resolve(wsFolderTemp, fileName);

                if (action === "Compare" || onDemand) {
                    this.logger.info(this.lib, func, 'User chose to compare files.');
                    //launch files for comparison. 
                    if (onDemand && newContentHash === serverContentHash) {
                        vscode.window.showInformationMessage('File is same on server.');
                    } else {
                        if (!fs.existsSync(wsFolderCode)) {
                            fs.mkdirSync(wsFolderCode);
                        }
                        if (!fs.existsSync(wsFolderTemp)) {
                            fs.mkdirSync(wsFolderTemp);
                        }
                        fs.writeFileSync(serverTempFilePath, serverContent);
                        if (onDemand) { vscode.window.showWarningMessage('Content was different on server. Loading compare window!'); }
                        await vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(serverTempFilePath), vscode.Uri.file(fileConfig.fsPath), "Server File <- || -> Local File");
                    }

                } else if (action === "Overwrite Local File") {
                    this.logger.info(this.lib, func, "Overwriting local data!");
                    fs.writeFileSync(fileConfig.fsPath, serverContent);
                } else if (action === "Overwrite Server File" || isCompareWindow) {
                    let body: any = {};
                    body[contentField] = newContent;
                    this.logger.info(this.lib, func, 'Posting record back to SN!');
                    if (fs.existsSync(serverTempFilePath)) {
                        fs.unlinkSync(serverTempFilePath);
                    }
                    let updateResult = await client.updateRecord(fileConfig.table, fileConfig.sys_id, body);
                    this.logger.info(this.lib, func, 'Response from file save:', updateResult);
                }
                this.logger.info(this.lib, func, 'END');
                return;
            }
        } else {
            this.logger.info(this.lib, func, "Did not find any synced files");
        }
    }

    private fixPathForWindows(fsPath: string) {
        return fsPath.replace(/"|\<|\>|\?|\||\/|\\|:|\*/g, '_');
    }

    private isEditorCompareWindow(visibleEditors: readonly vscode.TextEditor[]) {
        let isCompareWindow = false;
        visibleEditors.forEach((editor) => {
            if (editor.document.fileName.indexOf('compare_files_temp') > -1) {
                isCompareWindow = true;
            }
        })

        return isCompareWindow;
    }

}