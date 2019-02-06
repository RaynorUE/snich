import { snTableConfig, snTableField } from "../myTypes/globals";

export class SNDefaultTables {
    tables:Array<snTableConfig> = [];
 
    constructor(){

        //==== sys_script ======
        let sys_script = new TableConfig('sys_script');
        sys_script.setDisplayField('name');
        sys_script.addField('script', 'Script', 'js');
        this.tables.push(sys_script.getTableConfig());

        //==== sp_widget ========
        let sp_widget = new TableConfig('sp_widget');
        sp_widget.setDisplayField("name");
        sp_widget.addField('template', 'Body HTML template', 'html');
        sp_widget.addField('css', 'CSS', 'css');
        sp_widget.addField('script', 'Server Script', 'js');
        sp_widget.addField('client_script', 'Client script', 'js');
        sp_widget.addField('link', 'Link', 'js');
        sp_widget.addField('demo_data', 'Demo data', 'json');
        sp_widget.addField('option_schema', 'Option schema', 'json');
        this.tables.push(sp_widget.getTableConfig());

        let sys_script_include = new TableConfig('sys_script_include');
        sys_script_include.setDisplayField('name');
        sys_script_include.addField('script', 'Script', 'js');
        this.tables.push(sys_script_include.getTableConfig());
    }
}

class TableConfig{
    tableConfig:snTableConfig = {
        name:"",
        display_field:"",
        fields:[],
        children: []
    };
    constructor(name:string){
        this.tableConfig.name = name;
    }

    setDisplayField(fieldName:string){
        this.tableConfig.display_field = fieldName;
    }

    addField(name:string, label:string, extension:string){
        this.tableConfig.fields.push(<snTableField>{
            name: name,
            label: label,
            extention: extension
        });
    }

    addChildTable(tableConfig:snTableConfig){
        this.tableConfig.children.push(tableConfig);
    }

    getTableConfig(){
        return this.tableConfig;
    }
}
