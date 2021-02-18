import * as vscode from 'vscode';
import { SystemLogHelper } from '../../classes/LogHelper';
import { InstanceFileMan } from '../../FileMan/InstanceFileMan';
import { WSFileMan } from '../../FileMan/WSFileMan';
import { SNICHConnection } from '../SNICHConnection/SNICHConnection';
import { SNICHInstancesService } from './SNICHInstancesService';

export class SNICHInstance {
    private data: SNICHConfig.Instance = {
        _id: undefined,
        name: "",
        rootPath: {
            path: "",
            fspath: ""
        },
        last_selected: 0
    };

    logger = new SystemLogHelper();
    type = "SNICHInstance";

    connection: SNICHConnection;

    constructor(logger: SystemLogHelper, data?: SNICHConfig.Instance) {
        // If data is supplied, (likely called from instance selection) then use it!
        if (data) {
            this.data = data;
        }
        this.connection = new SNICHConnection(logger);

    }

    async load() {
        var func = 'load';
        this.logger.info(this.type, func, "ENTERING");

        let result: boolean | undefined = false;
        const iService = new SNICHInstancesService(this.logger);
        //how many total?
        const count = await iService.count();
        if (count == 1) {
            let snInstances = await iService.getMultiple();
            this.setData(snInstances[0]);

            this.connection = new SNICHConnection(this.logger);
            var id = this.getId();
            if (id) {
                this.logger.info(this.type, func, "Have id, loading connection for instance: ", id);
                await this.connection.load(id);
                result = true;
            }
        } else {
            result = await this.selectInstance();
        }

        this.logger.info(this.type, func, `LEAVING`);
        return result;
    }

    async save() {
        var func = 'save';
        this.logger.info(this.type, func, `ENTERING`);
        const iService = new SNICHInstancesService(this.logger);
        if (this.data._id) {
            await iService.update(this.data._id, this.getData());
        } else {
            let insertResult = await iService.insert(this.getData());
            if (insertResult) {
                this.setData(insertResult); //so we store _id in class/memory
            }
        }
        this.logger.info(this.type, func, `LEAVING`);
    }


    async selectInstance(): Promise<boolean | undefined> {
        var func = 'selectInstance';
        this.logger.info(this.type, func, "ENTERING");

        var res = undefined;

        try {

            let instanceQPs: qpWithValue[] = [];

            let iService = new SNICHInstancesService(this.logger);
            let instances = await iService.getMultiple({}, [['sort', { last_selected: -1 }]]);
            if (instances && instances.length > 0) {
                instanceQPs = instances.map((instance) => {
                    let qp: qpWithValue = {
                        value: instance,
                        label: instance.name,
                    }
                    return qp;
                })
            } else {
                throw new Error('Got here but no instances configured!');
            }

            let selectedQp = await vscode.window.showQuickPick(instanceQPs, { ignoreFocusOut: true, placeHolder: "Select instance" });
            if (selectedQp) {
                this.setData(selectedQp.value);
                this.connection = new SNICHConnection(this.logger);
                await this.connection.load(this.getId());
                res = true;
            } else {
                res = false;
            }


        } catch (e) {
            this.logger.reportException(this.type, func, e);
            res = undefined;
        } finally {
            this.logger.info(this.type, func, "LEAVING");
        }

        return res;
    }

    /**
     * go through all the various setup questions and process for configuring a new SNICH Instance.
     */
    async setup(): Promise<boolean> {
        var func = "setup";
        this.logger.info(this.type, func, "ENTERING");

        let result = false;

        //to save as we go.
        const iService = new SNICHInstancesService(this.logger);

        let yesNo: qpWithValue[] = [{ label: "$(thumbsup) Yes", value: "yes" }, { label: "$(thumbsdown) No", value: "no" }];

        let enteredInstanceValue = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: `Enter Instance Name or URL.`,
            placeHolder: "https://dev00000.service-now.com",
            validateInput: (value) => this.inputEntryMandatory(value)
        });

        if (!enteredInstanceValue) {
            return this.abortSetup('No instance name or url entered.');
        }

        let instanceUrl = this.connection.getURL() || ``;

        if (enteredInstanceValue.indexOf('http://') > -1 || enteredInstanceValue.indexOf('https://') > -1) {
            //instance entered IS a URL.
            instanceUrl = enteredInstanceValue;
        } else if (enteredInstanceValue.indexOf('.') > -1) {
            //instance entered is not a FULL Url with protocol... add it..
            instanceUrl = `https://${enteredInstanceValue}`;
        } else {
            //last assumption is entered was JUST an instance name..
            instanceUrl = `https://${enteredInstanceValue}.service-now.com`;
        }

        let validateInstanceURL = await vscode.window.showQuickPick([...yesNo], { ignoreFocusOut: true, placeHolder: `Continue with instance url? ${instanceUrl}` });
        if (!validateInstanceURL) {
            return this.abortSetup();
        }

        if (validateInstanceURL.value == "no") {
            this.logger.info(this.type, func, "LEAVING");
            return this.setup(); //exit and start setup over again.
        }

        this.connection.setURL(instanceUrl);

        // Validate folder name. Giving an opportunity to change.
        let fixedInstanceName = this.getName() || instanceUrl.replace('https://', '').replace(':', '_');

        let instanceName = await vscode.window.showInputBox({ prompt: `Enter a folder name to use.`, ignoreFocusOut: true, value: fixedInstanceName, validateInput: (value) => this.inputEntryMandatory(value) });
        if (!instanceName) {
            return this.abortSetup('No folder name specified.');
        }

        this.setName(instanceName);

        let foundInstance = await iService.get({ name: this.getName() });

        if (foundInstance) {
            this.logger.debug(this.type, func, "Found instance!", foundInstance);
            let continueConfig = await vscode.window.showQuickPick(yesNo, { ignoreFocusOut: true, placeHolder: `Instance found by name [${this.getName()}]. Continue and reconfigure instance?` });
            if (!continueConfig) {
                this.logger.info(this.type, func, "LEAVING");
                return this.abortSetup();
            }

            if (continueConfig.value == 'yes') {
                this.setData(foundInstance);
                const dataSoFar = this.connection.getData();
                await this.connection.load(foundInstance._id);
                this.connection.setURL(dataSoFar.url);
                this.connection.save();
            } else {
                this.logger.info(this.type, func, "LEAVING");
                return this.setup();
            }
        } else {
            /**
             * @todo, i think issue is we are smashing over data, wit
             */
            await this.save();
            const dataSoFar = this.connection.getData();
            await this.connection.load(this.getId());
            dataSoFar._id = this.connection.getId();
            this.connection.setData(dataSoFar);
            await this.connection.save();

        }

        let authResult = await this.connection.setupAuth();
        if (!authResult) {
            this.logger.info(this.type, func, "LEAVING");
            return this.abortSetup('Auth setup failed miserably. Please try setting up instance again.');
        }

        let wsFileman = new WSFileMan(this.logger);
        const wsRoot = wsFileman.getWSRootUri();
        if (!wsRoot) {
            this.logger.error(this.type, func, 'For some reason we got here without a workspace root... we should have checked all that before now..')
            return this.abortSetup('No workspace loaded. Please load a folder to use as your workspace.');
        }

        this.setRootPath(vscode.Uri.joinPath(wsRoot, this.getName()));


        let iFileMan = new InstanceFileMan(this.logger);
        await iFileMan.createInstanceRoot(this.getRootPath());

        this.logger.debug(this.type, func, "All done. Saving instance and connection data!");
        await this.save();
        await this.connection.save();

        this.logger.info(this.type, func, "LEAVING");
        vscode.window.showInformationMessage('Instance setup success! Time to start syncing files!');
        return result;
    }

    setName(name: string) { this.data.name = name }
    getName() { return this.data.name }


    abortSetup(msg?: string) {
        vscode.window.showWarningMessage('Instance setup aborted. ' + (msg || ""));
        return false;
    }

    setId(id: string) { this.data._id = id }
    getId() { return this.data._id }

    setRootPath(uri: vscode.Uri) {
        this.data.rootPath.fspath = uri.fsPath || "";
        this.data.rootPath.path = uri.path || "";
    }
    getRootPath(): vscode.Uri {
        return vscode.Uri.parse(this.data.rootPath.path);
    }

    setConnection(conn: SNICHConnection) {
        this.connection = conn;
    }

    getConnection() { return this.connection }


    /**
     * Set the internal data object from some source DB, JSON file, etc.
     * @param data Data loaded from somewhere
     */
    setData(data: SNICHConfig.Instance) {
        //de-reference
        const newData = { ...data };
        this.data = newData;
    }

    getData() {
        return this.data
    }

    inputEntryMandatory(value: any) {
        if (!value) {
            return 'Entry required.';
        } else {
            return null;
        }
    }
}



declare interface qpWithValue extends vscode.QuickPickItem {
    value: any;
}