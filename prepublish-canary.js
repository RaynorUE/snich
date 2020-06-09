const fs = require('fs').promises;
const path = require('path');
const sv = require('semver');

const packName = 'snich-canary';
const packDisplayName = 'S.N.I.C.H. Canary';
const description = 'ServiceNow Integrated Code Helper - Canary. Get the latest as I build stuff ready to be tested! Provide feedback to integratenate@gmail.com';
const icon = 'images/icon-canary.png';

const release = process.argv.slice(2)[0];

let updatePackageJSON = async function(){
    let packagePath = path.join('package.json');
    var packageJSON = await fs.readFile(packagePath);
    let package = JSON.parse(packageJSON.toString());

    let newVer = sv.inc(package.canaryVersion, release);

    package.version = newVer;
    package.canaryVersion = newVer;

    package.name = packName;
    package.displayName = packDisplayName;
    package.description = description;
    package.icon = icon;

    fs.writeFile(packagePath, JSON.stringify(package, null, 4));

}

updatePackageJSON();
