# NOW Code Manager
This application is intended to accelerate and increase the efficiency of working with ServiceNow Records(files) that have some kind of scripting, coding, or html to them. The primary reason is that vsCode offers considerably more rich editing environment as compared to ServiceNows embedded editors.

## [Instructional Videos](https://www.youtube.com/playlist?list=PLp0BtdkD38PWd9PTib4OgRaTQ3SIQDE17)

# Release Notes
## [v0.4.0 (Current)]()
Added some good nuggest here. Lots of baseline functionality added and more to come!
### Extension Functionality
#### Added
- Table Defaults now read from servicenowTableConfig.json file.
- Configuration option for indicating "Always prompt for app scope" which will be used in filtering, else will "show all files regardless of app scope".
- Syncing Records back to SN On File Save!
    - Save File back to SN.
    - Shows Success Message. 
- servicenow_synced_files.json
    - This file stores the information for every file synced for a given instance. DO NOT MODIFY THIS FILE. 
    - __Warning:__ Renaming folders, files, or moving any files / folders will cause saving for a given file to break. Suggested solution is to delete file and re-sync.
        - However, moving your "Instances to another top level (workspace) folder will not have any adverse affects.


#### Changed
- New Instance Setup
    - No longer auto-creates folders based on default folder config. Instead, will now create folders as you sync records. 
- Sync record 
    - renamed to to "Sync Record (Pull)".
    - Now only allows syncing from configured tables. 
    - Now saves into appropriate application folder tree.
    - If table has multiple fields configured, it will now perform the following
        - create a folder with the "files display field".
        - then saves a file for every configured synced field where the file names are the labels of the synced fields.
    - If table has singular field configured (such as script includes) it will perform the following
        - Create the file in the table_name folder with format of _display_field_value_._extension_
- servicenow_config.json
    - Renamed this to be more in line with it's usage
- servicenow_table_config.json
    - Renamed this to be in line with other naming scheme and it's usage. 

#### Removed
- Nothing

### Internal Extension Development

#### Added
- InstanceConfigManager class. Primarily used for high level instance management within extension.

#### Changed
- Sync Record Functionality has been moved to the new SNRecordPuller class and code has been tidied up_

#### Removed
- General Cleanup of redundant and unused files.

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


## [Test Connection]()
Once an instance has been configured, you can execute the test connection command to verify connectivity. This will be automatically executed during the New Instance setup process. 

# Requirements

## Required Software
### [ServiceNow Intsance](https://www.servicenow.com)
You must have access to a ServiceNow.com instance in order for this extension to work. If you're company does not have one or provide you access, you can [sign up for a FREE personal developer instance](https://developer.service-now.com).

### [Needle.js Node Application]()
Need to still test if this has to be installed manually or can be included as part of the extension.

# Known Issues

- Aborting mid-flight of New Istance Setup causes some whacky behavior where it leaves things half-setup. 
- Aborting mid-flight of sync record opens an empty record and general weirdness. 

# Release Notes
> See change Log
---------------------------------------------------------------------------------------------------