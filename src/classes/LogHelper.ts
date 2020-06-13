/************************************************************************* *
* YANSA LABS - CONFIDENTIAL
* __________________
*
*  [2016] - [2017] Yansa Labs, LLC
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Yansa Labs, LLC and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Yansa Labs, LLC
* and its suppliers and may be covered by U.S. and Foreign Patents,
* patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Yansa Labs, LLC.
*/

/*  SystemLogHelper
*	Usage: new x_yala_kickstarter.SystemLogHelper();
*
* Use to log debug messages. Available logging methods are:
*      .debug - Used for verbose debugging, use this to log values, or if having complex / large comment add debug logs in addition to an info log. 
*      .info - Used for logging informational items, entering and exiting functions, places you might write a comment write an info log instead!
*      .warn - Used for warning messages. Used when something noteable happened but we are able to keep processing.
*      .error - Used for hard errors that would stop all further processing.
*      .reportException - Used for try/catch blocks to log formatted errors of the "error object" in the catch.
*
* @example
* //In your script include
* this.logger = new x_yala_kickstarter.SystemLogHelper();
* this.logger.debug(this.type, 'myFunc', 'my debug message');
* this.logger.info(this.type, 'myFunc', 'my info message');
* this.logger.warn(this.type, 'myFunc', 'my warning message');
* this.logger.error(this.type, 'myFunc', 'my error message');
* 
* @return {void} Nothing is returned.
*
* @since 1.0.0
*/

import {workspace} from 'vscode';

export class SystemLogHelper {

    //* Log Level Constants */
    private _DEBUG:number = 4;
    private _INFO:number = 3;
    private _WARN:number = 2;
    private _ERROR:number = 1;
    private _NONE:number = 0;

    // entry we're on and padding to provide.
    //private entry:number;
    //private padding:string;
    private logLevel:number = this._NONE;


    constructor(){
        //this.entry = 0;
        //this.padding = "0000000";

        this.setLogLevel();
    }

    private setLogLevel(){
        let settings = workspace.getConfiguration();
        var level = settings.get('snich.logLevel') || 0;
        if(level === 'Debug'){
            this.logLevel = this._DEBUG;
        }
        else if(level === 'Info'){
            this.logLevel = this._INFO;
        }
        else if(level === 'Warn'){
            this.logLevel = this._WARN;
        }
        else if(level === 'Error'){
            this.logLevel = this._ERROR;
        } else {
            this.logLevel = this._NONE;
        }
    }

    private getLogLevelLabel(level:number) {
        if(level === 0){
            return " NONE:";
        } else if(level === 1){
            return "ERROR:";
        } else if(level === 2){
            return " WARN:";
        } else if(level === 3){
            return " INFO:";
        } else if(level === 4){
            return "DEBUG:";
        }
    }

    inChattyMode(){
        if(this.logLevel > this._WARN){
            return true;
        } else {
            return false;
        }
    }

    /**
     * 
     * @param level The logging level
     * @param library The class / library calling the logger
     * @param func //the function you're in.
     * @param msg  //the message you want to log
     * @param obj //An object or variable to include.
     */
    log(level:number, library:string, func:string, msg:string, obj?:any){
        if (this.logLevel === this._NONE) {
            return;
        }
        /*
        var entryNumPadded = this.padding.substring(0, this.padding.length - ("" + this.entry).length) + this.entry;
        var fullMsg = `[${entryNumPadded}] - {${library} : ${func}} - ${msg}`;
        */
       var logLevelLabel = this.getLogLevelLabel(level);
       var fullMsg = `${logLevelLabel} {${library} : ${func}} - ${msg}`;
        if (level <= this.logLevel) {
            let log = console.log;
            
            if(level === this._WARN){
                log = console.warn;
            } else if (level === this._ERROR){
                log = console.error;
            }

            if (obj) {
                /*var objString = "";
                try{
                    objString = JSON.stringify(obj).toLowerCase(); //may throw error on circular objects.
                } catch (err) {
                    objString = "";
                }
                */
                /*if(objString.indexOf('password') > -1 || objString.indexOf('pass') > -1 || objString.indexOf('pw') > -1){
                  log(fullMsg, {log_exception:'Data to be logged may have contained a password. Not logging.'});
                } else {*/
                    log(fullMsg, obj);
                //}
            } else {
                log(fullMsg);
            }
        }
        //this.entry++;
    }

    debug(library:string, func:string, msg:string, obj?:any){
        this.log(this._DEBUG, library, func, msg, obj);
    }
    info(library:string, func:string, msg:string, obj?:any){
        this.log(this._INFO, library, func, msg, obj);
    }
    warn(library:string, func:string, msg:string, obj?:any){
        this.log(this._WARN, library, func, msg, obj);
    }
    error(library:string, func:string, msg:string, obj?:any){
        this.log(this._ERROR, library, func, msg, obj);
    }
}