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
    

    getInstance(name:string):InstanceMaster{
        let foundInstance = new InstanceMaster();
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
        let selectedInstance = new InstanceMaster();
        
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
        
        if(existingInstance.getName()){
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
            {label:"OAuth (Preferred)", description:"Use OAuth to authenticate. SNICH never sees your username or password.", value:"oauth-authorization_code"},
            {label:"OAuth (Legacy)",description:"Use OAuth to authenticate. SNICH sees your PW but we do not store.", value:"oauth"},
        ];
        
        let authSelection = await vscode.window.showQuickPick(authOptions, <vscode.QuickPickOptions>{placeHolder:"Select an authentcation option",ignoreFocusOut:true});
        
        if(!authSelection){
            vscode.window.showWarningMessage('Instance configuration aborted. No auth type selected.');
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
        this.logger.info(this.lib, func, 'Auth selection', authSelection);
        
        if(authSelection.value === 'basic'){

            let basicCredAsk = await instanceMaster.askForBasicAuth();

            if(!basicCredAsk){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all Basic Auth Details not provided.');
                return undefined;
            }
            
        } else if(authSelection.value === 'oauth'){

            let oauthCredAsk = await instanceMaster.askForOauth();
            if(!oauthCredAsk){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all OAuth Details not provided.');
                return undefined;
            }

        } else if(authSelection.value === 'oauth-authorization_code'){
            let oauthCodeFlowCredAsk = await instanceMaster.askForOAuthAuthCodeFlow();
            if(!oauthCodeFlowCredAsk){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all OAuth Details not provided.');
                return undefined;
            }
        }

        let client = new RESTClient(instanceMaster);
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
    
    tableConfig:ConfiguredTables;
    syncedFiles:SyncedFiles;
    settings:InstanceSettings = new InstanceSettings();
    private config:InstanceConfig;
    private logger:SystemLogHelper =  new SystemLogHelper();
    private lib = "InstanceMaster";
    
    constructor(logger?:SystemLogHelper){
        if(logger){
            this.logger = logger;
        }

        this.syncedFiles = new SyncedFiles(this.logger);

        this.tableConfig = new ConfiguredTables();
        this.config = {
            name: "",
            rootPath: "",
            applications: [],
            configPath: "",
            connection : {
                url:"",
                auth: {
                    type:"",
                    username:"",
                    password:"",
                    writeBasicToDisk:true,
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
        let func = 'setName';
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
        let pw = '';
        if(this.config.connection.auth.password){
            let buff = Buffer.from(this.config.connection.auth.password, "base64");
            pw = buff.toString('ascii');
            
        }
        return pw;
    }

    addApplication(name:string, sys_id:string, sys_scope:string, fsPath:string){
        var func = 'addApplication';
        this.logger.info(this.lib, func, "START");

        //account for old config files.
        if(!this.config.applications){
            this.config.applications = [];
        }

        let incomingApp:SNApplication = {
            name: name,
            sys_id: sys_id,
            sys_scope:sys_scope,
            fsPath:fsPath
        }

        let addIt = true;
        this.config.applications.forEach(application => {
            if(application.sys_id == incomingApp.sys_id){
                addIt = false;
            }
        })

        if(addIt){
            this.config.applications.push(incomingApp);
            new WorkspaceManager(this.logger).writeInstanceConfig(this);
        }

        this.logger.info(this.lib, func, "END");
        return incomingApp;
    }

    getApplicationById(sys_id:string):SNApplication | undefined{
        var func = "getApplicationById";
        this.logger.info(this.lib, func, "START");
        //account for old config files.
        if(!this.config.applications){
            this.config.applications = [];
        }

        let res = undefined;

        this.config.applications.forEach(application => {
            if(application.sys_id == sys_id){
                res = application;
            }
        })

        this.logger.info(this.lib, func, "END");
        return res;
    }

    /**
     * checks to see if stored app FSPath is within the incoming fsPath
     * @param fsPath The fsPath to see if we have a matching app for it
     */
    getApplicationByPath(fsPath:string):SNApplication | undefined{
        let func = "getApplicationByPath";
        this.logger.info(this.lib, func, "START");

        //account for old config files.
        if(!this.config.applications){
            this.config.applications = [];
        }

        let res = undefined;

        this.config.applications.forEach(application => {
            if(fsPath.indexOf(application.fsPath) > -1){
                res = application;
            }
        })

        this.logger.info(this.lib, func, "END");

        return res;

    }

    getUserName(){
        return this.config.connection.auth.username;
    }

    setClientSecret(secret:string){
        this.config.connection.auth.OAuth.client_secret = secret;

    }

    setClientId(id:string){
        this.config.connection.auth.OAuth.client_id = id;
    }
    

    async askForBasicAuth():Promise<boolean> {
        let func = 'askForBasicAuth';
        this.logger.info(this.lib, func, "START");

        let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter User Name (1/2)",ignoreFocusOut:true});
        let password = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Password (2/2)",password:true,ignoreFocusOut:true});
            
        if(!username || !password){
            return false;
        }

        this.setAuthType('basic');
        this.setWriteToDisk(true);
        this.setUserName(username);
        this.setPassword(password);
        

        this.logger.info(this.lib, func, "END");
        return true;
    }

    async askForOauth():Promise<boolean> {
        var func = 'askForOauth';
        this.logger.info(this.lib, func, 'START');
        
        let clientID = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID (1/3)",ignoreFocusOut:true});
        let clientSecret = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret (2/3)", ignoreFocusOut:true});
        let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Usename (3/3).",ignoreFocusOut:true});
        
        if(!clientID || !clientSecret || !username){
            return false;
        }

        this.setAuthType('oauth');
        this.setWriteToDisk(false);

        this.setClientId(clientID);
        this.setClientSecret(clientSecret);
        this.setUserName(username);
        this.logger.info(this.lib, func, 'END');
        return true;
    }

    async askForOAuthAuthCodeFlow():Promise<boolean> {
        let func = 'askForOAuthAuthCodeFlow';
        this.logger.info(this.lib, func, 'START');
        
        let launchChoices:Array<vscode.QuickPickItem> = [
            {
                label:"Create New",
                description: "Launch browser directly to form pre-filled with necessary bits on: " + this.getURL()
            }, 
            { 
                label:"View Existing",
                description:"I have an existing App Registry. Launch My browser directly to list of OAuth App Registrations." 
            },
            {
                label:"I'm good.",
                description: "I Have already setup an OAuth Application Registry and I have my Client ID and Client Secret handy."
            }
        ]

        let launchToOAuthAppRegistry = await vscode.window.showQuickPick(launchChoices, {ignoreFocusOut:true, placeHolder:`OAuth Application Registry on ${this.getURL()}?`});

        if(!launchToOAuthAppRegistry || !launchToOAuthAppRegistry.label){
            this.logger.info(this.lib, func, "END");
            return false;
        }

        if(launchToOAuthAppRegistry.label == 'Create New'){
            let newAppQueryParams = 'sys_id=-1&sysparm_query=type=client^redirect_url=http://localhost:62000/snich_oauth_redirect^name=VSCode%20S.N.I.C.H.%20Users^logo_url=https://github.com/RaynorUE/snich/blob/master/images/icon-sn-oauth.PNG'; //?raw=true'
            let appRegURL = vscode.Uri.parse(`${this.getURL()}/oauth_entity.do?${newAppQueryParams}`, true);
            vscode.env.openExternal(appRegURL)
        }

        if(launchToOAuthAppRegistry.label == 'View Existing'){
            let queryParams = 'sysparm_query=type=client';
            let appRegURL = vscode.Uri.parse(`${this.getURL()}/oauth_entity_list.do?${queryParams}`, true);
            vscode.env.openExternal(appRegURL)
        }

        let clientID = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID (1/2)",ignoreFocusOut:true});
        let clientSecret = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret (2/2)", ignoreFocusOut:true});
        
        if(!clientID || !clientSecret){
            return false;
        }

        this.setAuthType('oauth-authorization_code');
        this.setWriteToDisk(false);
        this.setClientId(clientID);
        this.setClientSecret(clientSecret);
        this.logger.info(this.lib, func, 'END');
        return true;
    }


    /**
     * Ask for just the password and set internally. Based on auth type will save to disk or not.
     */
    async askForPassword(prompt?:string):Promise<boolean> {
        var func = 'askForPassword';
        this.logger.info(this.lib, func, "START");

        if(!prompt){
            prompt = `Enter Local SN password for ${this.getUserName()} (If oAuth we will only store password for VSCode session):`
        }

        let password = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:prompt,password:true,ignoreFocusOut:true});
        
        this.setPassword(password || "");

        if(!password){
            vscode.window.showWarningMessage('Did not recieve password. Aborting.');
            return false;
        }

        this.logger.info(this.lib, func, "END");
        return true;
    }

        /**
     * Ask for just the password and set internally. Based on auth type will save to disk or not.
     */
    async askForUsername(prompt?:string):Promise<boolean> {
        var func = 'askForUsername';
        this.logger.info(this.lib, func, "START");

        if(!prompt){
            prompt = `Enter Local SN username for ${this.getURL()} (If oAuth we will only store username for VSCode session):`
        }

        let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:prompt,ignoreFocusOut:true});
        
        this.setUserName(username || "");

        if(!username){
            vscode.window.showWarningMessage('Did not recieve username. Aborting.');
            return false;
        }

        this.logger.info(this.lib, func, "END");
        return true;
    }

    //
    private setWriteToDisk(flag:boolean){
        this.config.connection.auth.writeBasicToDisk = flag;
    }

    private setAuthType(authType:string){
        this.config.connection.auth.type = authType;
    }

    getAuthType(){
        return this.config.connection.auth.type;
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
    
    
    getUniqueAppScopes():Array<{label:string,sys_id:string}> {

        let appScopes:Array<{label:string,sys_id:string}> = [];

        this.syncedFiles.syncedFiles.forEach((syncedFile) =>{

            let addScope = true;
            appScopes.forEach((existingScope) =>{
                if(existingScope.sys_id == syncedFile.sys_package){
                    addScope = false;
                }
            })

            if(addScope){
                appScopes.push({label:syncedFile.sys_scope.toString(), sys_id:syncedFile.sys_package});
            }
        })

        return appScopes; 
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
            if(file.fsPath == fsPath){
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
    applications:Array<SNApplication>;
}

export class InstanceSettings {
    
    settings = {
        backgroundScripts: {
            alwaysAskWhenNoHighlight: true

        }
    }

    constructor(){
    }

    setBSScriptAlwaysAsk(flag:boolean){
        this.getBSScriptSettings().alwaysAskWhenNoHighlight = flag;
    }

    getBSScriptSettings(){
        return this.settings.backgroundScripts;
    }
}