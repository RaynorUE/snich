//https://github.com/tomas/needle
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import { InstanceMaster, InstanceConfig } from './InstanceConfigManager';
import { snRecord } from '../myTypes/globals';
import * as request from 'request-promise-native';
import { WorkspaceManager } from './WorkspaceManager';
import { snichOutput } from '../extension';


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
    private useProgress: Boolean = true;
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
            this.setBasicAuth(this.instance.getUserName(), this.instance.getPassword());
        }


        this.logger.info(this.lib, func, "END");

    }

    setBasicAuth(username: string, password: string) {
        let func = 'setBasicAuth';
        this.logger.info(this.lib, func, 'START', {
            username: username,
            password: password ? 'not logged' : password
        });

        this.requestOpts.auth = {};
        this.requestOpts.auth.username = username || "";
        this.requestOpts.auth.password = password || "";
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
        this.useProgress = true;
    }

    hideProgress() {
        this.useProgress = false;
    }

    async getRecord(table: string, sys_id: string, fields: Array<string>, displayValue?: boolean, refLinks?: boolean): Promise<snRecord> {
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;

        fields = fields.concat(this.alwaysFields);

        //setup URL
        let url = this.instanceConfig.connection.url + '/api/now/' + this.apiVersion + 'table/' + table + '/' + sys_id + '?sysparm_fields=' + fields + '&sysparm_exclude_reference_link=' + refLinks + '&sysparm_display_value=' + displayValue;
        let record: snRecord
        let response = await this.get(url, 'Getting record. ' + table + '_' + sys_id);

        if (!response || !response.result) {
            record = { label: "", name: "", sys_id: "" };
        } else {
            record = response.result;
        }

        return record;
    }

    async getRecords(table: string, encodedQuery: string, fields: Array<string>, displayValue?: boolean, refLinks?: boolean) {
        let func = 'getRecords';
        this.logger.info(this.lib, func, 'START');
        displayValue = displayValue || false;
        refLinks = refLinks === undefined ? true : refLinks;
        fields = fields.concat(this.alwaysFields);
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table + '?sysparm_fields=' + fields.toString();
        url += '&sysparm_exclude_reference_link=' + refLinks;
        url += '&sysparm_display_value=' + displayValue;
        url += '&sysparm_query=' + encodedQuery;

        let records: Array<snRecord> = [];
        let response = await this.get(url, "Retrieving records based on url: " + url);

        if (response && response.result) {
            records = response.result; //when many records returned it's an array in the result property... 
        }

        if (!records || !records.length) {
            records = [];
        }

        return records;
    }

    async updateRecord(table: string, sys_id: string, body: object) {
        let url = this.instanceConfig.connection.url + '/api/now/table/' + table + '/' + sys_id + "?sysparm_fields=sys_id";
        let response = await this.put(url, body, "Updating record at url:" + url);

        let record: snRecord = { label: "", name: "", sys_id: "" };

        if (response && response.result) {
            record = response.result
        }

        return record;
    }

    //unused...
    createRecord(table: string, sys_id: string, body: object) {
        this.post('', body, 'Creating new record!');
    }

    async testConnection(attemptNumber?:number):Promise<boolean> {
        let func = "testConnection";

        let maxAttempts = 3;
        if(attemptNumber == undefined || attemptNumber == null){
            attemptNumber = 0;
        } else {
            attemptNumber++;
        }

        let baseURL = this.instanceConfig.connection.url;
        //querying sys_properties table this will test admin access and credentials.
        let url = baseURL + '/api/now/table/sys_properties?sysparm_limit=1&sysparm_fields=sys_id';
        this.logger.info(this.lib, func, 'Getting url: ' + url);

        let response = await this.get(url, `Testing connection for ${baseURL}`);

        this.logger.info(this.lib, func, 'Response body recieved:', response);

        if (response && response.result && response.result.length && response.result.length > 0) {
            vscode.window.showInformationMessage("Connection Successful!");
            return true;
        } else {
            if (response && response.statusCode) {
                if (response.statusCode == 401) {
                    let respMsg = `${response.message}`;
                    snichOutput.appendLine('Authorization Failed: ' + respMsg);

                    if(this.instance.getAuthType() == 'basic' && attemptNumber < maxAttempts){
                        await this.instance.askForBasicAuth();
                        return await this.testConnection(attemptNumber);
                    } else if(this.instance.getAuthType() == 'oauth' && attemptNumber< maxAttempts){
                        await this.instance.askForOauth();
                        return await this.testConnection(attemptNumber);
                    } else {
                        vscode.window.showErrorMessage(`Max attempts (${maxAttempts}) reached. Please validate account/config on instance: ${this.instance.getName()}`);
                        return false;
                    }

                } else {
                    let respMsg = `${response.statusCode} - ${response.statusMessage}`;
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

        if(!password){
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
                    "record_for_rollback":"on"
                }
            };

            let BSUrl = baseURI + 'sys.scripts.do?sysparm_transaction_scope=' + scope;
            this.logger.debug(this.lib, func, "About to make evalScript call with:", { BSUrl: BSUrl, evalOptions: evalOptions });
            try {
                response = await request.post(BSUrl, evalOptions);
            } catch (e) {
                response = e;
            }

            this.logger.debug(this.lib, func, "BS script result: ", response);

        }

        return response;
    }

    private async get(url: string, progressMessage: string) {
        let func = "get";
        this.logger.info(this.lib, func, 'START');
        if (this.progressMessage) {
            progressMessage = this.progressMessage.toString();
            this.progressMessage = '';//clear it for next usage.
        }


        if (this.useProgress) {
            return await vscode.window.withProgress(<vscode.ProgressOptions>{ location: vscode.ProgressLocation.Notification, cancellable: false, title: "SNICH" }, async (progress, token) => {

                await this.handleAuth();

                this.logger.debug(this.lib, func, 'requestOpts:', this.requestOpts);

                progress.report({ message: progressMessage });
                let response;
                try {
                    response = await request.get(url, this.requestOpts);
                } catch (e) {
                    response = e;
                } finally {
                    this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                    this.logger.info(this.lib, func, '[REQUEST] Response Status Code: ' + response.statusCode);
                    this.logger.info(this.lib, func, "END");
                    return response;
                }
            });
        } else {
            await this.handleAuth();

            let response;
            try {
                response = await request.get(url, this.requestOpts);
            } catch (e) {
                response = e;
            } finally {
                this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                this.logger.info(this.lib, func, '[REQUEST] Response Status Code: ' + response.statusCode);
                this.logger.info(this.lib, func, "END");
                return response;
            }
        }

    }

    private async post(url: string, body: any, progressMessage: string) {
        let func = "post";
        this.logger.info(this.lib, func, 'START');
        if (this.useProgress) {
            return vscode.window.withProgress(<vscode.ProgressOptions>{
                location: vscode.ProgressLocation.Notification,
                title: "SNICH",
                cancellable: false
            }, async (progress, token) => {

                await this.handleAuth();

                progress.report({ message: progressMessage });

                this.requestOpts.body = body;
                var response = await request.post(url, this.requestOpts);
                this.requestOpts.body = null; //clear for next usage.

                this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                this.logger.info(this.lib, func, "END");

                return response
            });
        } else {
            await this.handleAuth();

            this.requestOpts.body = body;
            var response = await request.post(url, this.requestOpts);
            this.requestOpts.body = null; //clear for next usage.

            this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
            this.logger.info(this.lib, func, "END");

            return response
        }
    }

    private async put(url: string, body: any, progressMessage: string) {
        let func = "post";
        this.logger.info(this.lib, func, 'START');
        if (this.useProgress) {
            return vscode.window.withProgress(<vscode.ProgressOptions>{
                location: vscode.ProgressLocation.Notification,
                title: "SNICH",
                cancellable: false
            }, async (progress, token) => {

                await this.handleAuth();

                progress.report({ message: progressMessage });

                this.requestOpts.body = body;
                var response = await request.put(url, this.requestOpts);
                this.requestOpts.body = null; //clear for next usage.

                this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
                this.logger.info(this.lib, func, "END");

                return response
            });
        } else {
            await this.handleAuth();

            this.requestOpts.body = body;
            var response = await request.post(url, this.requestOpts);
            this.requestOpts.body = null; //clear for next usage.

            this.logger.debug(this.lib, func, '[REQUEST] Response was: ', response);
            this.logger.info(this.lib, func, "END");

            return response
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
                grant_type: "refresh_token",
                client_id: oauthData.client_id,
                client_secret: oauthData.client_secret,
                refresh_token: oauthData.token.refresh_token
            };

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