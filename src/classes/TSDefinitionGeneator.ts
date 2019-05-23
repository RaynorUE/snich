import * as fs from "fs";
import * as vscode from 'vscode';
import { SystemLogHelper } from './LogHelper';
import * as path from 'path';
import { WorkspaceManager } from "./WorkspaceManager";

/**
* This class is intended to manage the configuration, files, and folders within the workspace. 
* Used For
*  - Creating, Updating, Deleting files/folders within the workspace.
*  - Loading .json data files as objects to be use when needed. 
* Not Used For
*  - Saving Files to SN
*  - Should never be making a REST Call from this class. 
*/

export class TSDefinitionGenerator {

    private logger:SystemLogHelper;
    private lib:string = 'TSDefinitionGenerator';
    private snNameSpaces = new SNNameSpaces();

    readonly snSkipThese = new SNSkipThese();

    constructor(logger?:SystemLogHelper){
        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.logger.info(this.lib, func, 'START');
        
        
        this.logger.info(this.lib, func, 'END');
    }

    loadSNTypeDefinitions(context:vscode.ExtensionContext){
        
        let func = 'loadSNTypeDefinitions';
        this.logger.info(this.lib, func, 'START');

        let wsFolders = vscode.workspace.workspaceFolders || [];
        
        let rootPath = wsFolders[0].uri.fsPath;
        this.logger.debug(this.lib, func, 'Workspace root: ' + rootPath);

        let jsConfig = path.resolve(rootPath, 'jsconfig.json');

        if(!fs.existsSync(jsConfig)){
            fs.writeFileSync(jsConfig, '//DO NOT DLETE ME!! I MAKE YOUR ServiceNow Intellisense work!');
        }

        let atTypesPath = path.resolve(rootPath, '@Types');
        let GlideSoftTypesPath = path.resolve(rootPath, '@Types', 'GlideSoft'); //using GlideSoft cause who doesn't like easter? ;)
        //it's cloodgy for now, but we'll wipe @Types and regenerate everytime we execute this method. 
        if(!fs.existsSync(atTypesPath)){
            //create @TypesPath
            fs.mkdirSync(atTypesPath);
        }
        
        if(!fs.existsSync(GlideSoftTypesPath)){
            fs.mkdirSync(GlideSoftTypesPath);
        }

        let SNCodeDefinitionsPath = path.resolve(context.extensionPath, 'SNCodeDefinitions');
        this.logger.debug(this.lib, func, 'Source SNCodeDefinitions Path: ' + SNCodeDefinitionsPath);

        let codeFiles = fs.readdirSync(SNCodeDefinitionsPath);

        for(let i = 0; i < codeFiles.length; i++){
            
            let tsDefJSONFileName = codeFiles[i];
            this.logger.debug(this.lib, func, 'Processing codeFile: ' + tsDefJSONFileName);
            if(tsDefJSONFileName.indexOf('.json') === -1){
                //not a json file... skip it so things don't explode..
                continue;
            }

            let filePath = path.resolve(SNCodeDefinitionsPath, tsDefJSONFileName);
            let typeData:any = new WorkspaceManager(this.logger).loadJSONFromFile(filePath);

            let rootTSDefPath = path.resolve(GlideSoftTypesPath, typeData.release || 'Other');

            if(!fs.existsSync(rootTSDefPath)){
                fs.mkdirSync(rootTSDefPath);
            }

            //for each top level property create a unique file for each one.. (Scoped, legacy, client, etc);
            for(let highType in typeData){
                if(highType === 'release'){
                    continue; //they put this at the high level groupings.. 
                }

                let tsDefFilePath = path.resolve(rootTSDefPath, highType + '.d.ts');
                let tsDefFileInactive = path.resolve(rootTSDefPath, highType + '.d.ts.inactive');
                
                //debugging always smash over..
                let debugging = true;
                if(!fs.existsSync(tsDefFilePath) && !fs.existsSync(tsDefFileInactive) || debugging){
                    let dataToProcess = typeData[highType];
                    let pathToUse = tsDefFilePath;
                    if(highType === 'legacy'){
                        pathToUse = tsDefFileInactive;
                    }

                    this.createTSDefFile(dataToProcess, pathToUse, highType);
                }
            }
        }

        this.logger.info(this.lib, func, 'END');
    }

    private createTSDefFile(data:any, filePath:string, fileType:string){
        let func = 'createTSDefFile';
        this.logger.info(this.lib, func, 'START');
        let tsDefFileContent = '//SCOPED GlideSoft Definition File. In combination with JSConfig.json I provide you intellisense for ServiceNow APIs.\n\n\n';

        let spaces4 = '    ';

        //@TODO - Try to figure a way to handle the sn_ws prefixes and the like and wrap them in NameSpaces...

        for(let className in data){
            if(fileType === 'client' && this.snSkipThese.classes.indexOf(className) > -1){
                continue;
            }

            let classData = data[className];
            let classDefinition = '';
            let fixedClassName = this.fixClassName(className);
            let isNameSpaced = false;

            /* ====== Start Wrap In NameSpace if exists ======= */

            var nameSpace = this.determineNameSpace(fixedClassName);
            if(nameSpace){
                isNameSpaced = true;
                classDefinition += 'declare namespace ' + nameSpace + '{\n\n';
            }
            

            /*====== Start Class Description Block =======*/

            classDefinition += '/**\n';
            if(classData.meta && classData.meta.description){
                classDefinition += ' * ' + this.fixTSContent(classData.meta.description);
                classDefinition += '\n * \n * ';
            }

            if(classData.meta && classData.meta.example){
                classDefinition += ' * @example ' + classData.meta.example.replace(/\n/g, '\n * ');
            }

            classDefinition += '\n */\n';
            /*======= End Class Description Block =======*/

            /*======= Begin Class Definition =======*/
            classDefinition += 'declare class ' + fixedClassName + ' {\n\n';

            /*===== Beging Properties Definition ======*/
            if(classData.properties){
                for(let propName in classData.properties){
                    let prop = classData.properties[propName];
                    classDefinition += spaces4 + '/** ' + prop.description + ' */\n';
                    classDefinition += spaces4 + propName + ': ' + this.handleType(prop.type) + '\n';
                }
                classDefinition += '\n\n';
            }

            /*======= Begin Method Definitions ======*/

            if(classData.methods && classData.methods.length > 0){
                classData.methods.forEach((method:any) =>{

                    if(this.snSkipThese.methods.indexOf(method.name) === -1){
                        classDefinition += spaces4 + '/**\n';
                        classDefinition += spaces4 + ' * ' + this.fixTSContent(method.description) + '\n';
                        classDefinition += spaces4 + ' * \n';

                        let methodTSParams:Array<any> = []; //setup array so as we loop through params we can store and just inject into method
                        if(method.params && method.params.length > 0){
                            method.params.forEach((param:any) => {
                                
                                methodTSParams.push(this.fixParamName(param.name) + ': ' + this.handleType(param.type));
                                classDefinition += spaces4 + ' * @' + this.fixParamName(param.name) + ' ' + param.description + '\n';
                            });
                        }
                        
                        let returnType = '';
                        if(method.returns && method.returns.type && method.returns.type !== 'void'){
                            classDefinition += spaces4 + ' * @returns ' + this.fixTSContent(method.returns.description) + '\n';
                            returnType = ': ' + this.handleType(method.returns.type);
                        }

                        classDefinition += spaces4 + ' */\n';
                        classDefinition += spaces4 + this.fixMethodName(method.name) + '(' + methodTSParams.join(', ') + ')' + returnType + ';\n\n';
                    }
                });
            }

            /*======= End Class Definition =======*/
            tsDefFileContent += classDefinition + '}\n\n';
            if(isNameSpaced){
                tsDefFileContent += '}'; //close our namespace
            }
        }

        tsDefFileContent = this.addTSDefForFixing(tsDefFileContent);
        tsDefFileContent = this.declareExtensions(tsDefFileContent, fileType);

        fs.writeFileSync(filePath, tsDefFileContent);
        this.logger.info(this.lib, func, 'END');
        
    }

    private fixClassName(className:String){
        if(!className){
            return '';
        }

        if(className === 'GlideForm (g_form)'){
            className = 'GlideForm';
        }

        if(className === 'GlideListV3 (g_list)'){
            className = 'GlideListV3';
        }

        if(className === 'GlideMenu (g_menu and g_item)'){
            className = 'GlideMenu';
        }

        
        return className.replace(' - Scoped', '').replace(' -', '');
    }

    private fixMethodName(methodName:String){


        //mostly stuff in client scripts, like spModal
        methodName = methodName.replace('(String message).then', '').replace('(String message, String default).then', '').replace('(Object options).then', '');
        return methodName;
    }

    private fixParamName(paramName:String){
        if(!paramName){
            return '';
        }
        if(paramName === 'function'){
            paramName = 'func';
        }

        //fix white spaces... 
        return paramName.replace(/\s|\.|\(|\)/g, '');
    }

    private fixTSContent(content:String){
        if(!content){
            return '';
        }

        let htmlRegex = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/g;
        let extraSpacesRegex = /\s{2,}/g;
        return content.replace(/<br\/>/g, '\n * ').replace(htmlRegex, '').replace(extraSpacesRegex, '').replace(/\n/g, '\n * ');
    }

    private handleType(type:String){
        if(!type){
            return '';
        }

        if(type === 'Array'){
            type = 'Array<any>';
        }
        if(type === 'JSON Array'){
            type = 'Array<object>'
        }

        if(type === 'JSON object'){
            type = 'Array<Object>';
        }

        if(type === 'JSON'){
            //json is a type but isn't what SN Means, what they mean is a "JSON String is being returned"... 
            //so we'll create a custom type so it reads nice, even though it won't be super helpful... Ideally you'd define all the unique object structures..
            type = 'JSONString';
        }

        if(type === 'Map'){
            type = 'Object';
        }
        let htmlRegex = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/g;
        return type.replace(htmlRegex, '').replace(' object or String', '').replace('Scoped ', '').replace(/\s/g, '');
    }

    /**
     * Used to add TS Definitions that we are doing to fix things, this is mostly to cover "special types"...
     */
    private addTSDefForFixing(tsDefFileContent:string){

        /*======== JSONString ====== */
        tsDefFileContent += '\n/**\n';
        tsDefFileContent += ' * A JSON String of Data will be returned. Recommend logging value to see content.\n';
        tsDefFileContent += ' */\n\n';
        tsDefFileContent += 'declare interface JSONString {}';
        return tsDefFileContent;
    }

    /**
     * Method is intended to add any additional "Implements" lines so that we can get some reference lookups
     * without having to rename everything..
     * @param tsDefFileContent Definition file content to modify and return.
     */
    private declareExtensions(tsDefFileContent:string, fileType:string){

        /** Might consider making this it's own JSON File so we can load it in. Seperating Code from Data. */
        var extensionsMap:any = {
            server:<Array<SNClassExtensionMap>>
            [
                {
                    class:'RESTResponse',
                    extends: 'RESTResponseV2'
                },
                {
                    class:'gs',
                    extends:'GlideSystem'
                },
                {
                    class:'SOAPResponse',
                    extends:'SOAPResponseV2'
                }
            ],

            client:<Array<SNClassExtensionMap>>[
                {
                    class:'g_form',
                    extends:'GlideForm'
                },
                {
                    class:'g_list',
                    extends: 'GlideListV3'
                },
                {
                    class:'g_menu',
                    extends:'GlideMenu'
                }
            ],
            scoped:<Array<SNClassExtensionMap>>[],
            legacy:<Array<SNClassExtensionMap>>[]
        };

        //add server into scoped and legacy markers since those are both "server" apis..
        extensionsMap.scoped = extensionsMap.server.concat(extensionsMap.scoped);
        extensionsMap.legacy = extensionsMap.server.concat(extensionsMap.legacy);

        let currentMap = extensionsMap[fileType];
        
        for(let i = 0; i < currentMap.length; i++){
            let extendData = currentMap[i];
            tsDefFileContent += '\n' + `declare class ${extendData.class} extends ${extendData.extends}{}`;
        }
        
        return tsDefFileContent;
    }

    private determineNameSpace(className:string){
        if(!className){
            return '';
        }

        var returnNameSpace = '';
        for(let nameSpace in this.snNameSpaces.nameSpaces){
            for(let i = 0; i < this.snNameSpaces.nameSpaces[nameSpace]; i++){
                let apiName = this.snNameSpaces.nameSpaces[nameSpace][i];
                if(apiName === className){
                    return nameSpace;
                }
            }
        }
        return returnNameSpace;
    }
    
}

/**
 * Used to define the name spaces to wrap around ServiceNow APIs. For example, wrapping RESTMessageV2 with sn_ws
 * So that the code lookup works properly with sn_ws.RESTMessageV2
 */
class SNNameSpaces {
    nameSpaces:any = {}
    constructor(){
        this.nameSpaces.sn_ws = ['RESTMessageV2', 'RESTResponseV2', 'RESTAPIRequest', 'RESTAPIRequestBody','RESTAPIResponse', 'RESTAPIResponseStream','SOAPMessageV2','SOAPResponseV2']
    }

}

class SNSkipThese {
    classes:Array<string> = [];
    methods:Array<string> = [];

    constructor(){
        
        this.buildClasses();
        this.buildMethods();
    }

    buildClasses(){
        //these methods are trying to 

        this.classes.push('GlideRecord'); //just cause this collides... and no good way to know/set which "type per file"
        this.classes.push('Mobile GlideForm (g_form)'); //Might need a way to handle this.. or maybe merge in with regular g_form.. there would be some overlap.. but at least it's there?
        this.classes.push('GlideList2 (g_list)'); //superceded by GlideList3
        this.classes.push('CustomEvent'); //collides with something built-in on VSCode... will debug if people start wondering where this is..

    }

    buildMethods(){
        var GlideFlow = ['execution.awaitCompletion', 'execution.getExecutionStatus', 'execution.getOutputs'];
        this.methods = GlideFlow.concat(this.methods);
    }
}


declare interface SNClassExtensionMap{
    class:string,
    extends:string
}