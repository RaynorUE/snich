# Diagrams and Command Flows

[__Object Hierarchy and Folder/File Structure__](https://www.lucidchart.com/invitations/accept/9311c598-a1ee-47b5-86a4-6a88d12fd003) - This document is intended to layout the details of the Internal Object Hiearchy used in the .json files. Additionally, it indicates the desired folder/file layout that will be created within the "Workspace folder". (_Apologies if this ends up a bit out of date sometimes_)

[__Command Flows__]() - This document will contain diagrams that help show the "process flow" for each command. I.e. Setup New Instance, Test connection, etc.

# Planned Feature Roadmap
This document is intended to indicate and layout the features we are planning to implement. It may be a bit rough and refined over time.. As features are completed here, they will be more "Nicely Worded" and moved to the Change Log release version that is currently planned for release.

## State Inidicators
    _Italic_: Not Started
    __Bold__: Work in progress
     Nothing: Feature complete

## [v0.2.0 (Current)]()

### Extension Functionality
#### Added
- _Table Defaults now read from servicenowTableConfig.json file._
- _Ability to update the default tables through the command pallet._
    - _Flow 1: New Table 
        - _Prompt which instance load tables, after select of table load all fields for table_
        - _Prompt use to pick a field to sync (Field name - (type ?? Maybe limt types)), make first Selection "Sync All - as JSON"_
- _Configuration option for indicating "Always prompt for app scope" which will be used in filtering, else will "show all files regardless of app scope"._
    - _Ability to set "per instance" the default / current app scope? Could tie this with "Set my Application"_

#### Changed
- _Sync Record now saves into appropriate application folder tree._
- _Syncing a record now saves a file for every configured synced field for that record in the servicenowTableConfig._

#### Removed
- Nothing

### Internal Extension Development

#### Added
- Instance Manager Class and API

#### Changed
- _Sync Record Functionality has been moved to it's own class and "tidied up"_

#### Removed
- Nothing


Organized Upcoming Ideas
==================================================================================
Section is intended as a sandbox for taking general notes and feature planning. Will eventually be organized into future versions (above)

## [Definitly going to implement]()
- ONLY CREATE FOLDER ON RECORD SYNC! Just Store the available "Tables" and their information... not a bad idea... This will help a ton in keeping down the "noise" if you will..
- Auto File/folder creation?
    - Idea here is to use/look at the default folder config and create folder for synced file type if it doesn't exist.
    - Determine what files need synced based on the field types of a given record type. Script, "dictionary = xml = true", HTML, XML, ?????
    - Auto create folder based on displayName of field and then auto create files for any of the field types that match where file names are the field names
    - Ask them to pick app scope? or auto-detect based on synced file?  
        - if picking app scope, could greatly speed syncing... Would help eliminate some other issues like file names being the same..
        - Do we just allow picking from current "Synced apps" ... yea, lets...
- Sync Application
    - Ask to sync all files. (hook into sync app files code) 
    - Hook into "file create" code, so that we can borrow the auto-folder creation functionality
- Sync All Application Files
    - Prompt for Instance > Application
    - Show Loading dialog and progress indicator. 

    

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
- Compare With Server
    - Compare the active text editor with the server. If different, ask to view comparison and load up VSCode file comparer ... in a new column? 




## [Things to investigate]()
- sysparm_transaction_scope  ... does this put things in the right places???? also sysparm_record_scope
- On File Save
    - Actions to take when saving a file
        - Execute Compare record to server version code. 
        - If no differences, post record to SN. 
        - Show success save message with current update set name.
- Ability to "Get entire record JSON" for direct / manual editing and syncing back to instance. 
    - Need to think about file/folder structure here... Same naming scheme as tableconfig for table, and just .json extension... Yea!


Nates Sh*t show
==================================================================================
Place to store random ideas and notes as i come up with them. To then be organized into upcoming (above)

## [Less Random Ideas]()

## [Random Ideas]()

or better yet, since "sync record" isn't going to be on the folder (as of now)
we can always prompt for instance + app_scope?

if one instance, just auto-select

Give config setting option for "prompt for app scope always or not"

So now we have to think, how do we lookup files? An array of paths really...
Do we just maintain one master array of files? What's risk of speed concerns? I suppose if we run into speed issues we could always split these out? 
I've already got architected to split these out, so really it's just on save, crawl the chain until we find that fileslist file... duh... it's only 2-3 levels..
Then we can loop through the sync files... low odds of having more than a few hundred files, but even then we could always update to break out into "folder level specific"? or ap level specific? shoudl weo 
we should do app level regardless..
I wonder if there are some type script things that can help with that?


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