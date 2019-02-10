import * as fs from "fs";
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import { SNDefaultTables } from "./SNDefaultTables";
import { InstanceDataObj } from "./InstanceConfigManager";

/**
 * This class is intended to manage the configuration, files, and folders within the workspace. 
 * Used For
 *  - Creating, Updating, Deleting files/folders within the workspace.
 *  - Loading .json data files as objects to be use when needed. 
 * Not Used For
 *  - Saving Files to SN
 *  - Should never be making a REST Call from this class. 
 */

export class WorkspaceManager{

    logger:SystemLogHelper;
    lib:string = 'ConfigMgr';
    
    constructor(logger?:SystemLogHelper){
        this.logger = logger || new SystemLogHelper();
    }

    /**
     * Requires an instanceData object and will create the files/folders based on that.
     * @param instanceData 
     */
    setupNewInstance(instanceData:InstanceDataObj){
        let func = "setup";
        this.logger.info(this.lib, func, 'START');
        let rootPath = instanceData.path.fsPath;
        if(!fs.existsSync(rootPath)){
            fs.mkdirSync(rootPath);
        }
        this.logger.info(this.lib, func, 'Folder created. Converting Instance Data to JSON');
        
        let servicenowJSON = JSON.stringify(instanceData, null, 4);
        this.logger.debug(this.lib, func, 'JSON Stringified. Writing file with data:', instanceData);
        
        fs.writeFileSync(rootPath + '\\servicenow.json', servicenowJSON,'utf8');

        //eventually create standard subfolder set. 
        this.createDefaulFolders(rootPath);

        this.logger.info(this.lib, func, 'END');  
    }

    /**
     * Will read the default folder config for the instance, or load defaults.
     * @param instancePath 
     */
    createDefaulFolders(instancePath:fs.PathLike){
        let func = 'createDefaultFolders';
        this.logger.info(this.lib, func, 'START', );
        //need a way to read this file..? 
        let defaultTables = new SNDefaultTables();
        
        //write the defaultTables as JSON so user can edit and we will re-refrence for all file syncs
        let defaultTablesJSON = JSON.stringify(defaultTables, null, 4);
        this.logger.debug(this.lib, func, 'JSON Stringified. Writing file with data:', defaultTables);
        
        fs.writeFileSync(instancePath + '\\servicenowTableConfig.json', defaultTablesJSON,'utf8');

        //global scope
        let globalScopePath = instancePath + '\\global';
        fs.mkdirSync(globalScopePath);
        defaultTables.tables.forEach((tableConfig) =>{
            this.logger.debug(this.lib, func, 'Processing table:', tableConfig);
            let globalTablePath = globalScopePath + '\\' + tableConfig.name;
            fs.mkdirSync(globalTablePath);
        });

        this.logger.info(this.lib, func, 'END');
    }
    
    /**
     * Used to load all the instances based on the folder configuration of the workspace. 
     * @param wsFolders 
     */
    loadWorkspaceInstances(wsFolders:Array<vscode.WorkspaceFolder>){
        let func = "loadWorkspaceInstances";
        let instanceList:Array<InstanceDataObj> = [];
        //@todo need to also watch the folder path, to see if it gets delete that we remove from the instanceList
        this.logger.info(this.lib, func, "Testing Statically First folder");
        let rootPath = wsFolders[0].uri.fsPath;
        var subFolders = fs.readdirSync(rootPath);
        subFolders.forEach((entry) =>{
            this.logger.info(this.lib, func, "Sub folder entry:", entry);
            //sn instance? Only if we have servicenow.json
            var snJSONPath = rootPath + '\\' + entry +'\\servicenow.json';
            this.logger.info(this.lib, func, "Seeing if JSON file exists at:", snJSONPath);
            if(fs.existsSync(snJSONPath)){
                this.logger.debug(this.lib, func, "Found servicenow.json!", snJSONPath);
                let instanceData = JSON.parse(fs.readFileSync(snJSONPath).toString());
                var tableConfigPath = rootPath + '\\' + entry +'\\servicenowTableConfig.json';
                if(fs.existsSync(tableConfigPath)){
                    let tableConfig = JSON.parse(fs.readFileSync(tableConfigPath).toString());
                    instanceData.tableConfig = tableConfig;
                }
                instanceList.push(instanceData);
            }
        });
        this.logger.info(this.lib, func, "Loaded instanceList:", instanceList);
        this.logger.info(this.lib, func, "END");
        return instanceList;
    }
    
    loadJSONFromFile(filePath:string){
        
    }

    writeJSON(objToJSON:object, filePath:string){

    }
}