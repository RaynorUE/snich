# NOW Code Manager
This application is intended to accelerate and increase the efficiency of working with ServiceNow Records(files) that have some kind of scripting, coding, or html to them. The primary reason is that vsCode offers considerably more rich editing environment as compared to ServiceNows embedded editors.

## [Instructional Videos](https://www.youtube.com/playlist?list=PLp0BtdkD38PWd9PTib4OgRaTQ3SIQDE17)

# ==== READ ME FIRST ====
>Due to changes in the synced files config file, you will need to delete and re-sync your instances. 

Hoping to keep this down to a minimum!!! Should not see too many more changes in files!

# Release Notes
>See the change log for details.

# Tips
Everything is done through the command pallete (Ctrl+Shift+P, or CMD+Shift+P on macs). Once launching the command pallete type in SNICH to see a list of all the available commands. 

# First Time Setup

### Extension Activation
- First Time Setup
    - Refer to the setup section, as no other commands will work until an instance is setup.
- Automated Activation
    - Will automatically activate if you load a folder with existing instance configurations
# Features

## [Setup New Instance]()
Will kick off new instance configuration. Asking for the following information.
>Note: Multiple Instances supported. Will create a unique instance folder inside your workspace folder.
- Instance name
- Authentication Type
    - Basic (Warning: Will store ID and PW unencrypted. Be sure your computer is secure.)
        > Requires UserName and Password
    - oAuth (Stores oAuth info unencrypted, but we DO NOT store your password at all in this scenario.);
- Authentication Information
    - Depending on auth type selected, it will ask for the appropriate authentication information.

## [Configure Table (New and Update)]()
After setting up an intance. You will want to run this action allows to configure additional tables to sync records from. 

When executing this command it will perform the following.
1. Ask which instance you want to configure a table for. 
2. List all tables extended from "Application File (sys_metadata)" found on that instance. 
3. After selecting a table, it will retrieve all fields for that table and ask you to select which fields you want to sync.
4. After selecting the various fields you want to sync, it will ask you to enter a file extension for each field being synced. Take note of the [field_type] to help guide you to which extension to use. 
5. Once done, you can use "Sync Record" to sync records from this table. 

## [Test Connection]()
Once an instance has been configured, you can execute the test connection command to verify connectivity. This will be automatically executed during the New Instance setup process. 

## [Sync Record (Pull)]()
Sync a record from a configured instance. Executing this command will perform the following.

1. Asks which instance you wish to sync a record from the list of configured instances you setup.
2. Asks which record type you want to sync from that instance. This is based on the tables configured for that instance. 
3. Asks which record from that table you want to sync. 
4. Will create a folder named the table_name within the instance folder. 
5. Create file(s) based on following criteria.
    - If only one field from that table is configured for syncing, you will have a file in that folder named after the record to be synced. 
    - If multiple fields are configured for that table, a folder will be created that is the "Name of the sycned record" and then individual files will be created for each field for that record. 

## [Load all Application Files (Pull)]()
This command will sync all application files for each configured table for the selected application. 
>Note: There is a setting to adjust whether you can pull sn_ scoped applications or not. 

Executing this command will perform the following:
1. Ask which instance to load application files from.
2. Ask which application on that instance to load. 
3. Starts syncing all files for that application for each configured table.
4. __Note:__ You may need to refresh your workspace explorer for all the folders/files to show up.

## [Compare with Server (Active Editor)]()
This command will compare the active text editor with the associated server file. If the files are the same the compare window will not be loaded. 

Executing this command will perform the following:
1. Attempt to retrieve the server content for the file in the active text editor. 
2. Compare the text in the text editor (not on disk) with the server content.
3. If content is different it will launch the vscode file compare window. 


# Requirements

## Required Software
### [ServiceNow Intsance](https://www.servicenow.com)
You must have access to a ServiceNow.com instance in order for this extension to work. If you're company does not have one or provide you access, you can [sign up for a FREE personal developer instance](https://developer.service-now.com).

### [Needle.js Node Application]()
Need to still test if this has to be installed manually or can be included as part of the extension.

# Known Issues
Below are known issues and workarounds for them.

- Load All Application Files overwrites all files if i re-load an application.
    - >__Workaround__: Save your files before reloading. Working on a more long term / permanent fix for this.
- Sometimes when loading new files the File Explorer is not refreshed and the file/folder may not be immediately visible. 
    - This seems to be better as of the latest version... keep an eye on it and let us know if it keeps happening.
    - >__Workaround__: Expand/Collapse the instance folder or use the refresh button on the grey bar just above your instance name (the workspace folder header).

---------------------------------------------------------------------------------------------------