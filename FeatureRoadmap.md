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
- SN Default Tables
    - Convert johns list to get people started. 
- Sync Application
    - Ask to sync all files. (hook into sync app files code) 
    - Hook into "file create" code, so that we can borrow the auto-folder creation functionality
- Sync All Application Files
    - Prompt for Instance > Application
    - Show Loading dialog and progress indicator. Need to test with big app if this will let us edit...
    - Also need to make sure we filter the files loaded based on the synced records... 
    - Will be hard to get counts first, so maybe we just show / update the total number of tables to sync and how many tables we've processed? 

    

## [Pretty Solid idea]()
- Annotate Table
    - Use defaults John has in current SyncTool
    - Break functionality into it's own file, so we can expand on over time. Right now it's simple but could see this growing. 
- When saving for a given application, flip to that application for them before saving!
- Delete All Files
    - Maybe make this a "Per Application Scope" thing? This can be useful if you're files get out of sync and you want to reload fresh.
- Set Update Set
    - Query and set accordingly. Maybe a warning letting them know it'll change it for all logged sessions
- Set Application
    - Set application accordingly, indicate via showMessage which update set is currently selected. 
    - Ability to set "per instance" the default / current app scope? This would coinside with the "Prompt App Scope" setting... To alleviate the asking all the time? Low priority...
- Compare With Server
    - Compare the active text editor with the server. If different, ask to view comparison and load up VSCode file comparer ... in a new column? 
- During Sync Record Ask them to pick app scope? or auto-detect based on synced file?  
        - if picking app scope, could greatly speed syncing... Would help eliminate some other issues like file names being the same..
        - Do we just allow picking from current "Synced apps" ... yea, lets...
        - Also, provide configuraiton setting to disable/enable this feature globally. 



## [Things to investigate]()
- sysparm_transaction_scope  ... does this put things in the right places???? also sysparm_record_scope
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
it'd be great if this would make me a salad on demand
## [Sublime Sync Features to Port]()



Core Functionality for Expansion
================================================================================
## ServiceNow_Config.json
- Contains details for instance
    - URL and Auth Detail
    - Contains folder tree hierarchy (Useful if needing to restore and all you have is the configjson..)

## REST Client
- Get Record
- Get Records
- Post Record
- Test Connection
- Set Basic Auth
- Set oAuth

## File Management
- Create New File
- Compare Contents