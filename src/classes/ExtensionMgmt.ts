import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SystemLogHelper } from './LogHelper';

export class ExtensionMgmt {

    context:vscode.ExtensionContext
    logger:SystemLogHelper;
    lib:string = 'ExtensionMgmt';

    constructor(context:vscode.ExtensionContext, logger?:SystemLogHelper){
        this.context = context;

        if(logger){
            this.logger = logger;
        } else {
            this.logger = new SystemLogHelper();
        }
    }

    handleUpgrade(){
        let func = 'handleUpgrade';
        this.logger.info(this.lib, func, 'START');

        let newSinceLastLaunch = this.isNewSinceLastLaunch();

        if(newSinceLastLaunch == false){
            //do nothing
            return;
        } else if(newSinceLastLaunch){
            this.upgraded();
        } else {
            this.logger.debug(this.lib, func, 'Could not determine if new since last launch for some reason');
        }

        this.logger.info(this.lib, func, 'END');
    }

    upgraded(){

        //for now just open the ReadMe so people can see it... In the future we will give people an option in the info message...

        let baseURL = 'https://marketplace.visualstudio.com/items?itemName=';
        if(this.context.extensionPath.indexOf('snich-canary') > -1){
            baseURL += 'integrateNate.snich-canary';
        } else if(this.context.extensionPath.indexOf('snich-insiders') > -1){
            baseURL += 'integrateNate.snich-insiders'
        } else if(this.context.extensionPath.indexOf('snich') > -1){
            baseURL += 'integrateNate.snich';
        } else {
            //something odd or local dev..
        }

        vscode.window.showInformationMessage('SNICH Upgraded!', 'View Relase Notes').then((clicked) => {
            if(clicked == 'View Relase Notes'){
                vscode.env.openExternal(vscode.Uri.parse(baseURL));
            }
        })
    }

    isNewSinceLastLaunch():boolean{
        let func = 'isNewSinceLastLaunch';
        this.logger.info(this.lib, func, 'START');
        let res = false;

        let lastInstalledVersionPath = path.join(this.context.extensionPath, 'ext_version.json');
        let packageJSONPath = path.join(this.context.extensionPath, 'package.json');

        this.logger.debug(this.lib, func, 'lastInstalledVersionPath', lastInstalledVersionPath);
        this.logger.debug(this.lib, func, 'packageJSONPath:', packageJSONPath);

        let packageJSONFile;
        let versionTagFile;
        
        if(fs.existsSync(packageJSONPath)){
            packageJSONFile = fs.readFileSync(packageJSONPath);
        }
        
        if(fs.existsSync(lastInstalledVersionPath)){
            versionTagFile = fs.readFileSync(lastInstalledVersionPath);
        }


        if(versionTagFile && packageJSONFile){
            let versionObj = JSON.parse(versionTagFile.toString());
            let packageObj = JSON.parse(packageJSONFile.toString());

            this.logger.debug(this.lib, func, 'versionObj:', versionObj);
            this.logger.debug(this.lib, func, 'packageObj:', packageObj);

            if(versionObj.last_installed != packageObj.version){
                versionObj.last_installed = packageObj.version;
                fs.writeFileSync(lastInstalledVersionPath, JSON.stringify(versionObj));
                res = true;               
            }

        } else if (!versionTagFile && packageJSONFile){
            //file wasn't found... lets create it and set the version number. 
            this.logger.debug(this.lib, func, 'No version tag file, but had packageJSON File..');

            let packageObj = JSON.parse(packageJSONFile.toString());
            let versionObj = {
                last_installed: packageObj.version || ""
            };

            fs.writeFileSync(lastInstalledVersionPath, JSON.stringify(versionObj));
            this.logger.debug(this.lib, func, 'Just saved versionJSON');
            res = true;
        } else {
            this.logger.warn(this.lib, func, 'Attempted to figure out last version for upgraded message and did not find the versionTagFile and did not find packageJSON... odd...');
            res = false;
        }

        this.logger.debug(this.lib, func, 'RES: ' + res);
        this.logger.info(this.lib, func, 'END');
        return res;
    }
}