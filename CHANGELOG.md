# Change Log
All notable changes to the "yansasync" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]()
Features and Functionality that have been completed but not yet released. See [FeatureRoadmap.md](/FeatureRoadmap.md) for in progress items.

### Added

### Changed
- Sync Record into appropriate application folder tree.

## [v0.1.0]()

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
