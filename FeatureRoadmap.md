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
- Configure New Synced Table
    - _Need to be able to select display field if name is not present. Idea here is to not always be asking for it... since name should be there most of the time_
        - Could do this check just before we "Pick what fields to sync" since we will be getting all the dictionary entries anyway


#### Changed
- Configure New Synced Table
    - _Update the "Tables query" to be "INSTANCEOFsys_metadata" instead of =  so we get children tables. 
- REST Calls are now GZipped! Hoping to solve the "no longer updating SN issues". 

#### Removed


### Internal Extension Development

#### Added

#### Changed
- _Fixed so pick lists are built based on display value field instead of just name field_
- _Update the "Tables query" to be "INSTANCEOFsys_metadata" instead of =  so we get children tables. 


#### Removed



## [v0.5.9 (Upcoming)]()

### Extension Functionality
#### Added
- _Update File From Server_
    - Ability to update a file from the server without having to go through the entire "Sync Record" process. 
- Sync Record
    - Now shows info from sys_package instead of sys_scope, since sys_package is parent of "sys_application" tables this will better reflect "global scope" apps..
    
#### Changed
- Sync Record
    - Table Selection: Just notating that if a table in the global config does not exist on instance, it will not show!
    - Sync Record: Will cache records from instance and instead perform "Count" diffs to see if it should rebuild the list. 
        - NOTE: This cache is only in memory, every reload, close/open of VSCode will reset this cache, so first file sync will be a bit slower. 
- _Sync Record - When syncing a record, you can now select multiple files!_
- _Sync Record - When syncing, we now show if that record is active or not (if it has an active field)_

#### Removed


### Internal Extension Development

#### Added

#### Changed
- _Fixed so pick lists are built based on display value field instead of just name field_

#### Removed
