import { RESTClient } from './RESTClient';
import { SystemLogHelper } from './LogHelper';
import { SNApplication, InstanceConnectionData } from '../myTypes/globals';
import { WorkspaceManager, SNSyncedFile } from './WorkspaceManager';
import * as vscode from 'vscode';
import { SNDefaultTables } from './SNDefaultTables';

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
    setupNew(instanceList:Array<InstanceMaster>){
        let func = 'setup';
        this.logger.info(this.lib, func, 'START', );
        
        this.logger.info(this.lib, func, 'Asking for instance name.');
        return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Instance Name",ignoreFocusOut:false})
        .then((enteredValue) =>{
            this.logger.info(this.lib, func, 'Value entered:', {enteredValue:enteredValue});
            //if we get a url, strip down to instance name..
            if(enteredValue){
                this.instance.config.name = enteredValue.replace(/https:\/\/|http:\/\/|.service-now.com|\//g, '');
            } else {
                this.instance.config.name = "";
                return false;
            }

            if(this.checkInstanceLoaded( this.instance.config.name, instanceList)){
                vscode.window.showErrorMessage(`${ this.instance.config.name} is already configured and loaded into the workspace.`);
                return false;
            }

            this.setURL(enteredValue || "");
            this.logger.info(this.lib, func, 'Name and URL Set.',  this.instance.config);
            var quickPickItems = <Array<any>>[
                {label:"Basic",description:"Use basic authentication.", value:"basic"}, 
                {label:"OAuth",description:"Use OAuth to authenticate. More Secure as PW is not stored.", value:"oauth"}
            ];
            this.logger.info(this.lib, func, 'About to ask for auth type.');
            return vscode.window.showQuickPick(quickPickItems, <vscode.QuickPickOptions>{placeHolder:"Select an authentcation option",ignoreFocusOut:true});
        }).then((selectedAuth) =>{
            this.logger.info(this.lib, func, 'Selected auth:', {selectedAuth:selectedAuth});
            
            if(selectedAuth && selectedAuth.value){
                let authType = selectedAuth.value;
                 this.instance.config.connection.auth.type = authType;
                if(authType === "basic"){
                    this.logger.info(this.lib, func, 'All data gathered. Finalized instanceData:',  this.instance.config);
                    return this.gatherBasicAuth();
                } else if(authType === 'oauth'){
                    this.logger.info(this.lib, func, 'All data gathered. Finalized instanceData:',  this.instance.config);
                    return this.gatherOAuth();
                }
            }
            return false;
        }).then((authGathered) =>{
                this.logger.info(this.lib, func, 'Setting up REST client. About to test connection! AuthGathered:', {authGathered:authGathered});
                if(authGathered){
                    var client = new RESTClient( this.instance.config);
                    return client.testConnection();
                }
                return false;
        }).then((testSuccess) =>{
            this.logger.info(this.lib, func, 'Test connection result: ', testSuccess);
            
            if(testSuccess){
                this.logger.info(this.lib, func, 'Setting up new config on filesystem', );
                this.instance = this.wsManager.setupNewInstance(this.instance);
                this.instance.setupComplete = true;
                return true;
            } else {
                return false;
            }
        }).then(() => {
            this.logger.info(this.lib, func, 'END');
            return  this.instance;
            //end of setup, perform any other cleanup in this function.
        });
        
    }
    
    private setURL(url:string){
        if(url.indexOf('http') > -1){
            //we were given a full url path, use it. 
             this.instance.config.connection.url = url.replace(/\/$/, ''); //replace trailing slash if it exists..
        } else {
            if(url.indexOf('service-now.com') === -1){
                //if service-now.com isn't in there; add it.. this is just incase we get partial value..
                url = url + '.service-now.com';
            }
             this.instance.config.connection.url = 'https://' + url.replace(/\/$/, '');
        }
    }
    
    private gatherBasicAuth():Promise<any>{
        let func = 'gatherBasicAuth';
        return new Promise((resolve, reject) =>{
            vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter User Name",ignoreFocusOut:true}).then((username) =>{
                 this.instance.config.connection.auth.username = username || "";
                if(!username){
                    this.logger.info(this.lib, func, 'No Username provided. Resolving false.');
                    resolve(false);
                    return;
                }
                return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Password",password:true,ignoreFocusOut:true});
            }).then((password) =>{

                if(password){
                    let buff = Buffer.from(password);
                    let base64data = buff.toString('base64');
                     this.instance.config.connection.auth.password = base64data || "";
                    resolve(true);

                } else {
                    this.logger.info(this.lib, func, 'No password provided. Resolving false', );
                    resolve(false);
                    return;
                }
            });
        });
    }
    
    private gatherOAuth():Promise<any>{
        return new Promise((resolve, reject) =>{
            vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID",ignoreFocusOut:true}).then((clientID) =>{
                 this.instance.config.connection.auth.OAuth.client_id = clientID || "";
                
                return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret"});
                
            }).then((clientSecret) =>{
                 this.instance.config.connection.auth.OAuth.client_secret = clientSecret || "";
                if(!clientSecret){
                    resolve(false);
                    return;
                }
                return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Usename (You will be prompted for PW on first connection attempt).",ignoreFocusOut:true});
            }).then((username) =>{
                 this.instance.config.connection.auth.username = username || "";
                if(!username){
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }
    
    private checkInstanceLoaded(instanceName:string, instanceList:Array<InstanceMaster>){
        var instanceExists = false;
        if(instanceList.length > 0){
            instanceList.forEach((instance) =>{
                if(instance.config.name === instanceName){
                    instanceExists = true;
                }
            });
        }
        return instanceExists;
    }
}

export class InstanceMaster {

    applications:Array<SNApplication>;
    tableConfig:SNDefaultTables;
    syncedFiles:Array<SNSyncedFile>;
    config:InstanceConfig;
    setupComplete = false;

    
    constructor(){
        this.applications = [];
        this.tableConfig = new SNDefaultTables();
        this.syncedFiles = [];

        this.config = {
            name: "",
            fsPath: "",
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
}

export interface InstanceConfig {
    name:string;
    fsPath:string;
    connection:InstanceConnectionData;
}