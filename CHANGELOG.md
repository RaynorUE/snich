# Change Log

Welcome to the Change Log! Here is where you will find all the juicy details of the changes from version to version! Including minor versions!

## [v1.0.2](#)

For those of us with some "global scope, custom applications" (When you create a scoped app in legacy/global), we felt you needed some love! So we added the ability to sync records from "Legacy / global scope, scoped apps!"

### Added

- Example scripts for Type-ahead now available!
- Additional "Default Tables" that are setup upon initial instance setup.
- Added $sp as an extension of GlideSPScriptable 
  - If you add JSDoc tags to your widget server scripts it should pick up $sp properly. 

### Changes

- Updated the "Default Tables" upon instance creation to be a bit more robust.

### Fixes

- Fixed issue where "widget" table definition for CSS Files were using `css` instead of `scss` extension. 

## [v1.0.1](#)
For those of us with some "global scope, custom applications" (When you create a scoped app in legacy/global), we felt you needed some love! So we added the ability to sync records from "Legacy / global scope, scoped apps!"

### Added
- You can now sync "Custom Applications" from the "global/legacy" scope!

### Changed
- Fixed issue when using oAuth to better highlight that you're token has expired when re-asking for your password 

## [v1.0.0](#)
Awwww yea baby!! Version 1.0.0! This last update brings one of the majore milestones I wanted to get in before calling it Version 1.0.0!! 

### Added
- > Now we have IntelliSense for ServiceNow Code! Auto-Completion in the house, what what????
- Will now tell you that it's "Activated" and what instances it found and loaded for syncing.

### Changed
- Table config no longer cares if you put a "." symbol in your extension when setting up the fields to be synced!
- Will properly throw a warning and abort table config when aborting before the end.
    - This is preventing a weird state in which you could have an empty table config and nothing can sync for that table. 

## [v0.7.1](#)
### Fixes
- Fixed issue where when re-querying for configured tables against an instance we're still filtering on sys_metadata... doh...

## [v0.7.0](#)
### Changed
- Sync Record now uses sys_scope AND sys_package. This way you can see what OOB Files are associated to particular apps. 
- Sync Record now uses all the "Display Fields" you selected when configuring the table as the display name shown to you in the pick list. 
    - Lemme know how this goes... Might add a setting for this!

### Fixes
- __I DID IT!__ (I think). Issue regarding "Saving files no longer updating ServiceNow" (aka the onWillSave Issue) has been resolved!
- Setup New Instance and Test Connection now show the HTTP Error information if available.
    - This is to help with "unauthorized" to let you know you typed in your ID/PW incorrectly. 
- Random issue where sys_ui_context_menu did not load records. Turns out this was "null values" used in building the file names. Now handles null values properly, but could cause you some weird file names..
    - Double check your display value config for a given table!
- When using older file structures before "Additional Display Fields" functionality, 
- Fixed some of the settings names and descriptions not showing correctly.


## [v0.6.1](#)

### General
- Removed the "Internal development" changelog since Git will handle that for us with pull/merge requests and internal diff management. 
- Updated changelog structure to flow a bit nicer.
- Another middle-tier milestone! Big features and getting closer to 1.0.0 this release! Once we fix that dasterdly save issue and a few other tweaks we'll be looking to release 1.0.0!!


### Added
- NEW! When Configuring a new table to be synced (or updating an existing one) you can now select additional display fields!
    - Now Uses these additional display fields in File Name generation (or Folder name if table syncs multiple fields. ex: sp_widget);
        - See SNICH Settings to identify or change the field seperator. Remember your file system will complain about certain characters! 
    - __NOTE:__ if the table being synced doesn't have a name field it will ask you what field to use for the primary display fields. 
        - Adjust SNICH Settings to always ask you for Primary display field.
- Sync Record
    - Can now select multiple files! Use setting to disable this and go back to "one file at a time mode"
- Will now display warning on "Activation" of extension (ie. loading vscode) letting you know if your log level is still set below warnings. 
    - This is to reduce log noise, and also improve overall performance when you're not debugging or sending me your logs to fix issues.
### Changed
- Updated REST API Calls to use gzip. Making things a tiny bit snappier.
- Updated "Configure Table" so that it included all parent field names
- Updated "Configure Table" so that it now allow selecting child tables (like sysauto_script from sysauto)
- Sync Record file list will now use thew new "Display Value" based on fields above.
- Sync Record file list now sorted by "sys_updated". This way your recent files are on top!

### Fixed
- Fixed issue where proxed/custom SN Urls were not being picked up correctly when saving files. Causing saves to fail.
- Files with Same Name name overwrite each other when syncing. (See new Display Value feature).

## [v0.5.7](#)

### Extension Functionality

#### General
- Now using webpack to compile extension before publishing. Making the JavaScript file(s) generated super tiny. 
- With webpack unifying into a single JS file, expect this extension to Active/Load much faster!


## [v0.5.6]()

### Extension Functionality

#### General
- Re-wrote many internal functions using async/await instead of pure Promises. Should be noticeable speed improvements!

#### Added
- Compare With Server
    - Compare when you want to! Now you can compare the active editor window with the file on the sever!!
    - Check out the new command in the command pallete!!
- General polish and cleanup. Such as warning messages when abandoning commands that have multiple steps. For example, if you abandoned new instance setup on the authentication step it will let you know!

#### Changed
- Configure New Synced Table
    - Set label field for configured tables when configuring new table_
- No longer asks for instance If only one instance configured. #ClicksReducer
- Compare with Server funcitionality
    - You will now be able to tell the difference on where you're overwriting!
    - New overwrite option! Overwrite (Local)

#### Removed


### Internal Extension Development

#### Added
- Moved compare file functionality into it's own function, so it can be called from command pallet and also from onSave call. Unifying this code.
- Converted InstanceList array to it's own class with it's own help methods. 
    - Added tons of useful functions here. 

#### Changed
- updated onWillSave observer so it calles the new compare function.
- Updated the "Show last selected instance at top of list, so that code is a bit cleaner and calling a singular function
    - Goal here is to start consolidating some of the "Show Quick Picks" that i'm doing... so when i update in one place it updates everywhere
    - Might add a method on InstanceMaster 
- Updated log function to try and detect if there is a password being logged and indicate that we're not logging the data due to risk of logging a password value.
- Consolidated SNInstanceConfig class into InstanceMaster (was redundant to have them seperate)
- Added bunch of helper functions to the SNInstanceConfig

#### Removed
- SNInstanceConfig class
    - Removed since it was consolidated. 


## [v0.5.5]()

### Extension Functionality
#### Added
- New Name! Welcoem to SNICH! The Service Now Integrated Code Helper!
- Compare on save
    - Files will now compare their contents against the server version upon save. If different, you will be prompted to compare or overwrite!
- Sync All Application Files
    - If doing scoped app dev work, you can now choose a scoped app and have it sync every file.
    - Will only sync files for configured tables. If you see missing records, verify table is configured for syncing. 

#### Changed
- Any commands asking for instance first, will move the last used instance to the top.
- Move the config files into a .vscode folder inside their instance folder, this seems to be what some extensions do to store things and keep the files out of the root
- Rename config / settings / etc files in new .vscode folder to be prefixed with SNICH, making it unique, and also in line with new name. 
- FIXED: Mac OS Writing the server file for temp storage on compare no working cause it's trying to savein "root"

#### Removed


### Internal Extension Development

#### Added
- pullAllAppFiles to SNRecordPuller

#### Changed
- Made adjustments to how i'm handling the files/folders and settings storage. 
- More to come on making internal instanceList and Files List Management a bit easier. 
- Working on Migrating watchers into their own functions and calling accordingly through loadObservers() workspace method. 

#### Removed

## [v0.5.0]()

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
