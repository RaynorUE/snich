import { RESTClient } from './RESTClient';
import { SystemLogHelper } from './LogHelper';
import { SNApplication, InstanceConnectionData, SNQPItem, snTableField } from '../myTypes/globals';
import { WorkspaceManager} from './WorkspaceManager';
import * as vscode from 'vscode';
import { ConfiguredTables } from './SNDefaultTables';

export class InstancesList {
    private instances: Array<InstanceMaster> = [];
    private lastSelected: InstanceMaster = new InstanceMaster();
    private logger:SystemLogHelper = new SystemLogHelper();
    private lib = "InstancesList";
    
    constructor(logger?:SystemLogHelper){
        if(logger){
            this.logger = logger;
        }
    }
    
    
    addInstance(instance:InstanceMaster){
        this.instances.push(instance);
    }
    
    setLastSelected(instance:InstanceMaster){
        this.lastSelected = instance;
    }
    
    getLastSelected(instance:InstanceMaster){
        return this.lastSelected;
    }
    
    getInstance(name:string){
        let foundInstance = <InstanceMaster>{};
        this.instances.forEach((instance, index) =>{
            if(instance.getName() === name){
                foundInstance = instance;
                index = this.instances.length;
            }
        });
        return foundInstance;
    }
    
    getInstances(){
        return this.instances;
    }
    
    atLeastOneConfigured(){
        if(this.instances.length === 0){
            vscode.window.showErrorMessage('No instances configured. Please execute Setup New Instance command.', 'Setup New Instance').then((clickedItem) =>{
                if(clickedItem && clickedItem === 'Setup New Instance'){
                    vscode.commands.executeCommand('snich.setup.new_instance');
                }
            });
            return false;
        } else {
            return true;
        }
    }
    
    async selectInstance(){
        let qpItems: Array<SNQPItem> = [];
        let selectedInstance = undefined;
        
        if(this.instances.length === 0){
            vscode.window.showErrorMessage('No instances configured. Please setup a new instance.');
            return selectedInstance;
        }
        
        if(this.instances.length === 1){
            //only one instance configured. Just return it. 
            return this.instances[0];
        }
        
        if(this.lastSelected.getName() !== ''){
            //if we have a lastSelected instance config name.
            qpItems.push({ "label": this.lastSelected.getName(), "detail": "Instance URL: " + this.lastSelected.getURL(), value: this.lastSelected });
        }
        this.instances.forEach((instance) => {
            if(instance.getName() !== this.lastSelected.getName()){
                qpItems.push({ "label": instance.getName(), "detail": "Instance URL: " + instance.getURL(), value: instance });
            }
        });
        
        let instanceSelect = await vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{ placeHolder: "Select a Configured ServiceNow Instance.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true });
        
        if(instanceSelect){
            selectedInstance = instanceSelect.value;
            this.setLastSelected(selectedInstance);
        } 
        
        return selectedInstance;
    }
    
    /**
    * Setup a new Instance and add it to the instance list.
    */
    async setupNew(){
        let func = 'setupNew';
        this.logger.info(this.lib, func, 'START', );
        
        let instanceMaster = new InstanceMaster();
        
        let enteredInstanceValue = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Instance Name",ignoreFocusOut:true});
        if(!enteredInstanceValue){
            vscode.window.showWarningMessage('Instance configuration aborted or no name entered.');
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
        //get just the subdomain part if a full URL was entered.
        let instanceName = enteredInstanceValue.replace(/https:\/\/|http:\/\/|.service-now.com|\//g, '');
        let existingInstance = this.getInstance(instanceName);
        
        if(existingInstance.getName){
            vscode.window.showErrorMessage(`${instanceName} is already configured and loaded into the workspace.`);
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
        this.logger.info(this.lib, func, 'Instance name:', instanceName);
        
        //met all our fail checks, continue setting up...
        instanceMaster.setName(instanceName);
        instanceMaster.setURL(enteredInstanceValue);
        
        let authOptions = <Array<SNQPItem>>[ 
            {label:"Basic",description:"Use basic authentication. Password stored un-encrypted.", value:"basic"}, 
            {label:"OAuth",description:"Use OAuth to authenticate. More Secure as PW is not stored.", value:"oauth"}
        ];
        
        let authSelection = await vscode.window.showQuickPick(authOptions, <vscode.QuickPickOptions>{placeHolder:"Select an authentcation option",ignoreFocusOut:true});
        
        if(!authSelection){
            vscode.window.showWarningMessage('Instance configuration aborted. No auth type selected.');
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
        this.logger.info(this.lib, func, 'Auth selection', authSelection);
        
        if(authSelection.value === 'basic'){
            let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter User Name",ignoreFocusOut:true});
            let password = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Password",password:true,ignoreFocusOut:true});
            
            if(!username || !password){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all Auth Details not provided.');
                return undefined;
            }
            instanceMaster.setBasicAuth(username, password);
            
        } else if(authSelection.value === 'oauth'){
            let clientID = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID",ignoreFocusOut:true});
            let clientSecret = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret"});
            let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Usename (You will be prompted for PW on first connection attempt).",ignoreFocusOut:true});
            
            if(!clientID || !clientSecret || !username){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all OAuth Details not provided.');
                return undefined;
            }
            instanceMaster.setOAuth(clientID, clientSecret);
            instanceMaster.setUserName(username);
        }
        let client = new RESTClient(instanceMaster.getConfig());
        let testResult = await client.testConnection();
        
        if(testResult){
            this.addInstance(instanceMaster);
            let wsManager = new WorkspaceManager(this.logger);
            wsManager.setupNewInstance(instanceMaster);
            this.logger.info(this.lib, func, 'END');
            return true;
        } else {
            vscode.window.showErrorMessage('Instance Configuration Failed. Please attempt to setup new instance again. See log for details.');
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
    }
}

export class InstanceMaster {
    
    applications:Array<SNApplication>;
    tableConfig:ConfiguredTables;
    syncedFiles:SyncedFiles = new SyncedFiles();
    private config:InstanceConfig;
    private logger:SystemLogHelper =  new SystemLogHelper();
    private lib = "InstanceMaster";
    
    constructor(logger?:SystemLogHelper){
        if(logger){
            this.logger = logger;
        }
        this.applications = [];
        this.tableConfig = new ConfiguredTables();
        this.config = {
            name: "",
            rootPath: "",
            configPath: "",
            connection : {
                url:"",
                auth: {
                    type:"",
                    username:"",
                    password:"",
                    OAuth: {
                        client_id: "",
                        client_secret: "",
                        lastRetrieved: 0,
                        token: {
                            access_token:"",
                            expires_in: 0,
                            refresh_token:"",
                            scope:"",
                            token_type:""
                        }
                    }
                }
            }
        };
    }

    getSyncedFiles(){
        return this.syncedFiles;
    }
    
    setName(name:string){
        let func = 'funcName';
        this.logger.info(this.lib, func, 'START', );
        this.config.name = name;
        
        this.logger.info(this.lib, func, 'END');
    }
    
    getName(){
        return this.config.name;
    }
    
    setUserName(username:string){
        this.config.connection.auth.username = username;
    }
    
    setPassword(password:string){
        let buff = Buffer.from(password);
        let base64data = buff.toString('base64');
        this.config.connection.auth.password = base64data || "";
    }
    
    getPassword(){
        let buff = Buffer.from(this.config.connection.auth.password, "base64");
        let pw = buff.toString('ascii');
        return pw;
    }
    
    setBasicAuth(username:string, password:string){
        this.setUserName(username);
        this.setPassword(password);
        this.config.connection.auth.type = 'basic';
    }
    
    setOAuth(client_id:string, client_secret:string){
        this.config.connection.auth.type = 'oauth';
        this.config.connection.auth.OAuth.client_id = client_id;
        this.config.connection.auth.OAuth.client_secret = client_secret;
    }
    
    setURL(url:string){
        let func = 'setURL';
        this.logger.info(this.lib, func, 'START', );
        
        if(url.indexOf('http') > -1){
            //we were given a full url path, use it. 
            this.config.connection.url = url.replace(/\/$/, ''); //replace trailing slash if it exists..
        } else {
            if(url.indexOf('service-now.com') === -1){
                //if service-now.com isn't in there; add it.. this is just incase we get partial value..
                url = url + '.service-now.com';
            }
            this.config.connection.url = 'https://' + url.replace(/\/$/, '');
        }
        this.logger.info(this.lib, func, 'END');
    }
    
    getURL(){
        return this.config.connection.url;
    }
    
    setConfig(config:InstanceConfig){
        this.config = config;
    }
    
    getConfig(){
        return this.config;
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
        this.fsPath = fsPath + "";
        this.table = snTableField.table + "";
        this.sys_id = snRecordObj.sys_id + "";
        this.content_field = snTableField.name + "";
        this.sys_scope = snRecordObj['sys_scope.scope'] + "";
        this.sys_package = snRecordObj.sys_package + "" || "";
    }
}

export class SyncedFiles {
    syncedFiles:Array<SNSyncedFile> = [];
    private logger:SystemLogHelper = new SystemLogHelper();
    private lib:string = "SyncedFiles";

    constructor(logger?:SystemLogHelper){
        if(logger){
            this.logger = logger;
        }
    }

    setFromConfigFile(fileData:SyncedFiles) {
        this.syncedFiles = fileData.syncedFiles;
    }

    getFileByPath(fsPath:string){
        var func = 'getFileByPath';
        this.logger.info(this.lib, func, `START`, {fsPath:fsPath, synced:this.syncedFiles});
        let fileConfig = <SNSyncedFile>{};
        this.syncedFiles.forEach((file, index) =>{
            if(file.fsPath === fsPath){
                this.logger.debug(this.lib, func, "Found file:", file);
                fileConfig = file;
                index = this.syncedFiles.length;
            }
        });
        this.logger.info(this.lib, func, `END`, {fsConfig:JSON.stringify(fileConfig)});
        return fileConfig;
    }

    getFileBySysID(sysID:string, table:string, content_field:string, syncedFile?:SNSyncedFile){
        let fileConfig = <SNSyncedFile>{};
        this.syncedFiles.forEach((file, index) =>{
            if(file.sys_id === sysID && file.table === table && file.content_field === content_field){
                if(syncedFile){
                    this.syncedFiles[index] = syncedFile;
                    fileConfig = file;
                } else {
                    fileConfig = file;
                }
                index = this.syncedFiles.length;
            }
        });
        return fileConfig;
    }

    addFile(fsPath:string, instanceName:string, snTableField:snTableField, snRecordObj:any){
        let syncedFile = new SNSyncedFile(fsPath, instanceName, snTableField, snRecordObj);
        let existingFile = this.getFileBySysID(snRecordObj.sys_id, snTableField.table, snTableField.name, syncedFile);
        if(existingFile.sys_id){
            //updated file happened in getFileBySysID;
        } else {
            //did not have synced file yet, so add it to our list.
            this.syncedFiles.push(syncedFile);
        }
    }
}

export interface InstanceConfig {
    name:string;
    configPath:string;
    rootPath:string;
    connection:InstanceConnectionData;
}