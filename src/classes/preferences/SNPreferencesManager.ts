import { RESTClient } from '../RESTClient';
import { InstanceMaster, InstancePreferenceMap } from '../InstanceConfigManager'

export class SNPreferencesManager {

    private TABLE_NAME = `sys_user_preference`;

    constructor() {
    }

    async setPreference(instance: InstanceMaster, prefMap: InstancePreferenceMap, value:any) {
        let rClient = new RESTClient(instance);
        try {
            var encQuery = `name=${prefMap.name}^user.user_name=${instance.getUserName()}`;
            let prefExists = await rClient.getRecords(this.TABLE_NAME, encQuery, ["sys_id", "name"]);
            if(prefExists.length > 0){
                var pref = prefExists[0];
                let updateBody = {value:value};
                rClient.updateRecord(this.TABLE_NAME, pref.sys_id, updateBody);
            } else {
                let createBody = {
                    name:prefMap.name,
                    user:instance.getUserName(),
                    value:value,
                    description:prefMap.description
                }

                rClient.createRecord(this.TABLE_NAME, createBody);

            }
        } catch (e) {
            console.error('an error occured:', e);
        }
        return "";
    }

    async getPreference(instance: InstanceMaster, prefMap: InstancePreferenceMap, userId: string): Promise<string> {
        let rClient = new RESTClient(instance);
        var encQuery = `name=${prefMap.name}^user.user_name=${instance.getUserName()}`;
        let prefExists = await rClient.getRecords(this.TABLE_NAME, encQuery, ["sys_id", "name"]);
        let prefValue = "";
        if(prefExists.length > 0){
            let pref:any = prefExists[0];
            prefValue = pref.value;
        } else {
            throw new Error('Unable to find preference data on instance!. ' + JSON.stringify(prefMap));
        }
        return prefValue;
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