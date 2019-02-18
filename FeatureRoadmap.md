# Diagrams and Command Flows

[__Object Hierarchy and Folder/File Structure__](https://www.lucidchart.com/invitations/accept/9311c598-a1ee-47b5-86a4-6a88d12fd003) - This document is intended to layout the details of the Internal Object Hiearchy used in the .json files. Additionally, it indicates the desired folder/file layout that will be created within the "Workspace folder". (_Apologies if this ends up a bit out of date sometimes_)

[__Command Flows__]() - This document will contain diagrams that help show the "process flow" for each command. I.e. Setup New Instance, Test connection, etc.

# Planned Feature Roadmap
This document is intended to indicate and layout the features we are planning to implement. It may be a bit rough and refined over time.. As features are completed here, they will be more "Nicely Worded" and moved to the Change Log release version that is currently planned for release.

## State Inidicators
    _Italic_: Not Started
    __Bold__: Work in progress
     Nothing: Feature complete

## [v0.6.0 (Current)]()

### Extension Functionality
#### Added
- _SN Default Tables_
    - _Added John Andersen's list of default tables and fields. Also enhanced any tables where needed._
- _Compare With Server_
    - _Compare the active text editor with the server. If different, ask to view comparison and load up VSCode file comparer ... in a new column?_
    - _Compare on save. <-- This seems heavy every save, maybe start with comparing modified dates, and then if diff compare text?_
        - Ideally this will start to be best solved by implementing useage of Source Control... but non git? Is that even possible?
        
#### Changed

#### Removed


### Internal Extension Development

#### Added

#### Changed

#### Removed



Organized Upcoming Ideas
==================================================================================
Section is intended as a sandbox for taking general notes and feature planning. Will eventually be organized into future versions (above)

## [Definitly going to implement]()

- Sync Application
    - Ask to sync all files. (hook into sync app files code) 
    - Hook into "file create" code, so that we can borrow the auto-folder creation functionality
- Sync All Application Files
    - Prompt for Instance > Application
    - Show Loading dialog and progress indicator. Need to test with big app if this will let us edit...
    - Also need to make sure we filter the files loaded based on the synced records... 
    - Will be hard to get counts first, so maybe we just show / update the total number of tables to sync and how many tables we've processed? 
    - Show warning if files existed for tables not configured. Give button to open list of tables?
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
- Compare File to server, used in "on save" functionality. 
- On File Save
    - Actions to take when saving a file
        - Execute Compare record to server version code. 
        - If differences abort save
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
