# Change Log
All notable changes to the "yansasync" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Initial Version]


## [Planned Features]
- Initial release

- Have a way to sync records through command palette? Like "Sync Record" if "No folder" prompts for table to sync record from list of "already setup/synced/pre-configured" table list? 

- AutoConfig Tables with Multiple Fields
    - Widget
    - UI Page
    - A way to add their own custom? Should be doable..

- Logging
    Verbose logging options! woo!

- Data Storage: Still use .json file? But just have the one in the main folder? Yea... let's do that...
- sysparm_transaction_scope  ... does this put things in the right places???? also sysparm_record_scope
- Feature: Loading dialog on initial "Setup" ... Instructions would be to go into settings and set values accordingly... (Instance, Auth type, etc);
            Then have a "First time setup" execution that will do any "heavy pre-queryign to the SN Instance" to build and setup things for quick call / access locally (Things like tables, etc);
            Then have an option to "Update on demand" 
            Then also have an option where we "Update on Demand" in the background "on load of the extension" Is there a way to do this without having to execute a command?

- IMPORTANT: When saving for a given application, flip to that application for them before saving!

Allow Multiple Instances in one VSCode Editor? Yes. 
-- Initial Setup Flow
    Instace Name
    Auth Type
        - Basic -- ID & PW
        - oAuth -- Client Secret and API Key (naming?)   <-- ID password asked on "Command execution" if key expired. 
    
    lastStep: Launch Folder picker to have user pick where to store (Indicate if we can that we will create a folder based on instanceName);
        AutoCreate anything if needed.
            - Default Folder Set -> Auto-create a set of folders for commmon things (See been/johns folder for sublime);
-- Auto File/folder creation?
    - Determine what files need synced based on the field types of a given record type. Script, "dictionary = xml = true", HTML, XML, ?????
        - Auto create folder based on displayName of field and then auto create files for any of the field types that match where file names are the field names

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