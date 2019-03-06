import { RESTClient } from './RESTClient';
import { SystemLogHelper } from './LogHelper';
import { SNApplication, InstanceConnectionData, SNQPItem } from '../myTypes/globals';
import { WorkspaceManager, SNSyncedFile } from './WorkspaceManager';
import * as vscode from 'vscode';
import { InstanceTableConfig } from './SNDefaultTables';

export class InstancesList {
    private instances: Array<InstanceMaster> = [new InstanceMaster()];
    private lastSelected: InstanceMaster = new InstanceMaster();
    private logger:SystemLogHelper = new SystemLogHelper();
    
    constructor(logger?:SystemLogHelper){
        if(logger){
            this.logger = logger;
        }
    }
    
    addInstance(instance:InstanceMaster){
        let wsManager = new WorkspaceManager(this.logger);
        wsManager.setupNewInstance(instance);
        instance.setupComplete = true;
        this.instances.push(instance);
    }
    
    setLastSelected(instance:InstanceMaster){
        this.lastSelected = instance;
    }
    
    getLastSelected(instance:InstanceMaster){
        return this.lastSelected;
    }

    getInstance(name:string){
        let foundInstance = undefined;
        this.instances.forEach((instance, index) =>{
            if(instance.config.name === name){
                foundInstance = instance;
                index = this.instances.length;
            }
        });
        return foundInstance;
    }
    
    async selectInstance(){
        let qpItems: Array<SNQPItem> = [];
        let selectedInstance = undefined;
        
        if(this.instances.length === 0){
            vscode.window.showErrorMessage('No instances configured. Please setup a new instance.');
            return selectedInstance;
        }
        
        if(this.lastSelected.config.name !== ''){
            //if we have a lastSelected instance config name.
            qpItems.push({ "label": this.lastSelected.config.name, "detail": "Instance URL: " + this.lastSelected.config.connection.url, value: this.lastSelected });
        }
        this.instances.forEach((instance) => {
            if(instance.config.name !== this.lastSelected.config.name){
                qpItems.push({ "label": instance.config.name, "detail": "Instance URL: " + instance.config.connection.url, value: instance });
            }
        });
        
        let instanceSelect = await vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{ placeHolder: "Select a Configured ServiceNow Instance.", ignoreFocusOut: true, matchOnDetail: true, matchOnDescription: true })
        
        if(instanceSelect){
            selectedInstance = instanceSelect.value;
            this.setLastSelected(selectedInstance);
        } 
        
        return selectedInstance;
    }
    
}

/**
* The InstanceManager class is intended for managing and updating information regarding Instance Configuration.
* Used For
*  - Setting up a new instance from scratch.
*  - Updating Authentication and Connction Information for a given instance. 
* Not Used For
*  - Managing / Retrieving Records from an instance. 
* 
* @param instanceList
* @param logger
*/
export class InstanceConfigManager {
    
    private instance:InstanceMaster;
    private logger:SystemLogHelper;
    private lib:string = "InstanceManager";
    private wsManager:WorkspaceManager;
    
    constructor(instance?:InstanceMaster, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START', );
        
        this.wsManager = new WorkspaceManager(logger);
        this.instance = instance || new InstanceMaster(); 
        
        this.logger.info(this.lib, func, 'END');
        
    }
    
    /**
    * Setup a new instance. 
    */
    async setupNew(instanceList:InstancesList){
        let func = 'setup';
        this.logger.info(this.lib, func, 'START', );
        
        let instanceMaster = new InstanceMaster();
        
        let enteredInstanceValue = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Instance Name",ignoreFocusOut:false});
        if(!enteredInstanceValue){
            vscode.window.showWarningMessage('Instance configuration aborted or no name entered.');
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
        //get just the subdomain part if a full URL was entered.
        let instanceName = enteredInstanceValue.replace(/https:\/\/|http:\/\/|.service-now.com|\//g, '');
        
        if(instanceList.getInstance(instanceName)){
            vscode.window.showErrorMessage(`${instanceName} is already configured and loaded into the workspace.`);
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }
        
        //met all our fail checks, continue setting up...
        instanceMaster.setName(instanceName);
        instanceMaster.setURL(enteredInstanceValue);
        
        let authOptions = <Array<SNQPItem>>[ 
            {label:"Basic",description:"Use basic authentication. Password stored un-encrypted.", value:"basic"}, 
            {label:"OAuth",description:"Use OAuth to authenticate. More Secure as PW is not stored.", value:"oauth"}
        ]

        let authSelection = await vscode.window.showQuickPick(authOptions, <vscode.QuickPickOptions>{placeHolder:"Select an authentcation option",ignoreFocusOut:true});

        if(!authSelection){
            vscode.window.showWarningMessage('Instance configuration aborted. No auth type selected.');
            this.logger.info(this.lib, func, 'END');
            return undefined;
        }

        if(authSelection.value === 'basic'){
            let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter User Name",ignoreFocusOut:true});
            let password = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Password",password:true,ignoreFocusOut:true});

            if(!username || !password){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all Auth Details not provided.');
                return undefined;
            }

            let buff = Buffer.from(password);
            let base64data = buff.toString('base64');
            instanceMaster.config.connection.auth.password = base64data || "";
            instanceMaster.config.connection.auth.username = username;

        } else if(authSelection.value === 'oauth'){
            let clientID = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID",ignoreFocusOut:true});
            let clientSecret = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret"});
            let username = await vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Usename (You will be prompted for PW on first connection attempt).",ignoreFocusOut:true});

            if(!clientID || !clientSecret || !username){
                vscode.window.showWarningMessage('Instance confugration aborted. One or all Auth Details not provided.');
                return undefined;
            }

            instanceMaster.config.connection.auth.OAuth.client_id = clientID;
            instanceMaster.config.connection.auth.OAuth.client_secret = clientSecret;
            instanceMaster.config.connection.auth.username = username;

            let client = new RESTClient(instanceMaster.config);
            let testResult = await client.testConnection();
            if(testResult){
                instanceList.addInstance(instanceMaster);
                return true;
            } else {
                vscode.window.showErrorMessage('Instance Configuration Failed. Please attempt to setup new instance again. See log for details.');
                return undefined;
            }
        }
        this.logger.info(this.lib, func, 'END');
        
    }

}

export class InstanceChooser {
    instanceList:Array<InstanceMaster>;
    
    constructor(instanceList:Array<InstanceMaster>){
        this.instanceList = instanceList;
    }
    
    getInstance(){
        let instance:InstanceMaster = new InstanceMaster();
        return new Promise((resolve, reject) => {
            let qpItems = <Array<SNQPItem>>[];
            this.instanceList.forEach((instance) => {
                qpItems.push({"label":instance.config.name, "detail":"Instance URL: " + instance.config.connection.url, value:instance });
            });
            return vscode.window.showQuickPick(qpItems, <vscode.QuickPickOptions>{placeHolder:"Select instance to test connection", ignoreFocusOut:true, matchOnDetail:true, matchOnDescription:true})
            .then((selectedInstance) =>{
                if(selectedInstance){
                    instance = selectedInstance.value;
                }
                resolve(instance);
            });
        });
    }
}

export class InstanceMaster {
    
    applications:Array<SNApplication>;
    tableConfig:InstanceTableConfig;
    syncedFiles:Array<SNSyncedFile>;
    config:InstanceConfig;
    setupComplete:boolean = false;
    lastSelected:boolean = false;
    
    
    constructor(){
        this.applications = [];
        this.tableConfig = new InstanceTableConfig();
        this.syncedFiles = [];
        
        this.config = {
            name: "",
            configPath: "",
            rootPath: "",
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
    
    setName(name:string){
        this.config.name = name;
    }
    
    setURL(url:string){
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
    }
}

export interface InstanceConfig {
    name:string;
    configPath:string;
    connection:InstanceConnectionData;
    rootPath:string;
}