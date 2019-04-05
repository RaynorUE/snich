# Diagrams and Command Flows

[__Object Hierarchy and Folder/File Structure__](https://www.lucidchart.com/invitations/accept/9311c598-a1ee-47b5-86a4-6a88d12fd003) - This document is intended to layout the details of the Internal Object Hiearchy used in the .json files. Additionally, it indicates the desired folder/file layout that will be created within the "Workspace folder". (_Apologies if this ends up a bit out of date sometimes_)

[__Command Flows__]() - This document will contain diagrams that help show the "process flow" for each command. I.e. Setup New Instance, Test connection, etc.

# Planned Feature Roadmap
This document is intended to indicate and layout the features we are planning to implement. It may be a bit rough and refined over time.. As features are completed here, they will be more "Nicely Worded" and moved to the Change Log release version that is currently planned for release.

## State Inidicators
    _Italic_: Not Started
    __Bold__: Work in progress
     Nothing: Feature complete

## [v0.5.8 (Current)]()

### Extension Functionality
#### Added
- _Update File From Server_
    - Ability to update a file from the server without having to go through the entire "Sync Record" process. 


#### Changed
- Configure New Synced Table
    - _Need to be able to select display field if name is not present. Idea here is to not always be asking for it... since name should be there most of the time_
        - Could do this check just before we "Pick what fields to sync" since we will be getting all the dictionary entries anyway
- Configure New Synced Table
    - Now Caches tables. Will only update cache when the count of "sys_metadata" tables varies from instance.
- Sync Record
    - Table Selection: Just notating that if a table in the global config does not exist on instance, it will not show!
    - Sync Record: Will cache records from instance and instead perform "Count" diffs to see if it should rebuild the list. 
        - NOTE: This cache is only in memory, every reload, close/open of VSCode will reset this cache, so first file sync will be a bit slower. 
- _Update the "Tables query" to be "INSTANCEOFsys_metadata" instead of =  so we get children tables. 
- _Sync Record - When syncing a record, you can now select multiple files!_
- _Sync Record - When syncing, we now show if that record is active or not (if it has an active field)_

#### Removed


### Internal Extension Development

#### Added

#### Changed
- _Fixed so pick lists are built based on display value field instead of just name field_

#### Removed



Organized Upcoming Ideas
==================================================================================
Section is intended as a sandbox for taking general notes and feature planning. Will eventually be organized into future versions (above)

## [Definitly going to implement]()

- Global Default Table Config (In root of workspace folder. Add new command for config global default table.)
    - Instance Specific tables override global.
- Update existing "Configure Synced Table" functionality to create a global defaults on first instance setup. 
- Update Current command to be "Configure table for instance"
- Open in Browser 
    - Opens record in web browser to do anything you can't do in here. 
    

## [Pretty Solid idea]()
- Annotate Table
    - Use defaults John has in current SyncTool
    - Break functionality into it's own file, so we can expand on over time. Right now it's simple but could see this growing. 
- Delete All Files
    - Maybe make this a "Per Application Scope" thing? This can be useful if you're files get out of sync and you want to reload fresh.
- Set Update Set
    - Query and set accordingly. Maybe a warning letting them know it'll change it for all logged sessions
- Set Application
    - Set application accordingly, indicate via showMessage which update set is currently selected. 
    - Ability to set "per instance" the default / current app scope? This would coinside with the "Prompt App Scope" setting... To alleviate the asking all the time? Low priority...


## [Things to investigate]()
- sysparm_transaction_scope  ... does this put things in the right places???? also sysparm_record_scope
        - Update success save message with current update set name.
- Ability to "Get entire record JSON" for direct / manual editing and syncing back to instance. 
    - Need to think about file/folder structure here... Same naming scheme as tableconfig for table, and just .json extension... Yea!


Nates Sh*t show
==================================================================================
Place to store random ideas and notes as i come up with them. To then be organized into upcoming (above)

## [Less Random Ideas]()

## [Random Ideas]()
Ability to view record within vscode and not have to leave? 
Do we just use the JSON ability for non-configured tables when syncing an entire app??? Probably not... 
Though, an ability to pull down an 


## [Sublime Sync Features to Port]()
