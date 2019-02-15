# Change Log
All notable changes to the "yansasync" extension will be documented in this file.


## [Unreleased]()
Features and Functionality that have been completed but not yet released. See [FeatureRoadmap.md]() for in progress items.

### Extension Functionality
#### Added
    - Will update this during next planning session
### Changed
    
### Removed

## [v0.5.0 (Current)]()

### Extension Functionality
#### Added

- Ability to update the default tables through the command pallet.
    - Flow 1: New Table 
        - Prompt which instance load tables, after select of instance load all sys_metadata tables. 
        - After selecting a table, prompt use with multi-select which fields they want to sync from that table. 
        - AFter selecting fields, for each field, ask what the extension for each field. 
        - Add to table config and make available for syncing records. 
        - Update local table configuration file with new config.
- When deleting an instance folder, it is now removed from the stored InstanceList. You can now resync an instance without reloading vscode!

#### Changed
- Fix bug for MAC OS Devices in reading/writing files and folders
- Fixed bug where if you deleted an instance folder it would not unload from the instance list, making it hard to re-sync
- Synced files folder paths updated so it is "App Name (app_scope)" for a bit easier readability. 

#### Removed
- Nothing

### Internal Extension Development

#### Added
- Added function to easily check if instances are loaded at all within the extension.ts file. Can be used as part of commands to show error messages when no instances loaded and are required for a given command.
- Added new class to SNDefaultTabls.ts : SyncedTableManager, used for managing the configured tables for a given instance. 
    - syncNew() - Handles the proccess for setting up a new table to be synced. 

#### Changed
- WorkspaceManager functions have been updated with general improvements such as storing the file names in readonly properties so i can update in one place if they ever change
    - Added functions for specific file wrting such as configJSON and configuredTablesJSON files. 
- SNDefaultTables re-arranged interface definitions so they were properly referring to the new Class definitions for "TableConfig" that have been around for a while. 
    - This was to resolve internal issues when trying to associate items and making sure methods were available when loading JSON file data. 

#### Removed
- Removed unused or no longer going to implement command registrations that were stubbed in for future planning.


## [v0.4.0]()
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


## [v0.1.0]()
Initial release just to test out updating, github publishing, etc and the like.
### Extension Functionality (Using this extension)
Below are features and functionality specific to "using" the extension. 
#### Added
- Setup new Instance.
    - Please view this [Instructional Video](https://youtube.com) on how to setup a new instance!
    - Will auto-create global scope and default folder tree.
- Multiple Instances in one Workspace.
- Test Connection
    - Allows for testing connectivity to an instance.
- Sync Record (No auto-file creation)
    - Sync a record, open it in a new file, does not save in file tree automatically.
- Logging level setting.
    - Can now adjust how noisy the logging is when executing commands! Can be useful for providing detailed information when bugs are found.

#### Changed
- Nothing changed, initial release!

#### Removed
- Nothing removed, initial release!

### Internal Extension Features (Devleoping this extension)
Below are features and functionality internal to development of this extension.
#### Added
- RESTClient
    - For handling RESTCalls to the SN Instance. Setup so we can easily get/retrieve records from our other calls
    - Will automatically handle authentication for whatever instance we are connecting to. 
- InstanceManager

#### Changed
