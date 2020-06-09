const fs = require('fs').promises;
const path = require('path');
const sv = require('semver');

const packName = 'snich';
const packDisplayName = 'S.N.I.C.H.';
const description = 'ServiceNow Integrated Code Helper. Do not worry, we will not tell anyone!';
const icon = 'images/icon-shrunk.png';


let updatePackageJSON = async function(){
    let packagePath = path.join('package.json');
    var packageJSON = await fs.readFile(packagePath);
    let package = JSON.parse(packageJSON.toString());

    let newVer = sv.inc(package.liveVersion, 'minor');
    package.version = newVer;
    package.liveVersion = newVer;

    package.name = packName;
    package.displayName = packDisplayName;
    package.description = description;
    package.icon = icon;

    fs.writeFile(packagePath, JSON.stringify(package, null, 4));

}

updatePackageJSON();
