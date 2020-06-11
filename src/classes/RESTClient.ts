//https://github.com/tomas/needle
import * as needle from 'needle';
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import { InstanceMaster, InstanceConfig } from './InstanceConfigManager';
import { snRecord } from '../myTypes/globals';
import * as request from 'request-promise-native';
import { WorkspaceManager } from './WorkspaceManager';


export class RESTClient {

    private requestOpts: request.RequestPromiseOptions = {
        gzip: true,
        json: true,
        headers: {
            "User-Agent": "SNICH_REQUEST-PROMISE-NATIVE"
        }
    };
    private instanceConfig: InstanceConfig;
    private instance: InstanceMaster;
    private logger: SystemLogHelper;
    private apiVersion: string = ''; //can be v1/, preparing for version ups when needed.
    private lib: string = 'RESTClient';
    private authType: String = "basic";
    private alwaysFields: Array<string> = ["sys_scope", "sys_scope.scope", "sys_scope.name", "sys_package", "sys_package.name", "sys_package.id", "sys_name", "sys_id"];
    //private useProgress: Boolean = true;
    private progressMessage: string = "";

    constructor(instance: InstanceMaster, logger?: SystemLogHelper) {

        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.instance = instance;
        this.logger.info(this.lib, func, 'START', { instance: instance });

        this.instanceConfig = instance.getConfig();

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
        this.requestOpts.auth = {};
        this.requestOpts.auth.username = username || "";
        this.requestOpts.auth.password = text || "";
        this.authType = 'basic';

        this.logger.info(this.lib, func, 'END');

    }

    setOAuth(clientID: string, clientSecret: string, username?: string, password?: string) {
        let func = "setOAuth";
        this.logger.info(this.lib, func, "START");
        this.requestOpts.auth = {};
        this.authType = 'oauth';
        this.logger.info(this.lib, func, "END");
    }

    showProgress(message?: string) {
        this.progressMessage = message || "";
        //this.useProgress = true;
    }

    hideProgress() {
        //this.useProgress = false;
    }

    getRecord(table: string, sys_id: string, fields: Array<string>, displayValue?: boolean, refLinks?: boolean) {
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;

        fields = fields.concat(this.alwaysFields);

        //setup URL
        let url = this.instanceConfig.connection.url + '/api/now/' + this.apiVersion + 'table/' + table + '/' + sys_id + '?sysparm_fields=' + fields + '&sysparm_exclude_reference_link=' + refLinks + '&sysparm_display_value=' + displayValue;
        return this.get(url, 'Getting record. ' + table + '_' + sys_id)
            .then((response: any) => {
                var record: snRecord = { name: "", label: "", sys_id: "", sys_package: "", sys_scope: "", "sys_scope.name": "" };
                if (response.body.result) {
                    record = response.body.result;
                }
                return record;
            });
    }

    getRecords(table: string, encodedQuery: string, fields: Array<string>, displayValue?: boolean, refLinks?: boolean) {
        let func = 'getRecords';
        this.logger.info(this.lib, func, 'START');
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;
        fields = fields.concat(this.alwaysFields);
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table + '?sysparm_fields=' + fields.toString() + '&sysparm_exclude_reference_link=' + refLinks + '&sysparm_display_value=' + displayValue + '&sysparm_query=' + encodedQuery;
        return this.get(url, "Retrieving records based on url: " + url).then((response) => {
            var recs: Array<snRecord> = [];
            if (response && response.body) {
                recs = response.body.result;
            }
            this.logger.info(this.lib, func, 'END');
            return recs;
        });
    }

    updateRecord(table: string, sys_id: string, body: object) {
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table + '/' + sys_id;
        return this.put(url, body, "Updating record at url:" + url);
    }

    //unused...
    createRecord(table: string, sys_id: string, body: object) {
        this.post('', body, 'Creating new record!');
    }

    async testConnection() {
        let func = "testConnection";

        let baseURL = this.instanceConfig.connection.url;
        let url = baseURL + '/api/now/table/sys_user?sysparm_query=' + encodeURIComponent('user_name=' + this.instanceConfig.connection.auth.username) + "&sysparm_fields=sys_id,user_name";
        this.logger.info(this.lib, func, 'Getting url: ' + url);

        let response = await this.get(url, `Testing connection for ${baseURL}`);
        this.logger.info(this.lib, func, 'Response body recieved:', response);

        if (response && response.result && response.result.length && response.result.length > 0) {
            vscode.window.showInformationMessage("Connection Successful!");
            return true;
        } else {
            if (response && response.statusCode) {
                var respMsg = `${response.statusCode} - ${response.statusMessage}`;
                vscode.window.showErrorMessage(`Test Connection Failed. ${respMsg}`);
            } else {
                vscode.window.showErrorMessage(`Test Connection failed. Uknown Error. View logs for detail.`);
            }
            return false;
        }
    }

    private async get(url: string, progressMessage: string) {
        let func = "get";
        this.logger.info(this.lib, func, 'START');
        if (this.progressMessage) {
            progressMessage = this.progressMessage.toString();
            this.progressMessage = '';//clear it for next usage.
        }

        await this.handleAuth();

        var response = await request.get(url, this.requestOpts);

        this.logger.info(this.lib, func, '[REQUEST] Response was: ', response);
        return response;

    }

    private post(url: string, body: any, progressMessage: string) {
        let func = "post";
        return vscode.window.withProgress(<vscode.ProgressOptions>{
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        }, (progress, token) => {

            return this.handleAuth().then(() => {
                this.logger.info(this.lib, func, 'Auth handled. requestOpts:', this.requestOpts);
                this.logger.info(this.lib, func, "Posting url:" + url);
                return needle('post', url, body, {}).then((response) => {
                    //return needle('post', url, body, {this.requestOpts}).then((response) => {
                    progress.report({
                        increment: 100
                    });
                    this.logger.info(this.lib, func, "response received.", response);
                    return response;
                });
            }).catch((err) => {
                console.log("error occured:", err);
            });
        });
    }

    private put(url: string, body: any, progressMessage: string) {
        let func = "post";
        return vscode.window.withProgress(<vscode.ProgressOptions>{
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        }, (progress, token) => {

            return this.handleAuth().then(() => {
                this.logger.info(this.lib, func, 'Auth handled. requestOpts:', this.requestOpts);
                this.logger.info(this.lib, func, "Posting url:" + url);
                return needle('put', url, body, {}).then((response) => {

                    //return needle('put', url, body, this.requestOpts).then((response) => {
                    progress.report({
                        increment: 100
                    });
                    this.logger.info(this.lib, func, "response received.", response);
                    return response;
                });
            }).catch((err) => {
                console.log("error occured:", err);
            });
        });
    }

    private async handleAuth() {
        if (this.authType == 'basic') {
            return new Promise((resolve, reject) => {
                return resolve("");  //requestOpts already taken care of since we'll be storing ID/PW and loading from instance options.
            });
        } else if (this.authType === 'oauth') {
            await this.processOAuth();
            return "";
        } else {
            return "";
        }
    }

    private async processOAuth(getNew?: boolean): Promise<any> {

        let func = 'processOAuth';
        this.logger.info(this.lib, func, 'START', { getNew: getNew });

        let oauthData = this.instanceConfig.connection.auth.OAuth;
        if (!oauthData.token.access_token) {
            //if we don' thave any access token yet, jump straight to getNew!
            getNew = true;
        }

        let oauthTokenURL = this.instanceConfig.connection.url + '/oauth_token.do';


        let now = Date.now();
        let hadTokenFor = now - oauthData.lastRetrieved + 10000; //add 10000 milliseconds (10 seconds), to account for time sync issues, and making sure we attempt to get a new token BEFORE it actually expires.
        let expiresIn = oauthData.token.expires_in * 1000; //SN returns "Seconds" need this to be milliseconds for comparison
        this.logger.debug(this.lib, func, "oAuth Data about to be used.", { oauthData: oauthData, now: now, hadTokenFor: hadTokenFor, expiresIn: expiresIn });
        if (hadTokenFor < expiresIn && !getNew) {
            this.logger.info(this.lib, func, 'Token not yet expire! Using it.');

            if (this.requestOpts) {
                this.requestOpts.auth = {
                    bearer: oauthData.token.access_token
                }
            }
            this.logger.info(this.lib, func, 'END');
            return '';
        } else if (hadTokenFor > expiresIn && oauthData.token.refresh_token && !getNew) {
            this.logger.info(this.lib, func, 'token expired! Attempt to get new access token using refresh token!');

            let connectionData = this.instanceConfig.connection;

            let reqOpts: request.RequestPromiseOptions = {};
            let oauthData = connectionData.auth.OAuth;

            reqOpts.gzip = true;
            reqOpts.json = true;
            reqOpts.form = {
                grant_type: "password",
                client_id: oauthData.client_id,
                client_secret: oauthData.client_secret,
                refresh_token: oauthData.token.refresh_token
            };

            /*
            var formEncodedParams = "grant_type=password&";
            formEncodedParams += "client_id=" + encodeURIComponent(connectionData.auth.OAuth.client_id) + "&";
            formEncodedParams += "client_secret=" + encodeURIComponent(connectionData.auth.OAuth.client_secret) + "&";
            formEncodedParams += "refresh_token=" + encodeURIComponent(connectionData.auth.OAuth.token.refresh_token);
            */

            var response = await request.post(oauthTokenURL, reqOpts);
            this.logger.debug(this.lib, func, "Response from post", response);

            if (response && response.access_token) {
                //got token!  
                this.requestOpts.auth = {
                    bearer: response.access_token
                };


                this.instanceConfig.connection.auth.OAuth.token = response;
                this.instanceConfig.connection.auth.OAuth.lastRetrieved = Date.now();
                this.instance.setConfig(this.instanceConfig);
                new WorkspaceManager(this.logger).writeInstanceConfig(this.instance);

            } else {
                this.logger.warn(this.lib, func, "Attempted to get new access token using refresh token and failed. Sending through GetNew!");
                getNew = true;
            }

        }

        if (getNew) {
            this.logger.debug(this.lib, func, 'Attempting to get new Access token.');
            let prompt = `Refresh token expired. Please Enter password for ${this.instanceConfig.connection.auth.username} on: ${this.instanceConfig.connection.url}. We do not store your password. If using 2FA/OTP enter your 2FA/OTP code at the end of your password.`;
            if (!this.instanceConfig.connection.auth.OAuth.token.access_token) {
                //first time setup
                prompt = `Enter password for ${this.instanceConfig.connection.auth.username} on: ${this.instanceConfig.connection.url}. We do not store this value. If using 2FA/OTP enter your 2FA/OTP code at the end of your password.`;
            }

            let enteredPwd = await vscode.window.showInputBox(<vscode.InputBoxOptions>{ prompt: prompt, password: true, ignoreFocusOut: true });

            this.logger.debug(this.lib, func, "asked user for password. Proceeding to attempt to auth.",);

            var connectionData = this.instanceConfig.connection;

              let reqOpts: request.RequestPromiseOptions = {
                gzip: true,
                json: true,
                form: {
                    grant_type: "password",
                    client_id: connectionData.auth.OAuth.client_id,
                    client_secret: connectionData.auth.OAuth.client_secret,
                    username: connectionData.auth.username,
                    password: enteredPwd || ""
    
                }
            }
            this.logger.debug(this.lib, func, `About to get oauth token at URL: ${oauthTokenURL} with reqOpts: `, reqOpts);
            let tokenData = await request.post(oauthTokenURL, reqOpts);
            this.logger.debug(this.lib, func, "oauthToken response: ", tokenData);
            if (tokenData && tokenData.access_token) {

                this.instanceConfig.connection.auth.OAuth.lastRetrieved = Date.now();
                this.instanceConfig.connection.auth.OAuth.token = tokenData;

                this.requestOpts.auth = {
                    bearer: tokenData.access_token
                };

                this.logger.info(this.lib, func, 'RequestOpts have been set.', this.requestOpts);

                this.instance.setConfig(this.instanceConfig);
                new WorkspaceManager(this.logger).writeInstanceConfig(this.instance);
                this.logger.info(this.lib, func, 'END');
                return '';

            }

        }
    }
}