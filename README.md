# NOW Code Manager
This application is intended to accelerate and increase the efficiency of working with ServiceNow Records(files) that have some kind of scripting, coding, or html to them. The primary reason is that vsCode offers considerably more rich editing environment as compared to ServiceNows embedded editors.

## [Instructional Videos](https://www.youtube.com/playlist?list=PLp0BtdkD38PWd9PTib4OgRaTQ3SIQDE17)


# First Time Setup

### Extension Activation
- First Time Setup
    - Refer to the setup section, as no other commands will work until an instance is setup.
- Automated Activation
    - Will automatically activate if you load a folder with existing instance configurations

Execute the "Setup New Instance" command.

<a href="https://www.youtube.com/watch?feature=player_embedded&v=6bfHf17td6c" target="_blank"><img src="https://i.imgur.com/FY1AbSo.gif" alt="Setup Video" width="240" height="180" border="0" /></a>

# Features

## [Setup New Instance]()
Will kick off new instance configuration. Asking for the following information.
>Note: Multiple Instances supported. Will create a unique instance folder inside your workspace folder.
- Instance name
- Authentication Type
    - Basic (Warning: Will store ID and PW unencrypted. Be sure your computer is secure.)
        > Requires UserName and Password
    - oAuth (Stores oAuth info unencrypted, but we DO NOT store your password at all in this scenario.);
- Authentication Information
    - Depending on auth type selected, it will ask for the appropriate authentication information.


## [Test Connection]()
Once an instance has been configured, you can execute the test connection command to verify connectivity. This will be automatically executed during the New Instance setup process. 

# Requirements

## Required Software
### [ServiceNow Intsance](https://www.servicenow.com)
You must have access to a ServiceNow.com instance in order for this extension to work. If you're company does not have one or provide you access, you can [sign up for a FREE personal developer instance](https://developer.service-now.com).

### [Needle.js Node Application]()
Need to still test if this has to be installed manually or can be included as part of the extension.

# Known Issues

- Aborting mid-flight of New Istance Setup causes some whacky behavior where it leaves things half-setup. 
- Aborting mid-flight of sync record opens an empty record and general weirdness. 

# Release Notes
> See change Log
---------------------------------------------------------------------------------------------------