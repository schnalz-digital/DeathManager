// @ts-nocheck

import * as Neutralino from "@neutralinojs/lib"

/*
    Function to handle the window close event by gracefully exiting the Neutralino application.
*/
function onWindowClose() {
    Neutralino.app.exit();
}


export async function showFileDialog() {

        let entry = await Neutralino.os.showOpenDialog('Open a Doom Port', {
            defaultPath: './',
            multiSelections: false
        });        
    //   console.log('You have selected:', entry);
    let pathParts = await Neutralino.filesystem.getPathParts(entry[0]);
        // console.log('Parts:', pathParts);
    return {fullpath: entry, name: pathParts.stem};
}

export async function showFolderDialogAddFolder() {
    let entry = await Neutralino.os.showFolderDialog('Select WAD Folder', {
        defaultPath: './'
    });   
    return entry;
}

export async function readFolderPaths(folderpaths) {

    let result = [];
    for (const fpath of folderpaths) {
        if (fpath != "")    //empty path was possible if folderpath dialog returned "" because no folder was selected
        {
            let entries = await Neutralino.filesystem.readDirectory(fpath);
    
            for (const element of entries) {
                if (element.type == 'FILE' && ['.wad', '.pk3', '.deh'].some(e => element.entry.toLowerCase().includes(e)) ) 
                    {
                        if (await isIWAD(element.path))
                        {
                            element.iwad = true;
                            //filter Hexen Deathkings of the citadel Addon WAD which is falsy an IWAD but is an Addon to Hexen.wad
                            if (element.entry.toLowerCase().includes('hexdd')) element.iwad = false;
                        }
                        let mapnames = await getMapNames(element.path);
                        element.maps = mapnames;
                        result.push(element)
                    }
            }
        }

    }
    //sort alphabetically CASE_IN_sensitive because all wadfolderpaths would stack up unordered
    result.sort((a, b) => a.entry.toLowerCase() > b.entry.toLowerCase() ? 1 : -1);
    console.log(result);
    return result;
}


async function isIWAD (path) {
    //Bytes 0-4 sind der Typ der Wadfile: IWAD oder PWAD. I= Intern und P=Patched
    if (path.toLowerCase().includes('.wad'))
    {
        let WADtype = await Neutralino.filesystem.readBinaryFile(path, {pos: 0, size: 4});
        let string = new TextDecoder().decode(WADtype);
        // console.log('Binary content: ', string, path );
    
        if (string == 'IWAD') return true
    }

    return false
}

async function getMapNames(path) {
    if (path.toLowerCase().includes('.wad'))
    {
        let directory_lumpsize = 16; //16 bytes
        let numlumps = new Uint32Array( await Neutralino.filesystem.readBinaryFile(path, {pos: 4, size: 4}))[0];
        let directorypointer = await Neutralino.filesystem.readBinaryFile(path, {pos: 8, size: 4});
        let directorysize = numlumps*directory_lumpsize;
        let directorystartbytes = new Uint32Array(directorypointer)[0];
        let directorydata = await Neutralino.filesystem.readBinaryFile(path, {pos: directorystartbytes, size: directorysize});

        //directory_lump struct: 4 bytes lumppointer + 4 bytes lumpsize + 8bytes lumpname == 16 bytes total
        //ex: first name at 8 to 16 bytes, next 16+8 to 16+8+16 ...
        let names = [];
        for (let i = 0; i < numlumps+1; i++) {
            let lumpnametest = directorydata.slice(i*16 +4+4, i*16 +16);
            let name = new TextDecoder().decode(lumpnametest);   
            // name = name.replaceAll('\u0000', '') //null Bytes are decoded as \u0000. so delete them
            //test for MAP name lumps like MAPxx or ExMx
            if (/^E\dM\d/.test(name) )
            {
                names.push(name.slice(0,4));    //take only mapname and forget all chars after it like null char \u0000.

            } else if (/^MAP\d\d/.test(name)) 
            {
                names.push(name.slice(0,5));    //take only mapname and forget all chars after it like null char \u0000. ex.: MM.WAD had sometimes Char 'S' or 'ORS after MAPxx names
            }
        }
        // console.log(path, names);
        // console.log(names);
        // return sorted names, because some WADS have no ordered MapNames in WADDirectory
        names = names.sort();
        return names
    }
    return []
}

export async function startGame(selectedDoomPortFlags, doomportpath, gamepath, addons, joingame, joinIP, doomPort, players, deathmatch, skillactive, skill, map, addedflags) {

    let selectedAddons = addons.filter(e => e.selected)
    let addonstext = "";
    let dehfile = "";
    for (const element of selectedAddons) {
        if (element.path.toLowerCase().includes('.deh'))
            dehfile = element.path;
        else
            addonstext += '"' + element.path + '" ';
    }
    // console.log(addonstext);
    let commandarray = [
        `${doomportpath}`,
        ` -iwad "${gamepath}"`,
        `${addonstext ? ' -file ' + addonstext : ''}`,
        `${dehfile ? ' -deh ' + dehfile : ''}`,
        `${players > 1 ? ' -host ' + players  + ' -port ' + doomPort : ''}`,
        `${players > 1 && deathmatch ? ' -deathmatch' : ''}`,
        `${skillactive ? ' -skill ' + skill : ''}`,
        `${map ? ' -warp ' + map : ''}`,
        `${players > 1 && addedflags['dmflags'] ? ' +set dmflags ' + addedflags['dmflags'] : ''}`,
        `${players > 1 && addedflags['dmflags2'] ? ' +set dmflags2 ' + addedflags['dmflags2'] : ''}`,
        `${players > 1 && addedflags['dmflags3'] ? ' +set dmflags3 ' + addedflags['dmflags3'] : ''}`,
        `${players > 1 && addedflags['zadmflags'] ? ' +set zadmflags ' + addedflags['zadmflags'] : ''}`,
    ];
    let commandline = '';
    if (joingame)
    {
        commandline = `${doomportpath} -iwad "${gamepath}" -file ${addonstext} ${selectedDoomPortFlags == 'Zandronum' ? '-connect ' : '-join '} ${joinIP}:${doomPort}`
    } else {
        commandline = commandarray.join('');
    }
    console.log(commandline);
    await Neutralino.os.execCommand(commandline, { background: true });
}

export async function getLocalIP() {
    // console.log(NL_OS);
    
    if (NL_OS == "Windows")
    {
        // let commandline = '(Test-Connection -ComputerName $env:ComputerName -Count 1).IPV4Address.IPAddressToString';
        // let powershell = "PowerShell -NoProfile -ExecutionPolicy Bypass -Command "
        // let info = await Neutralino.os.execCommand(`${powershell} "${commandline}"`);
        let commandline = '(Find-NetRoute -RemoteIPAddress 8.8.8.8)[0].IPAddress'
        let powershell = "PowerShell -NoProfile -ExecutionPolicy Bypass -Command "
        let info = await Neutralino.os.execCommand(`${powershell} "${commandline}"`);
        console.log(`output: ${info.stdOut}`);
        if (!info.stdErr)
            return info.stdOut;
    }
    if (NL_OS == "Linux")
    {
        let commandline = `ip route get 8.8.8.8`
        let info = await Neutralino.os.execCommand(commandline);
        console.log(`output: ${info.stdOut}`);
        if (!info.stdErr)
        {
            let text = info.stdOut;
            let mySubString = text.substring(
                text.indexOf("src ") + 4, 
                text.lastIndexOf(" uid")
            );
        return mySubString;
        }
    }
    if (NL_OS == "Darwin")
    {
        let commandline = `route get 8.8.8.8 | grep "interface: "`
        let info = await Neutralino.os.execCommand(commandline);
        console.log(`output: ${info.stdOut}`);
    }
    return "192.168.6.66"
}

export async function save(key, data) {
    let json = JSON.stringify(data);
    await Neutralino.storage.setData(key, json)
}

export async function load(key) {
    try {
        let json = await Neutralino.storage.getData(key);
        let data = JSON.parse(json);
        // console.log(data);
    return data;
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
        
    }

}