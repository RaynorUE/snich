import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import { InstanceMaster, InstanceConfig } from './InstanceConfigManager';
import { SNOAuthToken, snRecord } from '../myTypes/globals';
import * as request from 'request-promise-native';
import { WorkspaceManager } from './WorkspaceManager';
import { snichOutput } from '../extension';
import { OAuth } from './OAuth/OAuth';

export class RESTClient {

    headers: Headers = new Headers({
        "User-Agent": "SNICH_REQUEST-PROMISE-NATIVE",
        "Content-Type": "application/json",
        "Accept": "application/json"
    });

    private instanceConfig: InstanceConfig;
    private instance: InstanceMaster;
    private logger: SystemLogHelper;
    private apiVersion: string = ''; //can be v1/, preparing for version ups when needed.
    private lib: string = 'RESTClient';
    private authType: String = "basic";
    private grantType: String = "password";
    private alwaysFields: Array<string> = ["sys_scope", "sys_scope.scope", "sys_scope.name", "sys_package", "sys_package.name", "sys_package.id", "sys_name", "sys_id"];
    private useProgress: Boolean = true;
    private progressMessage: string = "";

    constructor(instance: InstanceMaster, logger?: SystemLogHelper) {

        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.instance = instance;
        this.logger.info(this.lib, func, 'START', { instance: instance });

        this.instanceConfig = instance.getConfig();

        if (this.instanceConfig.connection.auth.type === 'oauth' && this.instanceConfig.connection.auth.OAuth) {
            this.setOAuth();
        } else if (this.instanceConfig.connection.auth.type === 'oauth-authorization_code' && this.instanceConfig.connection.auth.OAuth) {
            this.setOAuthAuthCode();
        } else if (this.instanceConfig.connection.auth.type === 'basic') {
            this.setBasicAuth(this.instance.getUserName(), this.instance.getPassword());
        }


        this.logger.info(this.lib, func, "END");

    }


    setBasicAuth(username: string, password: string) {
        let func = 'setBasicAuth';
        this.logger.info(this.lib, func, 'START', {
            username: username,
            //password: password ? 'not logged' : password
            password: password
        });

        this.headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);

        this.authType = 'basic';
        this.logger.info(this.lib, func, 'END');

    }

    setOAuthAuthCode() {
        let func = 'setOAuthAuthCode';
        this.logger.info(this.lib, func, "START");
        this.authType = 'oauth';
        this.grantType = 'authorization_code';
        this.logger.info(this.lib, func, "END");
    }

    setOAuth() {
        let func = "setOAuth";
        this.logger.info(this.lib, func, "START");
        this.authType = 'oauth';
        this.grantType = 'password';
        this.logger.info(this.lib, func, "END");
    }

    showProgress(message?: string) {
        this.progressMessage = message || "";
        this.useProgress = true;
    }

    hideProgress() {
        this.useProgress = false;
    }

    async getRecord<T>(table: string, sys_id: string, fields: Array<string>, displayValue?: boolean | "all", refLinks?: boolean): Promise<T | undefined> {
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;

        fields = fields.concat(this.alwaysFields);

        //setup URL
        let url = this.instanceConfig.connection.url + '/api/now/' + this.apiVersion + 'table/' + table + '/' + sys_id + '?sysparm_fields=' + fields + '&sysparm_exclude_reference_link=' + refLinks + '&sysparm_display_value=' + displayValue;
        let record: T;
        let response = await this.get(url, 'Getting record. ' + table + '_' + sys_id);
        let data = await response.json() as SNResponse<T>;
        record = data.result;
        return record;
    }

    async getRecords<T>(table: string, encodedQuery: string, fields: Array<string>, displayValue?: boolean | "all", refLinks?: boolean): Promise<T[]> {
        let func = 'getRecords';
        this.logger.info(this.lib, func, 'START');
        this.logger.debug(this.lib, func, 'table: ', table);
        this.logger.debug(this.lib, func, 'encodedQuery: ', encodedQuery);
        this.logger.debug(this.lib, func, 'fields: ', fields);
        this.logger.debug(this.lib, func, 'displayValue: ', displayValue);
        this.logger.debug(this.lib, func, 'refLinks: ', refLinks);

        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;
        fields = fields.concat(this.alwaysFields);
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table + '?sysparm_fields=' + fields.toString();
        url += '&sysparm_exclude_reference_link=' + refLinks;
        url += '&sysparm_display_value=' + displayValue;
        url += '&sysparm_query=' + encodedQuery;

        let records: T[] = [];
        let response = await this.get(url, "Retrieving records based on url: " + url);


        if (response && response.status >= 200 || response.status < 300) {
            let data = await response.json() as SNResponse<T[]>
            records = data.result; //when many records returned it's an array in the result property... 
        }

        if (!records || !records.length) {
            records = [];
        }

        return records;
    }

    async updateRecord(table: string, sys_id: string, body: object, fields?: string[]) {
        if (!fields) {
            //to keep from updates echoing back to much info... Must pass in fields to override..
            fields = ['sys_id'];
        }
        let url = `${this.instanceConfig.connection.url}/api/now/table/${table}/${sys_id}?sysparm_fields=${fields.toString()}`;
        let response = await this.put(url, JSON.stringify(body), "Updating record at url:" + url);

        let record: snRecord = { label: "", name: "", sys_id: "" };

        if (response && response.status >= 200 || response.status < 300) {
            let data = await response.json() as SNResponse<snRecord>;
            record = data.result;
        }

        return record;
    }

    //unused...
    async createRecord(table: string, body: object, fields?: string[]): Promise<snRecord> {
        if (!fields) {
            //to keep from creates echoing back to much info... Must pass in fields to override..
            fields = ['sys_id'];
        }
        var postURL = `${this.instanceConfig.connection.url}/api/now/table/${table}?sysparm_fields=${fields.toString()}`;
        let response = await this.post(postURL, JSON.stringify(body), `Creating ${table} record.`);

        let record: snRecord = { label: "", name: "", sys_id: "" };


        if (response && response.status >= 200 || response.status < 300) {
            let data = await response.json() as SNResponse<snRecord>;
            record = data.result;
        }

        return record;
    }

    async testConnection(attemptNumber?: number, newInstance?: boolean): Promise<boolean> {
        let func = "testConnection";

        let maxAttempts = 3;
        if (attemptNumber == undefined || attemptNumber == null) {
            attemptNumber = 0;
        } else {
            attemptNumber++;
        }

        let baseURL = this.instanceConfig.connection.url;
        //querying sys_properties table this will test admin access and credentials.
        let url = baseURL + '/api/now/table/sys_properties?sysparm_limit=1&sysparm_fields=sys_id';
        this.logger.info(this.lib, func, 'Getting url: ' + url);
        const response = await this.get(url, `Testing connection for ${baseURL}`);

        this.logger.info(this.lib, func, 'Response body recieved:', response);

        if (response && response.status == 200) {
            vscode.window.showInformationMessage("Connection Successful!");
            return true;
        } else {
            if (response && response.status) {
                if (response.status == 401) {
                    let respMsg = `${response.statusText}`;
                    snichOutput.appendLine('Authorization Failed: ' + respMsg);

                    if (this.instance.getAuthType() == 'basic' && attemptNumber < maxAttempts) {
                        await this.instance.askForBasicAuth();
                        return await this.testConnection(attemptNumber);
                    } else if (this.instance.getAuthType() == 'oauth' && attemptNumber < maxAttempts) {
                        await this.instance.askForOauth();
                        return await this.testConnection(attemptNumber);
                    } else if (this.instance.getAuthType() == 'oauth-authorization_code') {
                        await this.getNewOAuthAuthCodeFlow();
                        return await this.testConnection(attemptNumber);
                    } else {
                        vscode.window.showErrorMessage(`Max attempts (${maxAttempts}) reached. Please validate account/config on instance: ${this.instance.getName()}`);
                        return false;
                    }

                } else {
                    let respMsg = `${response.status} - ${response.statusText}`;
                    snichOutput.appendLine('Test connection failed. Please resetup instance. Error Details:\n' + respMsg);
                    vscode.window.showErrorMessage(`Connection Failed.`, 'Show Error').then((clickedItem) => {
                        if (clickedItem == 'Show Error') {
                            snichOutput.show();
                        }
                    });
                    return false;
                }
            } else {
                snichOutput.appendLine('Test Connection failed. Uknown Error. Full Stack:\n' + JSON.stringify(response));
                vscode.window.showErrorMessage(`Unknown error occured.`, 'Show Error').then((clickedItem) => {
                    if (clickedItem == 'Show Error') {
                        snichOutput.show();
                    }
                });
            }
            return false;
        }
    }

    async runBackgroundScript(script: string, scope: string, username: string, password: string) {
        var func = 'runBackgroundScript';
        this.logger.info(this.lib, func, 'START', { script: script, scope: scope, username: username, password: password });

        let jar = request.jar();

        if (!username) {
            await this.instance.askForUsername();
            username = this.instance.getUserName();
        }
        if (!password) {
            await this.instance.askForPassword();
            password = this.instance.getPassword();
        }

        let baseURI = this.instanceConfig.connection.url + '/';

        let response = "";

        let headers = {
            "Accept": "*/*",
            "Connection": "keep-alive",
            "Cache-Control": "max-age=0",
            "User-Agent": "SNICH-BACKGROUND-SCRIPT-RUNNER",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "en-US,en;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        };


        let loginOpts: request.RequestPromiseOptions = {
            method: "POST",
            followAllRedirects: true,
            headers: headers,
            gzip: true,
            jar: jar,
            form: {
                user_name: username,
                user_password: password,
                remember_me: "true",
                sys_action: "sysverb_login"
            }
        };

        let loginURL = baseURI + 'login.do';
        /*
                const loginBody = new URLSearchParams();
                loginBody.set('user_name', username);
                loginBody.set('user_password', password);
                loginBody.set('remember_me', 'true');
                loginBody.set('sys_action', 'sysverb_login');
                const newLoginResponse = await fetch(loginURL, {method:"POST", redirect:"follow", headers:headers, body:loginBody.toString(), credentials:'same-origin'});
                const loginResponse = await newLoginResponse.text();
        
                this.logger.debug(this.lib, func, "NewLoginResponse: ", newLoginResponse);
                this.logger.debug(this.lib, func, "NewLoginResponse: newLoginResponse.headers.get('set-cookie')", newLoginResponse.headers.get('set-cookie'));
                //this.logger.debug(this.lib, func, "loginResponse: ", loginResponse);
                //this.logger.debug(this.lib, func, "NewLoginResponse: ", newLoginResponse);
                */

        this.logger.debug(this.lib, func, "About to make post to following:", { loginURL: loginURL, loginOpts: loginOpts });
        let loginResponse: string = await request.post(loginURL, loginOpts);

        //this.logger.debug(this.lib, func, "loginResponse was: ", loginResponse);

        //look for CK
        let sysparm_ck = loginResponse.split("var g_ck = '")[1].split('\'')[0];

        this.logger.debug(this.lib, func, "sysparm_ck was: ", sysparm_ck)

        if (sysparm_ck) {
            let evalOptions: request.RequestPromiseOptions = {
                'method': 'POST',
                "followAllRedirects": true,
                "headers": headers,
                "gzip": true,
                "jar": jar,
                'form': {
                    "script": script,
                    "sysparm_ck": sysparm_ck,
                    "sys_scope": scope, //sys_id of the scope... 
                    "runscript": "Run script",
                    "quota_managed_transaction": "on",
                    "record_for_rollback": "on"
                }
            };

            let BSUrl = baseURI + 'sys.scripts.do?sysparm_transaction_scope=' + scope;

            /*
            const scriptData = new URLSearchParams();
            script = 'gs.info("hello world")'; //testing!
            scriptData.set('script', script);
            scriptData.set('sysparm_ck', sysparm_ck);
            scriptData.set('sys_scope', scope);
            scriptData.set('runscript', 'Run Script');
            scriptData.set('quota_managed_transaction', 'on');
            scriptData.set('record_for_rollback', 'on');

            const scriptExecHeaders = new Headers(headers);
            scriptExecHeaders.set('cookie', newLoginResponse.headers.get('set-cookie') || "");
            this.logger.debug(this.lib, func, "HEADERS: ", scriptExecHeaders.get('cookie'));

            const newScriptExecRes = await fetch(BSUrl, {method:"POST", redirect:"follow", headers: scriptExecHeaders, credentials:'same-origin', body:scriptData.toString()})
            this.logger.debug(this.lib, func, "newScriptExecRes: ", newScriptExecRes)
            this.logger.debug(this.lib, func, "newScriptExecRes.status: ", newScriptExecRes.status)
            this.logger.debug(this.lib, func, "newScriptExecRes.statusText: ", newScriptExecRes.statusText)
            let newResponseBody = await newScriptExecRes.text();
            this.logger.debug(this.lib, func, "newResponseBody: ", newResponseBody);
            */
            this.logger.debug(this.lib, func, "About to make evalScript call with:", { BSUrl: BSUrl, evalOptions: evalOptions });
            try {
                response = await request.post(BSUrl, evalOptions);
            } catch (e: any) {
                response = e;
            }

            this.logger.debug(this.lib, func, "BS script result: ", response);

        }

        return response;
    }

    async get(url: string, progressMessage: string) {
        let func = "get";
        this.logger.info(this.lib, func, 'START');
        if (this.progressMessage) {
            progressMessage = this.progressMessage.toString();
            this.progressMessage = '';//clear it for next usage.
        }

        await this.handleAuth();

        const fetchRequest: RequestInit = {
            headers: new Headers(this.headers),
            method: "GET"
        }

        if (this.useProgress) {
            return await vscode.window.withProgress(<vscode.ProgressOptions>{ location: vscode.ProgressLocation.Notification, cancellable: false, title: "SNICH" }, async (progress, token) => {
                progress.report({ message: progressMessage });
                let response = await fetch(url, {
                    ...fetchRequest,
                    headers: new Headers(this.headers),
                });
                if (await this.OAuthRetry(response)) {
                    response = await fetch(url, {
                        ...fetchRequest,
                        headers: new Headers(this.headers),
                    });
                }
                this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                progress.report({ increment: 100 });
                return response;

            });
        } else {

            let response = await fetch(url, fetchRequest);
            this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
            return response;
        }

    }

    private async post(url: string, body: any, progressMessage: string) {
        let func = "post";
        this.logger.info(this.lib, func, 'START');


        await this.handleAuth();

        const fetchRequest: RequestInit = {
            headers: new Headers(this.headers),
            method: "POST",
            body: body
        }
        if (this.useProgress) {
            return vscode.window.withProgress(<vscode.ProgressOptions>{
                location: vscode.ProgressLocation.Notification,
                title: "SNICH",
                cancellable: false
            }, async (progress, token) => {



                progress.report({ message: progressMessage });

                let response = await fetch(url, {
                    ...fetchRequest,
                    headers: new Headers(this.headers),
                });
                if (await this.OAuthRetry(response)) {
                    response = await fetch(url, {
                        ...fetchRequest,
                        headers: new Headers(this.headers),
                    });
                }
                this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                progress.report({ increment: 100 });
                return response;

            });
        } else {

            let response = await fetch(url, fetchRequest);
            this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
            return response;
        }
    }

    private async put(url: string, body: any, progressMessage: string) {
        let func = "post";
        this.logger.info(this.lib, func, 'START');


        await this.handleAuth();

        const fetchRequest: RequestInit = {
            headers: new Headers(this.headers),
            method: "PUT",
            body: body
        }
        if (this.useProgress) {
            return vscode.window.withProgress(<vscode.ProgressOptions>{
                location: vscode.ProgressLocation.Notification,
                title: "SNICH",
                cancellable: false
            }, async (progress, token) => {


                progress.report({ message: progressMessage });

                let response = await fetch(url, {
                    ...fetchRequest,
                    headers: new Headers(this.headers),
                });
                if (await this.OAuthRetry(response)) {
                    response = await fetch(url, {
                        ...fetchRequest,
                        headers: new Headers(this.headers),
                    });
                }
                this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                progress.report({ increment: 100 });
                return response;
            });
        } else {

            let response = await fetch(url, fetchRequest);
            this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
            return response;
        }
    }

    private async handleAuth() {
        let func = 'handleAuth';
        this.logger.info(this.lib, func, 'START');
        if (this.authType == 'basic') {
            return new Promise((resolve, reject) => {
                this.setBasicAuth(this.instance.getUserName(), this.instance.getPassword());
                this.logger.info(this.lib, func, 'END');

                return resolve("");  //requestOpts already taken care of since we'll be storing ID/PW and loading from instance options.
            });
        } else if (this.authType === 'oauth') {
            await this.processOAuth();
            this.logger.info(this.lib, func, 'END');

            return "";
        } else {
            this.logger.info(this.lib, func, 'END');
            return "";
        }
    }

    private async processOAuth(action?: "get_new" | "refresh"): Promise<boolean> {

        let func = 'processOAuth';
        this.logger.info(this.lib, func, 'START', { action: action });

        let oauthData = this.instanceConfig.connection.auth.OAuth;
        if (!oauthData.token.access_token) {
            //if we don' thave any access token yet, jump straight to getNew!
            action = 'get_new';
        }

        let oauthTokenURL = this.instanceConfig.connection.url + '/oauth_token.do';

        let now = Date.now();
        let hadTokenFor = now - oauthData.lastRetrieved + 10000; //add 10000 milliseconds (10 seconds), to account for time sync issues, and making sure we attempt to get a new token BEFORE it actually expires.
        let expiresIn = oauthData.token.expires_in * 1000; //SN returns "Seconds" need this to be milliseconds for comparison

        this.logger.debug(this.lib, func, "oAuth Data about to be used.", { oauthData: oauthData, now: now, hadTokenFor: hadTokenFor, expiresIn: expiresIn });

        if (hadTokenFor < expiresIn && !action) {
            this.logger.info(this.lib, func, 'Token not yet expire! Using it.');

            this.headers.set('Authorization', `Bearer ${oauthData.token.access_token}`);

            this.logger.info(this.lib, func, 'END');
            return true;
        } else if ((hadTokenFor > expiresIn && oauthData.token.refresh_token && !action) || action == "refresh") {
            this.logger.info(this.lib, func, 'token expired! Attempt to get new access token using refresh token!');

            let connectionData = this.instanceConfig.connection;

            let oauthData = connectionData.auth.OAuth;
            const { client_id, client_secret } = oauthData;
            const { refresh_token } = oauthData.token;
            const bodyParams = new URLSearchParams();
            bodyParams.set('grant_type', 'refresh_token');
            bodyParams.set('client_id', client_id);
            bodyParams.set('client_secret', client_secret);
            bodyParams.set('refresh_token', refresh_token);

            const response = await fetch(oauthTokenURL, { method: "POST", body: bodyParams.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            this.logger.debug(this.lib, func, "Response from post", response);
            this.logger.debug(this.lib, func, "Response from post");

            if (response && response.status == 200) {
                const data = await response.json() as SNOAuthToken;
                this.headers.set('Authorization', `Bearer ${data.access_token}`);
                this.logger.debug(this.lib, func, "Set Auth header");

                this.instanceConfig.connection.auth.OAuth.token = data;
                this.instanceConfig.connection.auth.OAuth.lastRetrieved = Date.now();
                this.instance.setConfig(this.instanceConfig);
                new WorkspaceManager(this.logger).writeInstanceConfig(this.instance);
                return true;
            } else {
                this.logger.warn(this.lib, func, "Attempted to get new access token using refresh token and failed. Sending through GetNew!");
                action = "get_new";
            }

        }

        if (action == "get_new") {
            if (this.grantType == 'authorization_code') {
                return await this.getNewOAuthAuthCodeFlow();

            } else {
                this.logger.error(this.lib, func, `Unknown grant type: ${this.grantType}`);
            }
        }
        this.logger.info(this.lib, func, "END");
        return false;
    }

    private async getNewOAuthAuthCodeFlow() {
        let func = 'getNewOAuthAuthCodeFlow';
        this.logger.info(this.lib, func, "START");



        return await vscode.window.withProgress(<vscode.ProgressOptions>{ location: vscode.ProgressLocation.Notification, cancellable: true, title: "SNICH" }, async (progress, token) => {
            progress.report({ message: "Launching Browser for OAuth Prompt" });
            this.logger.debug(this.lib, func, "Inside WithProgress START");
            const oAuth = new OAuth();
            const tokenData = await oAuth.OAuthAuth(this.instance);

            progress.report({ message: "OAuth Exchange Complete!", increment: 100 });


            this.logger.debug(this.lib, func, "oauthToken response: ", tokenData);
            if (tokenData) {
                this.instanceConfig.connection.auth.OAuth.token = tokenData;
                this.headers.set('Authorization', `Bearer ${tokenData.access_token}`);

                this.instanceConfig.connection.auth.OAuth.lastRetrieved = Date.now();
                this.instance.setConfig(this.instanceConfig);
                new WorkspaceManager(this.logger).writeInstanceConfig(this.instance);
                return true;
            }

            return false;
        });

    }

    private async OAuthRetry(response: Response) {
        const func = "OAuthRetry";
        this.logger.info(this.lib, func, "START", { status: response.status, statusText: response.statusText });
        if (this.instanceConfig.connection.auth.type != "oauth-authorization_code") {
            this.logger.info(this.lib, func, "END", false)
            return false;
        } else if (response.status == 401) {

            return await this.processOAuth('refresh');
        } else {
            this.logger.info(this.lib, func, "END", false)
            return false;
        }
    }
}


declare interface SNResponse<T> {
    result: T
}