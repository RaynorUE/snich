import * as fs from "fs";
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import {InstanceMaster, InstanceConfig, InstancesList} from './InstanceConfigManager';
import { snTableConfig, snTableField } from "../myTypes/globals";
import { RESTClient } from "./RESTClient";
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfiguredTables } from "./SNDefaultTables";

/**
* This class is intended to manage the configuration, files, and folders within the workspace. 
* Used For
*  - Creating, Updating, Deleting files/folders within the workspace.
*  - Loading .json data files as objects to be use when needed. 
* Not Used For
*  - Saving Files to SN
*  - Should never be making a REST Call from this class. 
*/

export class WorkspaceManager{
    
    readonly configFileName:string = "snich_config.json";
    readonly tableConfigFileName:string = "snich_table_config.json";
    readonly syncedFilesName:string = "snich_synced_files.json";
    logger:SystemLogHelper;
    lib:string = 'ConfigMgr';
    
    constructor(logger?:SystemLogHelper){
        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.logger.info(this.lib, func, 'START');
        
        
        this.logger.info(this.lib, func, 'END');
    }

    workspaceValid(logger:SystemLogHelper, lib:string) {
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
    
    /**
    * Requires an instanceData object and will create the files/folders based on that.
    * @param instanceData 
    */
    setupNewInstance(instance:InstanceMaster){
        let func = "setupNewInstance";
        this.logger.info(this.lib, func, 'START');
        
        if(vscode.workspace.workspaceFolders){
            let wsFolder = vscode.workspace.workspaceFolders[0];
            
            let config = instance.getConfig();
            
            let rootPath = path.resolve(wsFolder.uri.fsPath, config.name);
            config.rootPath = rootPath;

            let configPath = path.resolve(rootPath, '.vscode');
            config.configPath = configPath;

            this.logger.debug(this.lib, func, 'Resolved path is: ', configPath);
            if(!fs.existsSync(rootPath)){
                fs.mkdirSync(rootPath);
            }
            if(!fs.existsSync(configPath)){
                fs.mkdirSync(configPath);
            }
            this.logger.info(this.lib, func, 'Folder created. Converting Instance Data to JSON');
            
            this.writeInstanceConfig(instance);
            this.writeTableConfig(instance);
            
        }
        this.logger.info(this.lib, func, 'END', {instance:instance});
        return instance;
    }
    
    
    /**
    * Used to load all the instances based on the folder configuration of the workspace. 
    * @param wsFolders 
    */
    loadWorkspaceInstances(instanceList:InstancesList){
        let func = "loadWorkspaceInstances";
        let wsFolders = vscode.workspace.workspaceFolders || [];
        //@todo need to also watch the folder path, to see if it gets delete that we remove from the instanceList
        this.logger.info(this.lib, func, "Testing Statically First folder");
        let rootPath = wsFolders[0].uri.fsPath;
        var subFolders = fs.readdirSync(rootPath);
        subFolders.forEach((folder) =>{
            var snJSONPath = path.resolve(rootPath, folder, '.vscode', this.configFileName);
            this.logger.info(this.lib, func, "Seeing if JSON file exists at:", snJSONPath);
            if(fs.existsSync(snJSONPath)){
                //setup InstanceMaster class.
                let instance = new InstanceMaster();
                this.logger.debug(this.lib, func, "Found!");
                instance.setConfig(<InstanceConfig>this.loadJSONFromFile(snJSONPath));
                
                //load table config from stored value.
                
                var tableConfigPath = path.resolve(rootPath, folder, '.vscode', this.tableConfigFileName);
                this.logger.info(this.lib, func, "Checking for table config at path:", tableConfigPath);
                if(fs.existsSync(tableConfigPath)){
                    instance.tableConfig.setFromConfigFile(<ConfiguredTables>this.loadJSONFromFile(tableConfigPath));
                }
                instanceList.addInstance(instance);
            }
        });
        this.logger.info(this.lib, func, "Loaded instanceList:", instanceList);
        this.logger.info(this.lib, func, "END");
    }
    
    writeAll(instance:InstanceMaster){
        
    }
    
    writeInstanceConfig(instance:InstanceMaster){
        let func = 'writeInstanceConfig';
        this.logger.info(this.lib, func, "START");
        
        let config = instance.getConfig();
        let configJSONPath = path.resolve(config.configPath, this.configFileName);
        this.writeJSON(config, configJSONPath);
        this.logger.debug(this.lib, func, 'Saved instance config:', config);
        
        this.logger.info(this.lib, func, 'END');
    }
    
    writeTableConfig(instance:InstanceMaster){
        let func = 'writeTableConfig';
        this.logger.info(this.lib, func, "START");
        
        let config = instance.getConfig();
        let filePath = path.resolve(config.configPath, this.tableConfigFileName);
        this.writeJSON(instance.tableConfig, filePath);
        this.logger.debug(this.lib, func, "Saved table config.", instance.tableConfig);
        
        this.logger.info(this.lib, func, 'END');
    }
    
    writeSyncedFiles(instance:InstanceMaster, syncedFiles:Array<SNSyncedFile>){
        let func = 'writesyncedFiles';
        this.logger.info(this.lib, func, 'START', );

        let config = instance.getConfig();
        let filePath = path.resolve(config.configPath, this.syncedFilesName) ;
        this.writeJSON(syncedFiles, filePath);
        this.logger.info(this.lib, func, 'END');
    }
    
    loadSyncedFiles(instance:InstanceMaster, appScope:string){
        let func = 'loadSyncedFiles';
        this.logger.info(this.lib, func, 'START', );
        
        let config = instance.getConfig();
        let syncedFilesPath = path.resolve(config.configPath, this.syncedFilesName);
        this.logger.info(this.lib, func, `Checking for synced Files at path: ${syncedFilesPath}`);
        let syncedFiles:Array<SNSyncedFile> = [];
        
        if(fs.existsSync(syncedFilesPath)){
            this.logger.info(this.lib, func, 'Found! Loading...', syncedFilesPath);
            syncedFiles = <Array<SNSyncedFile>>this.loadJSONFromFile(syncedFilesPath);
        }
        
        this.logger.info(this.lib, func, 'END');   
        return syncedFiles;
        
    }

    /**
     * 
     * @param instance - Instance to create the file for
     * @param table - Table the record came from
     * @param record - The record details to create. 
     * @param openFile  - Open file or not. Default: True
     */
    createSyncedFile(instance:InstanceMaster, table:snTableConfig, record:any, openFile?:boolean){
        let func = 'createSyncedFile';
        this.logger.info(this.lib, func, 'START', {instanceMaster:instance, tableConfig:table, snRecord:record});
        
        if(openFile === undefined){
            openFile = true;
        }
        
        let appName = record['sys_scope.name'] + ' (' + record['sys_scope.scope'] + ')';
        let tableName = table.name;
        let multiFile = false;
        let config = instance.getConfig();
        
        let syncedFiles = this.loadSyncedFiles(instance, appName);
        
        let appPath = path.resolve(config.rootPath, appName);
        let rootPath = appPath.toString();
        
        if(!fs.existsSync(appPath)){
            this.logger.info(this.lib, func, 'App scope path does not exist. Creating:', appPath);
            fs.mkdirSync(appPath);
        }
        
        
        rootPath = path.resolve(rootPath, tableName);
        if(!fs.existsSync(rootPath)){
            this.logger.info(this.lib, func, "Creating tbale name folder:", rootPath);
            fs.mkdirSync(rootPath);
        }
        
        if(table.fields.length > 1){
            this.logger.info(this.lib, func, 'Table definition has more than one field. Updating root path to be based on display value of record.');
            rootPath = path.resolve(rootPath, record[table.display_field]);
            multiFile = true;
            openFile = false;
        }
        
        if(!fs.existsSync(rootPath)){
            this.logger.info(this.lib, func, 'Path does not exist. Creating.');
            fs.mkdirSync(rootPath);
        }
        
        this.logger.info(this.lib, func, `Create file(s) in ${rootPath} based on table config:`, table);
        
        table.fields.forEach((field) =>{
            this.logger.debug(this.lib, func, 'Processing field:', field);
            let fileName = record[table.display_field];
            if(multiFile){
                fileName = field.label;
            }
            let file = fileName + '.' + field.extention;
            let content = record[field.name];
            let settings = vscode.workspace.getConfiguration();
            var createEmptyFiles = settings.get('snich.createEmptyFiles') || "Yes";
            
            if((createEmptyFiles === 'Yes' && !content) || content){
                let fullPath = path.resolve(rootPath, file);
                this.logger.debug(this.lib, func, `Creating file at ${fullPath}`);
                fs.writeFileSync(fullPath, content,'utf8');
                syncedFiles.push(new SNSyncedFile(fullPath, instance.getConfig().name, field, record));
                if(openFile){
                    this.logger.debug(this.lib, func, `Opening file found at: ${fullPath}`);
                    vscode.window.showTextDocument(vscode.Uri.file(fullPath));
                }
            } else {
                vscode.window.showWarningMessage(`Attempted to create file (${fileName}) and content was empty. This could be due to protection policy. Configure extension settings to change this behavior.` );
            }
        });
        
        this.writeSyncedFiles(instance, syncedFiles);
        
        this.logger.info(this.lib, func, 'END');
        return true;
    }
    
    loadJSONFromFile(filePath:string){
        let func = 'loadJSONFromFile';
        this.logger.info(this.lib, func, 'START', {filePah:filePath});
        let returnData = {};
        if(fs.existsSync(filePath)){
            this.logger.info(this.lib, func, `Loading json from path: ${filePath}`);
            returnData = JSON.parse(fs.readFileSync(filePath).toString());
        } 
        this.logger.info(this.lib, func, 'END', {returnData:returnData});
        return returnData;
        
    }
    
    writeJSON(objToJSON:object, filePath:string){
        let jsonData = JSON.stringify(objToJSON, null, 4);
        fs.writeFileSync(filePath, jsonData,'utf8');
    }
    
    
    loadObservers(){
        let func = 'loadObservers';
        this.logger.info(this.lib, func, 'START');
        this.watchAppFileSave();
    }

    watchAppFileSave(){
        let func = "watchAppFileSave";
        this.logger.info(this.lib, func, 'START');
        
        vscode.workspace.onWillSaveTextDocument(async (willSaveEvent) =>{
            let func = "WillSaveTextDocument";
            this.logger.info(this.lib, func, 'Will save event started. About to step into waitUntil. WillSaveEvent currently:', willSaveEvent);
            let document = willSaveEvent.document;
            
            willSaveEvent.waitUntil( new Promise(async (resolve, reject) =>{
                let func = 'waitUntilPromise';
                this.logger.info(this.lib, func, 'START', document);
                
                let reservedFiles = [this.configFileName, this.syncedFilesName, this.tableConfigFileName];
                let isReservedFile = false;
                reservedFiles.forEach((fileName) => {
                    if(document.fileName.indexOf(fileName) >-1){
                        isReservedFile = true;
                    }
                });
                
                if(isReservedFile){
                    this.logger.info(this.lib, func, 'File saved was not one to be transmitted', document);
                    this.logger.info(this.lib, func, 'END');
                    resolve();
                    return;
                }
                //@todo --- Need to figure out how to find the .vscode folder... i think if we take the file path down to the WSfolder, then get the next
                //position will give us this instance, and then the .vscode from there... I think we will be able to use some regex to get this. 
                
                let wsFolder = <vscode.WorkspaceFolder>{};
                if(vscode.workspace.workspaceFolders){
                    wsFolder = vscode.workspace.workspaceFolders[0];
                }
                //escace path components...
                let replaceWithPath = "/";
                if(path.sep === "\\"){
                    replaceWithPath = "\\\\";
                }

                let regexPreparedPath = wsFolder.uri.fsPath.replace(new RegExp("\\" + path.sep, 'g'), replaceWithPath) + replaceWithPath + "(\\w*)" + replaceWithPath + "(\\w*)"; 
                this.logger.debug(this.lib, func, 'RegexPreparedPath', regexPreparedPath);
                
                let InstanceAppComponents = new RegExp(regexPreparedPath);
                this.logger.debug(this.lib, func, 'InstanceAppComponents', InstanceAppComponents.toString());
                
                let matches = document.fileName.match(InstanceAppComponents);
                this.logger.debug(this.lib, func, 'Matches:', matches);
                
                if(!matches || matches.length === 0 || !matches[1]){
                    this.logger.error(this.lib, func, `Couldn't determine instance on save. Matched values:`, matches);
                    //@todo need to determine if we're a file in our SNICH workspace... This is due to to the extensino being activated in all workspaces when activated... 
                    //vscode.window.showErrorMessage('Unable to save file, could not determine instance.');
                    resolve();
                    return;
                }

                let instanceName = matches[1]; //2nd grouping will be instance name;
                let syncedFilesPath = path.resolve(wsFolder.uri.fsPath, instanceName, '.vscode', this.syncedFilesName);
                let configFilePath = path.resolve(wsFolder.uri.fsPath, instanceName, '.vscode', this.configFileName);

                let syncedFiles = <Array<SNSyncedFile>>this.loadJSONFromFile(syncedFilesPath);
                let instanceConfig = <InstanceConfig>this.loadJSONFromFile(configFilePath);
                
                this.logger.info(this.lib, func, 'Loaded synced files and instance config.', {instanceConfig:instanceConfig, syncedFiles:syncedFiles});
               
                if(syncedFiles.length > 0){
                    let filePath = document.uri.fsPath;
                    this.logger.info(this.lib, func, 'We have synced files!');
                    let fileConfig = <SNSyncedFile>{};
                    syncedFiles.forEach((syncedFile, index) => {
                        this.logger.debug(this.lib, func, 'Seeing if sycned file is same as path of saved file', {synced:syncedFile, file:filePath} );
                        if(syncedFile.fsPath === filePath){
                            this.logger.info(this.lib, func, 'Found synced file that is a match.', syncedFile);
                            fileConfig = syncedFile;
                            index = syncedFiles.length; //should break loop?
                        }
                    });
                    
                    if(fileConfig.fsPath){
                        //read what we have currently on disk so we can compare what's on server to see if server has a newer version.
                        let localContent = fs.readFileSync(fileConfig.fsPath).toString();
                        let localContentHash = crypto.createHash('md5').update(localContent).digest("hex");
                        let serverContent = "";
                        let serverContentHash = "";
                        let newContent = document.getText();
                        
                        let client = new RESTClient(instanceConfig);
                        let contentField = fileConfig.content_field;
                        let action = 'Overwrite (Server)'; //default to overwriting on server. This way if no differences we save to server.
                        return client.getRecord(fileConfig.table, fileConfig.sys_id, [contentField]).then((serverRecord:any) => {
                            serverContent = serverRecord[contentField];
                            serverContentHash = crypto.createHash('md5').update(serverContent).digest("hex");
                            this.logger.info(this.lib, func, 'Comparing Server to Local MD5 Hash:', {serverHash: serverContentHash, localHash: localContentHash});
                            
                            if(localContentHash !== serverContentHash){
                                this.logger.warn(this.lib, func, "Server has is different than current copy on disk.");
                                return vscode.window.showWarningMessage('Server version is newer. If saving from compare window, choose overwrite to update.', 'Overwrite (Local)', 'Overwrite (Server)', 'Compare', 'Cancel',).then((choice) =>{
                                    this.logger.info(this.lib, func, 'Choice:', choice);
                                    action = choice || "Cancel"; //default to cancel in the event they don't respond.
                                    if(action === "Overwrite (Server)"){
                                        return true;
                                    } else {
                                        return false;
                                    }
                                });
                            } else {
                                action = "Overwrite";
                                return true;
                            }
                            
                        }).then((okayToCommit) =>{
                            let regEx = new RegExp(path.sep.replace('\\', '\\\\') + '([a-zA-Z\.]*)$');
                            let fileNameMatch = fileConfig.fsPath.match(regEx);
                            
                            let fileName = 'server_version.txt';
                            if(fileNameMatch && fileNameMatch.length > 1){
                                fileName = 'server_version_' + fileNameMatch[1];
                            }
                            let wsFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
                            let wsFolderCode = path.resolve(wsFolder, instanceName, ".vscode");
                            let wsFolderTemp = path.resolve(wsFolderCode, 'compare_files_temp');
                            let serverTempFilePath = path.resolve(wsFolderTemp, fileName);

                            if(!okayToCommit){
                                //not okay to commit.
                                if(action === "Compare"){
                                    this.logger.info(this.lib, func, 'Not Okay to commit and action is Compare');
                                    //launch files for comparison. 

                                    if(!fs.existsSync(wsFolderCode)){
                                        fs.mkdirSync(wsFolderCode);
                                    }
                                    if(!fs.existsSync(wsFolderTemp)){
                                        fs.mkdirSync(wsFolderTemp);
                                    }

                                    
                                    fs.writeFileSync(serverTempFilePath, serverContent);
                                    return vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(serverTempFilePath),vscode.Uri.file(fileConfig.fsPath), "Server File <--> Local File").then(() => {
                                        this.logger.info(this.lib, func, 'END');
                                        resolve();
                                    });
                                } else {
                                    resolve(); //just end.
                                    this.logger.info(this.lib, func, 'END');
                                    return;
                                }
                            }
                            
                            if(okayToCommit){
                                let body:any = {};
                                body[contentField] = newContent;
                                this.logger.info(this.lib, func, 'Posting record back to SN!');
                                if(fs.existsSync(serverTempFilePath)){
                                    fs.unlinkSync(serverTempFilePath);
                                }
                                return client.updateRecord(fileConfig.table, fileConfig.sys_id, body).then((response:any) =>{
                                    this.logger.info(this.lib, func, 'Response from file save:', response);
                                    resolve();
                                    this.logger.info(this.lib, func, 'END');
                                });
                            }
                        });
                    }     
                }
            }));
            //end of Wait Until
            this.logger.info(this.lib, func, 'END');
        });

        this.logger.info(this.lib, func, 'END');
    }
}

export class SNSyncedFile {
    fsPath:string = "";
    table:string = "";
    sys_id:string = "";
    content_field:string = "";
    sys_scope:string = "";
    sys_package:string = "";
    
    constructor(fsPath:string, instanceName:string, snTableField:snTableField, snRecordObj:any){
        this.fsPath = fsPath;
        this.table = snTableField.table;
        this.sys_id = snRecordObj.sys_id;
        this.content_field = snTableField.name;
        this.sys_scope = snRecordObj['sys_scope.scope'];
        this.sys_package = snRecordObj.sys_package || "";
    }
}