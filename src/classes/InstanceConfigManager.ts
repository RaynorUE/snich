import { RESTClient } from './RESTClient';
import { SystemLogHelper } from './LogHelper';
import { InstanceData, SNApplication, InstanceConnectionData, snDefaultTables } from '../myTypes/globals';
import { WorkspaceManager } from './workspaceManager';
import * as vscode from 'vscode';

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
    
    private instanceData:InstanceDataObj;
    private logger:SystemLogHelper;
    private lib:string = "InstanceManager";
    private wsManager:WorkspaceManager;
    private wsFolders:Array<vscode.WorkspaceFolder>;
    
    constructor(instanceData?:InstanceDataObj, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START', );
        
        this.wsManager = new WorkspaceManager(logger);
        this.wsFolders = vscode.workspace.workspaceFolders || [];
        this.instanceData = instanceData || new InstanceDataObj(); 
        
        this.logger.info(this.lib, func, 'END');
        
    }
    
    /**
    * Setup a new instance. 
    */
    setupNew(instanceList:Array<InstanceData>){
        let func = 'setup';
        this.logger.info(this.lib, func, 'START', );
        
        this.logger.info(this.lib, func, 'Asking for instance name.');
        return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Instance Name",ignoreFocusOut:false})
        .then((enteredValue) =>{
            this.logger.info(this.lib, func, 'Value entered:', {enteredValue:enteredValue});
            //if we get a url, strip down to instance name..
            if(enteredValue){
                this.instanceData.name = enteredValue.replace(/https:\/\/|http:\/\/|.service-now.com|\//g, '');
            } else {
                this.instanceData.name = "";
                return false;
            }

            if(this.checkInstanceLoaded(this.instanceData.name, instanceList)){
                vscode.window.showErrorMessage(`${this.instanceData.name} is already configured and loaded into the workspace.`);
                return false;
            }

            this.setURL(enteredValue || "");
            this.logger.info(this.lib, func, 'Name and URL Set.', this.instanceData);
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
                this.instanceData.connection.auth.type = authType;
                if(authType === "basic"){
                    this.logger.info(this.lib, func, 'All data gathered. Finalized instanceData:', this.instanceData);
                    return this.gatherBasicAuth();
                } else if(authType === 'oauth'){
                    this.logger.info(this.lib, func, 'All data gathered. Finalized instanceData:', this.instanceData);
                    return this.gatherOAuth();
                }
            }
            return false;
        }).then((authGathered) =>{
                this.logger.info(this.lib, func, 'Setting up REST client. About to test connection! AuthGathered:', {authGathered:authGathered});
                if(authGathered){
                    var client = new RESTClient(this.instanceData);
                    return client.testConnection();
                }
                return false;
        }).then((testSuccess) =>{
            this.logger.info(this.lib, func, 'Test connection result: ', testSuccess);
            
            var wsFolderRoot = this.wsFolders[0].uri;
            
            if(testSuccess){
                let instanceFSPath =  wsFolderRoot + '/' + this.instanceData.name;
                this.instanceData.path = vscode.Uri.parse(instanceFSPath);
                this.logger.info(this.lib, func, 'Setting up new config on filesystem', );
                this.wsManager.setupNewInstance(this.instanceData);
                this.instanceData.setupComplete = true;
                return true;
            } else {
                return false;
            }
        }).then(() => {
            this.logger.info(this.lib, func, 'END');
            return this.instanceData;
            //end of setup, perform any other cleanup in this function.
        });
        
    }
    
    setURL(url:string){
        if(url.indexOf('http') > -1){
            //we were given a full url path, use it. 
            this.instanceData.connection.url = url.replace(/\/$/, ''); //replace trailing slash if it exists..
        } else {
            if(url.indexOf('service-now.com') === -1){
                //if service-now.com isn't in there; add it.. this is just incase we get partial value..
                url = url + '.service-now.com';
            }
            this.instanceData.connection.url = 'https://' + url.replace(/\/$/, '');
        }
    }
    
    gatherBasicAuth():Promise<any>{
        let func = 'gatherBasicAuth';
        return new Promise((resolve, reject) =>{
            vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter User Name",ignoreFocusOut:true}).then((username) =>{
                this.instanceData.connection.auth.username = username || "";
                if(!username){
                    this.logger.info(this.lib, func, 'No Username provided. Resolving false.');
                    resolve(false);
                    return;
                }
                return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Password",password:true,ignoreFocusOut:true});
            }).then((password) =>{
                this.instanceData.connection.auth.password = password || "";
                if(!password){
                    this.logger.info(this.lib, func, 'No password provided. Resolving false', );
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }
    
    gatherOAuth():Promise<any>{
        return new Promise((resolve, reject) =>{
            vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID",ignoreFocusOut:true}).then((clientID) =>{
                this.instanceData.connection.auth.OAuth.client_id = clientID || "";
                
                return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret"});
                
            }).then((clientSecret) =>{
                this.instanceData.connection.auth.OAuth.client_secret = clientSecret || "";
                if(!clientSecret){
                    resolve(false);
                    return;
                }
                return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Usename (You will be prompted for PW on first connection attempt).",ignoreFocusOut:true});
            }).then((username) =>{
                this.instanceData.connection.auth.username = username || "";
                if(!username){
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }
    
    checkInstanceLoaded(instanceName:string, instanceList:Array<InstanceData>){
        var instanceExists = false;
        if(instanceList.length > 0){
            instanceList.forEach((instance) =>{
                if(instance.name === instanceName){
                    instanceExists = true;
                }
            });
        }
        return instanceExists;
    }
}

export class InstanceDataObj {
    name:string;
    path:vscode.Uri;
    applications:Array<SNApplication>;
    connection:InstanceConnectionData;
    tableConfig:snDefaultTables;
    setupComplete = false;
    
    constructor(){
        this.name ="";
        this.path = vscode.Uri.parse("");
        this.applications = [];
        this.tableConfig = {
            tables: []
        };
        this.connection = {
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
        };
    }
}
