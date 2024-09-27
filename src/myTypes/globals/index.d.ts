import { Uri, QuickPickItem } from "vscode";
import { InstanceMaster, SNSyncedFile } from "../../classes/InstanceConfigManager";



//===============================================

//========== SHARED ==============================
interface SNApplication {
    name:string,
    sys_id:string,
    sys_scope:string,
    fsPath:string
}

//========== SHARED ==============================


//========== START servicenow.json ===============

interface InstanceConnectionData{
    url:String,
    auth:InstanceAuthData
}

/**
 * @type oauth or basic
 */
interface InstanceAuthData {
    type: "" | "oauth-authorization_code" | "basic" |"oauth",
    writeBasicToDisk:boolean,
    username: string,
    password: string,
    OAuth: InstanceOAuthData,
}

interface InstanceOAuthData {
    client_id:string,
    client_secret:string,
    token: SNOAuthToken,
    lastRetrieved:number,
}

interface SNOAuthToken {
    scope:string,
    token_type:string,
    expires_in:number,
    refresh_token:string,
    access_token:string
}

//========== END servicenow.json ================

//========== START servicenow_sync_data.json ===============


interface InstanceAppSyncData {
    files:Array<SNSyncedFile>,
    application:SNApplication,
}

//========== END servicenow_sync_data.json ===============


//========== START ServiceNow Table Config ================

interface snDefaultTables {
    configured_tables:Array<String>,
    tables:Array<snTableConfig>,
}

interface snTableConfig {
    name:string,
    display_field:string,
    fields:Array<snTableField>,
    children:Array<snTableConfig>,
}

interface snTableField {
    table:string,
    name:string,
    label:string,
    extention:string,
}

//========== END ServiceNow Table Config ================

//========== START ServiceNow Record Config =============

interface snRecord {
    name:string,
    label:string,
    sys_id:string,
    sys_scope?:string,
    sys_package?:string,
    internal_type?:string,
    element?:string,
    column_label?:string,
    "sys_scope.name"?:string,
    scope?:string
    short_description?:string,
}

interface snRecordDVAll {
    [key: string]: DVAllField
}

interface DVAllField {
    value: string,
    display_value: string
}

interface SNQPItem extends QuickPickItem {
    value:any,
}



//============ End ServiceNow Record Config =============