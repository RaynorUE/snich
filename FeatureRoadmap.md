# Diagrams and Command Flows

[__Object Hierarchy and Folder/File Structure__](https://www.lucidchart.com/invitations/accept/9311c598-a1ee-47b5-86a4-6a88d12fd003) - This document is intended to layout the details of the Internal Object Hiearchy used in the .json files. Additionally, it indicates the desired folder/file layout that will be created within the "Workspace folder". (_Apologies if this ends up a bit out of date sometimes_)

[__Command Flows__]() - This document will contain diagrams that help show the "process flow" for each command. I.e. Setup New Instance, Test connection, etc.

# Planned Feature Roadmap
This document is intended to indicate and layout the features we are planning to implement. It may be a bit rough and refined over time.. As features are completed here, they will be more "Nicely Worded" and moved to the Change Log release version that is currently planned for release.

## State Inidicators
    _Italic_: Not Started
    __Bold__: Work in progress
     Nothing: Feature complete

## [v0.5.6 (Current)]()

### Extension Functionality
#### Added
- _Compare With Server_
    - _Compare the active text editor with the server. If different, ask to view comparison and load up VSCode file comparer_
- _When showing the "compare/overwrite" options... indicate it's "overwrite server"_
- _When showing the compare/overwrite" options, add an option to "overwrite local file";    

#### Changed
- Configure New Synced Table
    - _Set label field for configured tables when configuring new table_
    - _Need to be able to select display field if name is not present. Idea here is to not always be asking for it... since name should be there most of the time_
        - Could do this check just before we "Pick what fields to sync" since we will be getting all the dictionary entries anyway
- No longer asks for instance If only one instance configured. #ClicksReducer
#### Removed


### Internal Extension Development

#### Added
- _Impelement a "CreateFileAsync" option for creatSyncedFile" function. Or wrap in a promise. Biggest thing, is performance when loading a lot of app files at once"_
- _Moved compare file functionality into it's own function, so it can be called from command pallet and also from onSave call. Unifying this code._
- _Need to consider converting the "InstanceList" into it's own class like "InstanceManager" or something... so that we can add helper mthoerds
    - Like being able to "Set as last selected", etc and managing that internally. 

#### Changed
- updated onWillSave observer so it calles the new compare function.
- Updated the "Show last selected instance at top of list, so that code is a bit cleaner and calling a singular function
    - Goal here is to start consolidating some of the "Show Quick Picks" that i'm doing... so when i update in one place it updates everywhere
    - Might add a method on InstanceMaster 
#### Removed



Organized Upcoming Ideas
==================================================================================
Section is intended as a sandbox for taking general notes and feature planning. Will eventually be organized into future versions (above)

## [Definitly going to implement]()

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
