import { RESTClient } from './restclient';
import { SystemLogHelper } from './loghelper';
import { InstanceData, SNApplication, InstanceConnectionData, snDefaultTables } from '../myTypes/globals';
import { WorkspaceManager } from './workspaceManager';
import * as vscode from 'vscode';


export class InstanceManager {
    
    private instanceData:InstanceDataObj;
    private logger:SystemLogHelper;
    private lib:string = "InstanceManager";
    private wsManager:WorkspaceManager;
    private wsFolders:Array<vscode.WorkspaceFolder>;
    private instanceList:Array<InstanceData>;
    
    constructor(instanceList:Array<InstanceData>, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'constructor';
        this.logger.info(this.lib, func, 'START', );

        this.wsManager = new WorkspaceManager(logger);
        this.wsFolders = vscode.workspace.workspaceFolders || [];
        this.instanceData = new InstanceDataObj(); 
        this.instanceList = instanceList;

        this.logger.info(this.lib, func, 'END');

    }
    
    setup(){
        let func = 'setup';
        this.logger.info(this.lib, func, 'START', );

        this.logger.info(this.lib, func, 'Asking for instance name.');
        return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Instance Name",ignoreFocusOut:true}).then((value) =>{
            this.logger.info(this.lib, func, 'Value entered:', value);
            //if we get a url, strip down to instance name..
            if(value){
                this.instanceData.name = value.replace(/https:\/\/|http:\/\/|.service-now.com|\//g, '');
            } else {
                this.instanceData.name = "";
            }
            this.setURL(value || "");
            this.logger.info(this.lib, func, 'Name and URL Set.', this.instanceData);
            var quickPickItems = <Array<vscode.QuickPickItem>>[
                {label:"Basic",description:"Use basic authentication."}, 
                {label:"OAuth",description:"Use OAuth to authenticate. More Secure as PW is not stored."}
            ];
            this.logger.info(this.lib, func, 'About to ask for auth type.');
            
            return vscode.window.showQuickPick(quickPickItems, <vscode.QuickPickOptions>{placeHolder:"Select an authentcation option",ignoreFocusOut:true});
        }).then((selectedAuth) =>{
            this.logger.info(this.lib, func, 'Selected auth:', selectedAuth);
            
            var authType = "";
            if(selectedAuth){
               authType = selectedAuth.label.toLowerCase();
            }
            this.instanceData.connection.auth.type = authType;
            if(authType === "basic"){
                return this.gatherBasicAuth();
            } else if(authType === 'oauth'){
                return this.gatherOAuth();
            }
            this.logger.info(this.lib, func, 'All data gathered. Finalized instanceData:', this.instanceData);
            
        }).then(() =>{
            this.logger.info(this.lib, func, 'Setting up REST client. About to test connection!');
            
            var client = new RESTClient(this.instanceData);
            return client.testConnection();
        }).then((testSuccess) =>{
            this.logger.info(this.lib, func, 'Test connection result: ', testSuccess);
            
            var wsFolderRoot = this.wsFolders[0].uri;

            if(testSuccess){
                if(this.wsFolders.length > 1){
                    vscode.window.showWorkspaceFolderPick(<vscode.WorkspaceFolderPickOptions>{placeHolder:"Select folder to place new instance config.",ignoreFocusOut:true}).then((pickedFolder) =>{
                        if(pickedFolder){
                            wsFolderRoot = pickedFolder.uri;
                        }
                    });
                }

                var instanceFSPath =  wsFolderRoot + '/' + this.instanceData.name;
                this.instanceData.path = vscode.Uri.parse(instanceFSPath);
                if(!this.checkInstanceLoaded(this.instanceData.name)){
                    this.logger.info(this.lib, func, 'Setting up new config on filesystem', );
                    this.wsManager.setupNewInstance(this.instanceData);
                } else {
                    vscode.window.showErrorMessage(`${this.instanceData.name} is already configured and loaded into the workspace.`);
                }
            } else {
                vscode.window.showErrorMessage("Test connection failed. View logs for detail.");
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

    gatherBasicAuth(){
        return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter User Name",ignoreFocusOut:true}).then((username) =>{
            this.instanceData.connection.auth.username = username || "";

            return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Password",password:true,ignoreFocusOut:true});
        }).then((password) =>{
            this.instanceData.connection.auth.password = password || "";
        });
    }

    gatherOAuth(){
        return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client ID",ignoreFocusOut:true}).then((clientID) =>{
            this.instanceData.connection.auth.OAuth.client_id = clientID || "";

            return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Client Secret"});

        }).then((clientSecret) =>{
            this.instanceData.connection.auth.OAuth.client_secret = clientSecret || "";

            return vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:"Enter Usename (You will be prompted for PW on first connection attempt).",ignoreFocusOut:true});
        }).then((username) =>{
            this.instanceData.connection.auth.username = username || "";
        });
    }

    checkInstanceLoaded(instanceName:string){
        var instanceExists = false;
        if(this.instanceList.length > 0){
            this.instanceList.forEach((instance) =>{
                if(instance.name === instanceName){
                    instanceExists = true;
                }
            });
        }
        return instanceExists;
    }
}

class InstanceDataObj {
    name:string;
    path:vscode.Uri;
    applications:Array<SNApplication>;
    connection:InstanceConnectionData;
    tableConfig:snDefaultTables;
    
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
