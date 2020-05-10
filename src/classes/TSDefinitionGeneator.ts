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

        let currentRelease = 'newyork'; //wil expand on this in the future to be part of the selector code.

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
                    if(highType === 'legacy' || typeData.release != currentRelease ){
                        pathToUse = tsDefFileInactive;
                    }

                    this.createTSDefFile(dataToProcess, pathToUse, highType);
                }
            }
        }

        this.logger.info(this.lib, func, 'END');
    }

    private createTSDefFile(data:any, filePath:string, highType:string){
        let func = 'createTSDefFile';
        this.logger.info(this.lib, func, 'START');
        let tsDefFileContent = '//SCOPED GlideSoft Definition File. In combination with JSConfig.json I provide you intellisense for ServiceNow APIs.\n\n\n';

        let spaces4 = '    ';
        let spaces = '';
        //@TODO - Try to figure a way to handle the sn_ws prefixes and the like and wrap them in NameSpaces...

        for(let className in data){
            if(highType === 'client' && this.snSkipThese.classes.indexOf(className) > -1){
                continue;
            }

            let classData = data[className];
            let classDefinition = '';
            let fixedClassName = this.fixClassName(className);
            let isNameSpaced = false;

            /* ====== Start Wrap In NameSpace if exists ======= */

            var nameSpace = this.snNameSpaces.getNameSpace(fixedClassName, highType);
            if(nameSpace){
                isNameSpaced = true;
                classDefinition += '\ndeclare namespace ' + nameSpace + ' {\n\n';
                spaces += spaces4;
            }
            

            /*====== Start Class Description Block =======*/

            classDefinition += spaces + '/**\n';
            if(classData.meta && classData.meta.description){
                classDefinition += spaces + ' * ' + this.fixTSContent(classData.meta.description, spaces);
                classDefinition += '\n' + spaces +' * \n' + spaces + ' * ';
            }

            if(classData.meta && classData.meta.example && classData.meta.example.length > 0){
                this.logger.info(this.lib, func, "FOUND EXAMPLE!", classData.meta.example);
                for(let i = 0; i < classData.meta.example.length; i++){
                    classDefinition += spaces + ' * @example\n ' + classData.meta.example[i].replace(/\n/g, '\n * ');
                }
            }

            classDefinition += '\n' + spaces + ' */\n';
            /*======= End Class Description Block =======*/

            /*======= Begin Class Definition =======*/
            classDefinition += spaces + 'declare class ' + fixedClassName + ' {\n\n';

            /*===== Beging Properties Definition ======*/
            if(classData.properties){
                spaces += spaces4;
                for(let propName in classData.properties){
                    let prop = classData.properties[propName];
                    classDefinition += spaces + '/** ' + prop.description + ' */\n';
                    classDefinition += spaces + propName + ': ' + this.handleType(prop.type, highType) + '\n';
                }
                classDefinition += '\n\n';
                spaces = spaces.replace(spaces4, ''); //remove 4 spaces so we indent back in
            }

            /*======= Begin Method Definitions ======*/

            if(classData.methods && classData.methods.length > 0){
                spaces += spaces4;
                classData.methods.forEach((method:any) =>{

                    if(this.snSkipThese.methods.indexOf(method.name) === -1){
                        classDefinition += spaces + '/**\n';
                        classDefinition += spaces + ' * ' + this.fixTSContent(method.description, spaces) + '\n';
                        classDefinition += spaces + ' * \n';

                        let methodTSParams:Array<any> = []; //setup array so as we loop through params we can store and just inject into method
                        if(method.params && method.params.length > 0){
                            method.params.forEach((param:any) => {
                                
                                methodTSParams.push(this.fixParamName(param.name) + ': ' + this.handleType(param.type, highType));
                                classDefinition += spaces + ' * @' + this.fixParamName(param.name) + ' ' + this.fixTSContent(param.description, spaces) + '\n';
                            });
                        }

                        if(method.example && method.example.length > 0){
                            for(let i = 0; i < method.example.length; i++){
                                classDefinition += spaces + ' * @example\n ';
                                classDefinition += spaces + '* ' + method.example[i].code.replace(/\n/g, '\n' + spaces + ' * ').replace(/\/\*/g, '//').replace(/\*\//g, '') + '\n';
                            }
                        }
                        
                        let returnType = '';
                        if(method.returns && method.returns.type && method.returns.type !== 'void'){
                            classDefinition += spaces + ' * @returns ' + this.fixTSContent(method.returns.description, spaces) + '\n';
                            returnType = ': ' + this.handleType(method.returns.type, highType);
                        }

                        classDefinition += spaces + ' */\n';
                        classDefinition += spaces + this.fixMethodName(method.name) + '(' + methodTSParams.join(', ') + ')' + returnType + ';\n\n';
                    }
                });
                spaces = spaces.replace(spaces4, '');
            }

            /*======= End Class Definition =======*/
            tsDefFileContent += classDefinition + spaces + '}\n\n';
            if(isNameSpaced){
                spaces = spaces.replace(spaces4, '');
                tsDefFileContent += '}'; //close our namespace
            }
        }

        tsDefFileContent = this.addTSDefForFixing(tsDefFileContent);
        tsDefFileContent = this.declareExtensions(tsDefFileContent, highType);

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

    private fixTSContent(content:String, spaces:string){
        
        if(!content){
            return '';
        }

        let htmlRegex = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/g;
        let extraSpacesRegex = /\s{2,}/g;
        return content.replace(/<br\/>/g, '\n * ').replace(htmlRegex, '').replace(extraSpacesRegex, ' ').replace(/\n/g, '\n' + spaces + ' * ');
    }

    private handleType(type:string, highType:string){
        if(!type){
            return '';
        }

        let htmlRegex = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/g;
        type = type.replace(htmlRegex, '').replace(' object or String', '').replace('Scoped ', '').replace(/\s/g, '');

        if(type === 'Array'){
            type = 'Array<any>';
        }
        if(type === 'JSON Array'){
            type = 'Array<object>';
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
        

        /**
         * See if the type is a "Class" it should show up in our ClassNames to add namespaces to, there are some odd cases like 
         * RESTResponse being declared as a return type for .execute() on RESTMessageV2 ... where they didn't specify the class but typed in RESTResponse..
         * of which we've handled manually by extending "sn_ws.RESTResponseV2" into RESTResponse
         * 
         */

        var nameSpace = this.snNameSpaces.getNameSpace(type, highType);
        if(nameSpace){
            type = nameSpace + '.' + type;
        }
        return type;
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
    private declareExtensions(tsDefFileContent:string, highType:string){

        /** Might consider making this it's own JSON File so we can load it in. Seperating Code from Data. */
        var extensionsMap:any = {
            server:<Array<SNClassExtensionMap>>
            [
                {
                    class:'RESTResponse',
                    extends: 'sn_ws.RESTResponseV2'
                },
                {
                    class:'gs',
                    extends:'GlideSystem'
                },
                {
                    class:'SOAPResponse',
                    extends:'sn_ws.SOAPResponseV2'
                },
                {
                    class:"$sp",
                    extends:"GlideSPScriptable"
                },
                {
                    class:"GlideRecordSecure",
                    extends:"GlideRecord"
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

        let currentMap = extensionsMap[highType];
        
        for(let i = 0; i < currentMap.length; i++){
            let extendData = currentMap[i];
            tsDefFileContent += '\n' + `declare class ${extendData.class} extends ${extendData.extends}{}`;
        }
        
        return tsDefFileContent;
    }
    
}

/**
 * Used to define the name spaces to wrap around ServiceNow APIs. For example, wrapping RESTMessageV2 with sn_ws
 * So that the code lookup works properly with sn_ws.RESTMessageV2
 * 
 * WARNING: Only put in ClassNames that REQUIRE namespace prefixing, such as sn_ws.RESTMessageV2()  but "RESTResponseV2" while in the namespace, is not contstructed on it's own.
 */
class SNNameSpaces {
    nameSpaces:any = {
        scoped:[],
        legacy:[],
        client:[]
    };

    constructor(){
        /** MAKE SURE TO READ WARNING IN DESCRIPTION BEFORE ADDING ADDITIONAL NAMESPACING! */
        /**Server SCOPED NameSpaces */
        
        
        this.nameSpaces.scoped.sn_auth = ["GlideOAuthClient","GlideOAuthClientRequest","GlideOAuthClientResponse","GlideOAuthToken"];
        this.nameSpaces.scoped.sn_cc = ["ConnectionInfo","ConnectionInfoProvider","StandardCredentialsProvider"];
        this.nameSpaces.scoped.sn_clotho = ["Client","Data","DataBuilder","Transformer","TransformPart","TransformResult"];
        this.nameSpaces.scoped.sn_cmdb = ["IdentificationEngine"];
        this.nameSpaces.scoped.sn_cmdbgroup = ["CMDBGroupAPI"];
        this.nameSpaces.scoped.sn_connect = ["Conversation","Queue"];
        this.nameSpaces.scoped.sn_discovery = ["DiscoveryAPI","ReportCiStatusOutputJS"];
        this.nameSpaces.scoped.sn_fd = ["Flow","Subflow"];
        this.nameSpaces.scoped.sn_hw = ["HistoryWalker"];
        this.nameSpaces.scoped.sn_interaction = ["Interaction","InteractionQueue"];
        this.nameSpaces.scoped.sn_nlp_sentiment = ["SentimentAnalyser"];
        this.nameSpaces.scoped.sn_notification = ["Messaging"];
        this.nameSpaces.scoped.sn_notify = ["Notify","NotifyPhoneNumber"];
        this.nameSpaces.scoped.sn_sc = ["CartJS","CatalogClientScript","CatalogItemVariable","CatlaogItemVariableSet","CatalogItemVariableSetM2M","CatalogJS","CatalogSearch","CatCategory","CatItem","OrderGuide","VariablePoolQuestionSetJS"];
        this.nameSpaces.scoped.sn_uc = ["UserCriteria","UserCriteriaLoader"];
        this.nameSpaces.scoped.sn_ws = ['RESTMessageV2','SOAPMessageV2',"RESTResponseV2","SOAPResponseV2"];
    }

    getNameSpace(className:string, highType:string){
        if(!className){
            return '';
        }

        var returnNameSpace = '';
        for(let nameSpace in this.nameSpaces[highType]){
            for(let i = 0; i < this.nameSpaces[highType][nameSpace].length; i++){
                let apiName = this.nameSpaces[highType][nameSpace][i];
                if(apiName === className){
                    return nameSpace;
                }
            }
        }

        return returnNameSpace;
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
    class:string;
    extends:string;
}