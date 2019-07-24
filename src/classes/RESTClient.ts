//https://github.com/tomas/needle
import * as needle from 'needle';
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import { OutgoingHttpHeaders } from 'http';
import * as querystring from "querystring";
import { InstanceConfig } from './InstanceConfigManager';
import { snRecord } from '../myTypes/globals';



export class RESTClient {

    private needleOpts: needle.NeedleOptions = {
        compressed:true,
        json: true,
        headers: <OutgoingHttpHeaders>{}
        
    };
    private instanceConfig: InstanceConfig;
    private logger: SystemLogHelper;
    private apiVersion: string = ''; //can be v1/, preparing for version ups when needed.
    private lib: string = 'RESTClient';
    private authType: String = "basic";
    private alwaysFields: Array<string> = ["sys_scope","sys_scope.scope","sys_scope.name","sys_package","sys_package.name", "sys_package.id","sys_name","sys_id"];
    private useProgress: Boolean = true;
    private progressMessage: string = "";

    constructor(instanceConfig: InstanceConfig, logger?: SystemLogHelper) {
        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.instanceConfig = instanceConfig;
        this.logger.info(this.lib, func, 'START', {instanceConfig:instanceConfig});


        if (this.instanceConfig.connection.auth.type === 'oauth' && this.instanceConfig.connection.auth.OAuth) {
            this.setOAuth(this.instanceConfig.connection.auth.OAuth.client_id, this.instanceConfig.connection.auth.OAuth.client_secret);
        } else if (this.instanceConfig.connection.auth.type === 'basic') {
            this.setBasicAuth(this.instanceConfig.connection.auth.username, this.instanceConfig.connection.auth.password);
        }


        this.logger.info(this.lib, func, "END");

    }

    setBasicAuth(username: string, password: string) {
        let func = 'setBasicAuth';
        this.logger.info(this.lib, func, 'START', {
            username: username,
            password: password ? 'not logged' : password
        });

        let buff = Buffer.from(password, "base64");
        let text = buff.toString('ascii');
        this.needleOpts.username = username || "";
        this.needleOpts.password = text || "";
        this.authType = 'basic';

        this.logger.info(this.lib, func, 'END');

    }

    setOAuth(clientID: string, clientSecret: string, username ? : string, password ? : string) {
        let func = "setOAuth";
        this.logger.info(this.lib, func, "START");
        this.needleOpts.username = "";
        this.needleOpts.password = "";
        this.authType = 'oauth';
        this.logger.info(this.lib, func, "END");
    }

    showProgress(message?:string){
        this.progressMessage = message || "";
        this.useProgress = true;
    }

    hideProgress(){
        this.useProgress = false;
    }

    getRecord(table: string, sys_id: string, fields:Array<string>, displayValue?:boolean, refLinks?:boolean) {
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;

        fields = fields.concat(this.alwaysFields);

        //setup URL
        let url = this.instanceConfig.connection.url + '/api/now/' + this.apiVersion + 'table/' + table + '/' + sys_id + '?sysparm_fields=' + fields + '&sysparm_exclude_reference_link=' + refLinks + '&sysparm_display_value=' + displayValue;
        return this.get(url, 'Getting record. ' + table + '_' + sys_id)
            .then((response: any) => {
                var record:snRecord = {name:"",label:"",sys_id:"",sys_package:"",sys_scope:"","sys_scope.name":""};
                if (response.body.result) {
                    record = response.body.result;
                }
                return record;
            });
    }

    getRecords(table:string, encodedQuery: string, fields:Array<string>, displayValue?:boolean, refLinks?:boolean) {
        let func = 'getRecords';
        this.logger.info(this.lib, func, 'START');
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;
        fields = fields.concat(this.alwaysFields);
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table + '?sysparm_fields=' + fields.toString() + '&sysparm_exclude_reference_link=' + refLinks + '&sysparm_display_value=' + displayValue +'&sysparm_query=' + encodedQuery;
        return this.get(url, "Retrieving records based on url: " + url).then((response) =>{
            var recs:Array<snRecord> = [];
            if(response && response.body){
                recs = response.body.result;
            }
            this.logger.info(this.lib, func, 'END');
            return recs;
        });
    }

    updateRecord(table: string, sys_id: string, body: object) {
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table +'/' + sys_id;
        return this.put(url, body, "Updating record at url:" + url);
    }

    //unused...
    createRecord(table: string, sys_id: string, body:object){
        this.post('', body, 'Creating new record!');
    }

    async testConnection() {
        let func = "testConnection";
        
        let baseURL = this.instanceConfig.connection.url;
        let url = baseURL + '/api/now/table/sys_user?sysparm_query=' + encodeURIComponent('user_name=' + this.instanceConfig.connection.auth.username);
        this.logger.info(this.lib, func, 'Getting url: ' + url);

        let response = await this.get(url, `Testing connection for ${baseURL}`);
        this.logger.info(this.lib, func, 'Response body recieved:', response);
        
        if(response && response.body && response.body.result && response.body.result.length && response.body.result.length > 0){
            vscode.window.showInformationMessage("Connection Successful!");
            return true;
        } else {
            if(response && response.statusCode){
                var respMsg = `${response.statusCode} - ${response.statusMessage}`;
                vscode.window.showErrorMessage(`Test Connection Failed. ${respMsg}`);
            } else {
                vscode.window.showErrorMessage(`Test Connection failed. Uknown Error. View logs for detail.`);
            }
            return false;
        }
    }

    private get(url: string, progressMessage: string) {
        let func = "get";
        this.logger.info(this.lib, func, 'START');
        if(this.progressMessage){
            progressMessage = this.progressMessage.toString();
            this.progressMessage = '';//clear it for next usage.
        }
        if(this.useProgress){
            return vscode.window.withProgress( < vscode.ProgressOptions > {
                location: vscode.ProgressLocation.Notification,
                title: progressMessage,
                cancellable: false
            }, (progress, token) => {
    
                return this.handleAuth().then(() => {
                    this.logger.info(this.lib, func, 'Auth handled. Needleopts:', this.needleOpts );
                    this.logger.info(this.lib, func, "Getting url:" + url);
                    return needle('get', url, this.needleOpts).then((response) => {
                        progress.report({
                            increment: 100
                        });
                        this.logger.info(this.lib, func, "response received.", response);
                        this.logger.info(this.lib, func, 'END');
                        return response;
                    });
                }).catch((err) =>{
                    console.log("error occured:", err);
                });
            });
        } else {
            return this.handleAuth().then(() => {
                this.logger.info(this.lib, func, 'Auth handled. Needleopts:', this.needleOpts );
                this.logger.info(this.lib, func, "Getting url:" + url);
                return needle('get', url, this.needleOpts).then((response) => {
                    this.logger.info(this.lib, func, "response received.", response);
                    this.logger.info(this.lib, func, 'END');
                    return response;
                });
            }).catch((err) =>{
                console.log("error occured:", err);
            });
        }
        
    }

    private post(url: string, body: any, progressMessage: string) {
        let func = "post";
        return vscode.window.withProgress( < vscode.ProgressOptions > {
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        }, (progress, token) => {

            return this.handleAuth().then(() => {
                this.logger.info(this.lib, func, 'Auth handled. Needleopts:', this.needleOpts );
                this.logger.info(this.lib, func, "Posting url:" + url);
                return needle('post', url, body, this.needleOpts).then((response) => {
                    progress.report({
                        increment: 100
                    });
                    this.logger.info(this.lib, func, "response received.", response);
                    return response;
                });
            }).catch((err) =>{
                console.log("error occured:", err);
            });
        });
    }

    private put(url: string, body: any, progressMessage: string) {
        let func = "post";
        return vscode.window.withProgress( < vscode.ProgressOptions > {
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        }, (progress, token) => {

            return this.handleAuth().then(() => {
                this.logger.info(this.lib, func, 'Auth handled. Needleopts:', this.needleOpts );
                this.logger.info(this.lib, func, "Posting url:" + url);
                return needle('put', url, body, this.needleOpts).then((response) => {
                    progress.report({
                        increment: 100
                    });
                    this.logger.info(this.lib, func, "response received.", response);
                    return response;
                });
            }).catch((err) =>{
                console.log("error occured:", err);
            });
        });
    }

    private handleAuth() {
        return new Promise((resolve, reject) => {
            if (this.authType === 'basic') {
                return resolve();  //needleOpts already taken care of since we'll be storing ID/PW and loading from instance options.
            }

            if (this.authType === 'oauth') {
                this.processOAuth().then(() => {resolve();});
            }
        });
    }
    
    private processOAuth(getNew?:boolean):Promise<any> {
        return new Promise((resolve,reject) =>{
            let func = 'processOAuth';
            this.logger.info(this.lib, func, 'START', {getNew:getNew});
            
            let oauthData = this.instanceConfig.connection.auth.OAuth;
            if(!oauthData.token.access_token){
                //if we don' thave any access token yet, jump straight to getNew!
                getNew = true;
            }
            let now = Date.now();
            let hadTokenFor = now - oauthData.lastRetrieved + 10000; //add 10000 milliseconds (10 seconds), to account for time sync issues, and making sure we attempt to get a new token BEFORE it actually expires.
            let expiresIn = oauthData.token.expires_in * 1000; //SN returns "Seconds" need this to be milliseconds for comparison
            this.logger.debug(this.lib, func, "oAuth Data about to be used.", {oauthData:oauthData,now:now,hadTokenFor:hadTokenFor,expiresIn:expiresIn});
            if(hadTokenFor < expiresIn && !getNew){
                this.logger.info(this.lib, func, 'Token not yet expire! Using it.');
                
                if(this.needleOpts.headers){
                    this.needleOpts.headers.authorization = "Bearer " + oauthData.token.access_token;
                }
                this.logger.info(this.lib, func, 'END');
                return resolve();
            } else if(hadTokenFor > expiresIn && oauthData.token.refresh_token && !getNew){
                this.logger.info(this.lib, func, '//token expired! Attempt to get new access token using refresh token!');
                var connectionData = this.instanceConfig.connection;
                let url = this.instanceConfig.connection.url + '/oauth_token.do';
                var formEncodedParams = "grant_type=password&";
                formEncodedParams += "client_id=" + encodeURIComponent(connectionData.auth.OAuth.client_id) + "&";
                formEncodedParams += "client_secret=" + encodeURIComponent(connectionData.auth.OAuth.client_secret) + "&";
                formEncodedParams += "refresh_token=" + encodeURIComponent(connectionData.auth.OAuth.token.refresh_token);
                return needle('post', url, formEncodedParams).then((authResponse) =>{
                    if(authResponse.body && authResponse.body.access_token){
                        var tokenData = authResponse.body;
                        var authHeader = "Bearer " + tokenData.access_token;
                        if(this.needleOpts.headers){
                            this.needleOpts.headers.authorization = authHeader;
                        }
                        this.instanceConfig.connection.auth.OAuth.token = tokenData;
                        this.instanceConfig.connection.auth.OAuth.lastRetrieved = Date.now();
                        //new configMgmt().updateInstanceConfig(this.instanceConfig);
                        this.logger.info(this.lib, func, 'END');
                        return resolve();
                    } else {
                        this.logger.info(this.lib, func, 'Did not get back access token. Attempting to reprocess forcing to getNew.', );
                        this.logger.info(this.lib, func, 'END');
                        return resolve(this.processOAuth(true));
                    }
                });
            }

            if(getNew){
                this.logger.info(this.lib, func, 'Attempting to get new Access token.');
                let prompt = `Access token expired. Please Enter password for ${this.instanceConfig.connection.auth.username} on: ${this.instanceConfig.connection.url}. We do not store this value.`;
                if(!this.instanceConfig.connection.auth.OAuth.token.access_token){
                    //first time setup
                    prompt = `Enter password for ${this.instanceConfig.connection.auth.username} on: ${this.instanceConfig.connection.url}. We do not store this value.`;
                }
                vscode.window.showInputBox(<vscode.InputBoxOptions>{prompt:prompt, password:true, ignoreFocusOut:true})
                .then((value) =>{
                    this.logger.info(this.lib, func, "asked user for password. Proceeding to attempt to auth.", );
                    


                    var connectionData = this.instanceConfig.connection;
                    var url = connectionData.url + '/oauth_token.do';

                    var formData = {
                        grant_type:"password",
                        client_id:connectionData.auth.OAuth.client_id,
                        client_secret:connectionData.auth.OAuth.client_secret,
                        username:connectionData.auth.username,
                        password: value || ""
                    
                    };

                    var formString = querystring.stringify(formData);
                    this.logger.info(this.lib, func, "formString:",formString);

                    var formEncodedParams = "grant_type=password&";
                    formEncodedParams += "client_id=" + encodeURI(connectionData.auth.OAuth.client_id) + "&";
                    formEncodedParams += "client_secret=" + encodeURI(connectionData.auth.OAuth.client_secret) + "&";
                    formEncodedParams += "username=" + encodeURI(connectionData.auth.username) + "&";
                    this.logger.info(this.lib, func, "formEncoded PArams without password:", formEncodedParams);
                    formEncodedParams += "password=" + encodeURI(value || "");
                    this.logger.debug(this.lib, func, "formEncodedParams with PW:", formEncodedParams);
                    return needle('post', url, formString, <needle.NeedleOptions>{parse:"json",headers:{content_type:"application/x-www-form-urlencoded"}})
                    .then((authResponse) => {
                        this.logger.info(this.lib, func, "retrieved auth response!", authResponse);
                        if(authResponse.body && authResponse.body.access_token){
                            var tokenData = authResponse.body;

                            this.instanceConfig.connection.auth.OAuth.lastRetrieved = Date.now();
                            this.instanceConfig.connection.auth.OAuth.token = tokenData;
                            
                            if(this.needleOpts.headers){
                                this.needleOpts.headers.authorization = "Bearer " + tokenData.access_token;
                            }
                            this.logger.info(this.lib, func, 'NeedleOptions have been set.', this.needleOpts);
                            this.logger.info(this.lib, func, 'END');
                            return resolve();
                            //new configMgmt().updateInstanceConfig(this.instancData);
                        }
                    }).catch((err) => {console.log(err);});
                });
            }
        });
    }   
}