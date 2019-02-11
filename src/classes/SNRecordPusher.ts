/*
import { snTableField, snRecord, snTableConfig, SNApplication } from "../myTypes/globals";
import { SystemLogHelper } from "./LogHelper";
import { Uri } from "vscode";
import { InstanceDataObj } from "./InstanceConfigManager";


export class SNFilePusher {
    
    instanceList:Array<InstanceDataObj>;
    activeInstanceData:InstanceDataObj;
    logger:SystemLogHelper;
    appScope:SNApplication;
    

    constructor(instanceList:Array<InstanceDataObj>, fileURI:Uri, logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
        let func = 'funcName';
        this.logger.info(this.lib, func, 'START', );
        
        this.instanceList = instanceList;
        
        this.appScope = appScope;

        this.logger.info(this.lib, func, 'END');


    }



    updateSNRecord(){
        
    }
}
*/