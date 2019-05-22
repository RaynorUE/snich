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

    logger:SystemLogHelper;
    lib:string = 'TSDefinitionGenerator';

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
        this.logger.info(this.lib, func, "Testing Statically First folder");
        let rootPath = wsFolders[0].uri.fsPath;

        let atTypesPath = path.resolve(rootPath, '@Types');
        let GlideSoftTypesPath = path.resolve(rootPath, '@Types', 'GlideSoft');
        //it's cloodgy for now, but we'll wipe @Types and regenerate everytime we execute this method. 
        if(!fs.existsSync(atTypesPath)){
            //create @TypesPath
            fs.mkdirSync(atTypesPath);
        }
        
        //wipe GlideSoft Folder and regenerate below. It's cloodgy I know... but since we're allowing .inactive, easier to manage this way. 
        if(!fs.existsSync(GlideSoftTypesPath)){
            fs.mkdirSync(GlideSoftTypesPath);
        }


        //using GlideSoft cause who doesn't like easter? ;)
        //let scopedTypesPath = path.resolve(rootPath, '@Types', 'GlideSoft', this.scopedTypesFileName);

        
        let SNCodeDefinitionsPath = path.resolve(context.extensionPath, 'dist', 'SNCodeDefinitions');

        let codeFiles = fs.readdirSync(SNCodeDefinitionsPath)

        for(let i = 0; i < codeFiles.length; i++){
            let tsDefJSONFileName = codeFiles[i];
            if(tsDefJSONFileName.indexOf('.json') > -1){
                //not a json file... skip it so things don't explode..
                continue;
            }


            let filePath = path.resolve(SNCodeDefinitionsPath, tsDefJSONFileName);
            let typeData:any = new WorkspaceManager(this.logger).loadJSONFromFile(filePath);

            var rootTSDefPath = path.resolve(rootPath, '@Types', 'GlideSoft', typeData.release || 'Other');

            //for each top level property create a unique file for each one.. (Scoped, legacy, client, etc);
            for(var highType in typeData){
                if(highType == 'release'){
                    continue; //they put this at the high level groupings.. 
                }
                let tsDefFilePath = path.resolve(rootTSDefPath, highType + '.d.ts');
                let tsDefFileInactive = path.resolve(rootTSDefPath, highType + '.d.ts.inactive');
                
            }
            this.createTSDefFile(typeData.scoped, scopedTypesPath);
            this.createTSDefFile(typeData.legacy, legacyTypesPath);
            this.createTSDefFile(typeData.client, clientTypesPath);
        }



        
        this.logger.info(this.lib, func, 'END');
    }

    private createTSDefFile(data:any, filePath:string){
        let func = 'createTSDefFile';
        this.logger.info(this.lib, func, 'START');
        let tsDefFileContent = '//SCOPED GlideSoft Definition File. In combination with JSConfig.json I provide you intellisense for ServiceNow APIs.\n\n\n';

        let spaces4 = '    ';

        var skipClientMethods = ['GlideRecord'];
        var isClientFile = filePath.indexOf(this.clientTypesFileName) > -1;

        //@TODO - Try to figure a way to handle the sn_ws prefixes and the like and wrap them in NameSpaces...
        // 

        for(let className in data){
            if(isClientFile && skipClientMethods.indexOf(className) > -1){
                continue;
            }
            let classData = data[className];
            let classDefinition = '';

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
            classDefinition += 'declare class ' + className.replace(' - Scoped', '').replace(' -', '') + ' {\n\n';

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
                    if(method.returns && method.returns.type && method.returns.type != 'void'){
                        classDefinition += spaces4 + ' * @returns ' + method.returns.description + '\n';
                        returnType = ': ' + this.handleType(method.returns.type);
                    }

                    classDefinition += spaces4 + ' */\n';
                    classDefinition += spaces4 + method.name + '(' + methodTSParams.join(', ') + ')' + returnType + ';\n\n';
                });
            }

            /*======= End Class Definition =======*/
            tsDefFileContent += classDefinition + '}\n\n';          
        }

        tsDefFileContent = this.addTSDefForFixing(tsDefFileContent);

        fs.writeFileSync(filePath, tsDefFileContent);
        this.logger.info(this.lib, func, 'END');
        
    }

    private fixParamName(paramName:String){
        if(!paramName){
            return '';
        }
        if(paramName == 'function'){
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
    
}