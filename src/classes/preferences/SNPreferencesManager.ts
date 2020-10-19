import { RESTClient } from '../RESTClient';
import { InstanceMaster, InstancePreferenceMap } from '../InstanceConfigManager'
import { WebBrowser } from '../WebBrowser';
import { SystemLogHelper } from '../LogHelper';

export class SNPreferencesManager {

    private TABLE_NAME = `sys_user_preference`;
    logger:SystemLogHelper;
    lib = "SNPreferencesManager";

    
    constructor(logger?:SystemLogHelper){
        let func = 'constructor';
        this.logger = logger || new SystemLogHelper();
        this.logger.info(this.lib, func, 'START');
                
        this.logger.info(this.lib, func, 'END');
    }

    async setPreference(instance: InstanceMaster, prefMap: InstancePreferenceMap, value:any) {
        let func = "setPreference";
        this.logger.info(this.lib, func, "ENTERING");
        let rClient = new RESTClient(instance);
        try {
            var encQuery = `name=${prefMap.name}^user.user_name=${instance.getUserName()}`;
            let prefExists = await rClient.getRecords(this.TABLE_NAME, encQuery, ["sys_id", "name"]);
            if(prefExists.length > 0){
                var pref = prefExists[0];
                let updateBody = {value:value};
                rClient.updateRecord(this.TABLE_NAME, pref.sys_id, updateBody, ["sys_id", "name"]);
            } else {
                let createBody = {
                    name:prefMap.name,
                    user:instance.getUserName(),
                    value:value,
                    description:prefMap.description
                }

                rClient.createRecord(this.TABLE_NAME, createBody, ["sys_id", "name"]);

            }
        } catch (e) {
            console.error('an error occured:', e);
        } finally {
            this.logger.info(this.lib, func, "LEAVING");
        }

        return "";
    }

    async getPreferenceValue(instance: InstanceMaster, prefMap: InstancePreferenceMap, userId: string): Promise<string> {
        let func = "getPreferenceValue";
        this.logger.info(this.lib, func, "ENTERING");
        let rClient = new RESTClient(instance);
        var encQuery = `name=${prefMap.name}^user.user_name=${instance.getUserName()}`;
        let prefExists = await rClient.getRecords(this.TABLE_NAME, encQuery, ["sys_id", "name", "value"]);
        let prefValue = "";
        if(prefExists.length > 0){
            let pref:any = prefExists[0];
            prefValue = pref.value;
        } else {
            this.logger.warn(this.lib, func, 'Unable to find preference data on instance!. ' + JSON.stringify(prefMap));
        }
        this.logger.info(this.lib, func, "LEAVING");
        return prefValue;
    }

    /**
     * Will go through all preferences in the preference map for the provided instance and clear the stored values.
     * @param instance The instance we are clearing the stored preferences for.
     */
    async clearStoredPreferences(instance:InstanceMaster) {
        
    }

    /**
     * Will open a window in default browser to the list of stored SNICH preferences for the instance provided.
     * @param instance The instance to open the preferences for
     */
    async openPreferenceListInInstance(instance:InstanceMaster){

        let prefUrl = `${instance.getURL()}/sys_user_preference_list.do?sysparm_query=nameLIKEvscode.extension.snich`;
        let wb = new WebBrowser(instance);
        wb.open(prefUrl);
    }
}

declare interface sys_user_preference {
    sys_id?: string;
    user: string;
    name: string;
    value: string;
    type?: "integer" | "reference" | "string" | "boolean";
    description?: string;
}