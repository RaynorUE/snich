# Diagrams and Command Flows

[__Object Hierarchy and Folder/File Structure__](https://www.lucidchart.com/invitations/accept/9311c598-a1ee-47b5-86a4-6a88d12fd003) - This document is intended to layout the details of the Internal Object Hiearchy used in the .json files. Additionally, it indicates the desired folder/file layout that will be created within the "Workspace folder". (_Apologies if this ends up a bit out of date sometimes_)

[__Command Flows__]() - This document will contain diagrams that help show the "process flow" for each command. I.e. Setup New Instance, Test connection, etc.

# Planned Feature Roadmap
This document is intended to indicate and layout the features we are planning to implement. It may be a bit rough and refined over time..

As features are completed here, they will be more "Nicely Worded" and moved to the Change Log release version that is currently planned for release.

## State Inidicators
    _Italic_: Not Started
    __Bold__: Work in progress
     Nothing: Feature complete

## [v0.2.0 (Current)]()


### Added

#### Extension Functionality
- _Table Defaults now read from servicenowTableConfig.json file._
- _Ability to update the default tables through the command prompt._
- _Syncing a record now saves a file for every configured synced field for that record in the servicenowTableConfig._

### Changed
- Nothing
### Removed
- Nothing

#### Internal Extension Development
- Instance Manager Class and API

### Changed
- Nothing
### Removed
- Nothing


Organized Upcoming Ideas
==================================================================================
Section is intended as a sandbox for taking general notes and feature planning. Will eventually be organized into future versions (above)

## [Definitly going to implement]()
- ONLY CREATE FOLDER ON RECORD SYNC! Just Store the available "Tables" and their information... not a bad idea... This will help a ton in keeping down the "noise" if you will..
- Auto File/folder creation?
    - Determine what files need synced based on the field types of a given record type. Script, "dictionary = xml = true", HTML, XML, ?????
    - Auto create folder based on displayName of field and then auto create files for any of the field types that match where file names are the field names

## [Pretty Solid idea]()
- When saving for a given application, flip to that application for them before saving!

## [Things to investigate]()
- sysparm_transaction_scope  ... does this put things in the right places???? also sysparm_record_scope



Nates Sh*t show
==================================================================================
Place to store random ideas and notes as i come up with them. To then be organized into upcoming (above)

## [Less Random Ideas]()

## [Random Ideas]()

-- Major Features
    - Sync Application
        - Creates all  for that app and syncs all files. Show Loading dialog and progress indicator. 
    -Annotate Table
        - Use defaults John has
        - Break functionality into it's own file, so we can expand on over time. Right now it's simple but could see this growing. 
    -Delete Files
        - Useful for resyncing.
    -Set Update Set
        -- Query and set accordingly
    -Set Application
        --Set application accordingly, indicate via showMessage which update set is selected. 
    -Load New App Files
        -- Allow on a folder as well as full app..?
    --Compare Record to Server
        -- Check on Save
    -- Have option for a given files context mean to "Sync entire Record as JSON" so someone can look at it's entire details... Do we provide option to save back as?

How do we represent apps on a given instance? Should we create "global" app scope? Then folders inside? 

Command Pallet Actions
    - Sync Application 
    


- current feature set
-- Sync Table  <--- Builds folder struture, allows sycing files   <-- load and Cache? When do we refresh? On command? Do we do a diff? 
-- Test Connection  <--- good to have, also use at "Setup time"


General Design
    How does the explorer menu get the sections? Ideally will create one for every configured instance, and 
    Use globalState to store as we make changes, so state can be restored next lunch??? Any other way to store this? Ideally would like to get away from .json files...



## [Core Functionality for Expansion]
- ServiceNow_Config.json
    - Contains details for instance
        - URL and Auth Detail
        - Contains folder tree hierarchy (Useful if needing to restore and all you have is the configjson..)

- REST Client
    - Get Record
    - Get Records
    - Post Record
    - Test Connection
    - Set Basic Auth
    - Set oAuth

- File Management
    - Create New File
    - Compare Contents

- Caching / Storage of "App File Tables" and perform diffs in the background on each load? Or just on demand?



## [Sublime Sync Features to Port]