// @ts-nocheck

import * as Neutralino from "@neutralinojs/lib"

/*
    Function to handle the window close event by gracefully exiting the Neutralino application.
*/
function onWindowClose() {
    Neutralino.app.exit();
}

Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

export async function getPathParts(path) {
    let parts = await Neutralino.filesystem.getPathParts(path);
    return parts;
}

export async function readTXT(textfilepath) {
    try {   
        let data = await Neutralino.filesystem.readBinaryFile(textfilepath);
        // let data = await Neutralino.filesystem.readFile(textfilepath);
        // 2. Convert to a Uint8Array (8-bit bytes)
        let view = new Uint8Array(data);
        // strip BOM UFT-8 tile format the first 3 bytes. this is no text and will destroy layout at start of text
        if (view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF) {
            // console.log('bom');
            view = view.slice(3);
        }

        // 3. Convert bytes back to a string manually (Extended ASCII mapping)
        let asciiString = Array.from(view)
            .map(byte => String.fromCharCode(byte))
            .join('');

        //these are higher extended ascii chars which manually have to be converted so the DOS charset font shows correctly
        const charMap = {
        'Û': '█',
        '²': '▓',
        '±': '▒',
        '°': '░'
        };
        const result = asciiString.replace(/[Û²±°]/g, match => charMap[match]);    
        return result;
    }
    catch (error) {return ''}
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
    //add artificialy the downloads folder in dm.EXE folder, to check if there are any downloaded wads
    let d = folderpaths.findIndex(e=>e == './downloads')
    if (d == -1) folderpaths.unshift('./downloads');    //add folder to start of array, unshift like push will change the object reference. so it will be visible in the ui
    // if (d == -1) folderpaths = ['./downloads'].concat(folderpaths); //concat will not change the reference of object. so ui wouldnt show
    // console.log(folderpaths);

    let result = [];
    for (const fpath of folderpaths) {
        if (fpath != "")    //empty path was possible if folderpath dialog returned "" because no folder was selected
        {
            // console.log(`"${fpath}"`);
            
            try {
                let entries = await Neutralino.filesystem.readDirectory(fpath, {recursive: true});
    
                for (const element of entries) {
                    if (element.type == 'FILE' && ['.wad', '.pk3', '.deh', '.bex', '.iwad', '.pk7', 'zip', '.txt'].some(e => element.entry.toLowerCase().includes(e)) ) 
                        {
                            if ( ['.wad', '.iwad'].some(e => element.entry.toLowerCase().includes(e)) )
                            {
                                let wadcontent = await getWadTypeAndMapNames(element.path);
                                element.iwad = wadcontent.iwad;
                                element.maps = wadcontent.maps;
                                //filter Hexen Deathkings of the citadel Addon WAD which is falsy an IWAD but is an Addon to Hexen.wad
                                if (element.entry.toLowerCase().includes('hexdd')) element.iwad = false;
                            }else if ( ['.pk3', 'zip'].some(e => element.entry.toLowerCase().includes(e)) )
                            {
                                let maplist = await readZipFast(element.path);
                                element.iwad = false;
                                element.maps = maplist;
                            }
                            result.push(element)
                        }
                }
            } catch (error)
            {
                console.error(error);
            }
        }

    }
    //sort alphabetically CASE_IN_sensitive because all wadfolderpaths would stack up unordered
    result.sort((a, b) => a.entry.toLowerCase() > b.entry.toLowerCase() ? 1 :
        a.entry.toLowerCase() == b.entry.toLowerCase() ? a.dupl=1 : -1);

    console.log(result);
    return result;
}

//Map name formatted  MAPXX to XX for -warp XX command
//or ExMy formatted to x y for -warp x y 
let mapformatted = (map)=>
{
    //an object is returned to mark custom wadnames ie. in pk3 files and use +map command instead -warp
    if (map == false) return {};
    map = map.toLowerCase();
    if (map.includes('map')) return {map: map.slice(3,5), customname:0}
    if (map.includes('e') && map.includes('m')) {
        let m = map.replaceAll('e', ' '); 
        m = m.replaceAll('m', ' ');      
        return {map: m, customname:0};
    }
    //for custom mapnames return the pure mapname, will be used in startgame as +map and NOT -warp
    if (map.includes('.wad'))
    return {map: map.slice(0, -4), customname: 1 };
}

export async function startGame(selectedDoomPortFlags, doomportpath, gamepath, selectedaddonwads, joingame, joinIP, doomPort, players, deathmatch, skillactive, skill, map, addedflags) {

    let addonstext = "";
    let dehfile = "";
    let mapobj = mapformatted(map);
    // console.log(map);
    
    
    for (const element of selectedaddonwads) {
        if (element.path.toLowerCase().includes('.deh'))
            dehfile = element.path;
        else if (element.selected)  //selectedaddonwads can have not selected wads in orderlist, so take only selected in orderlist
            addonstext += '"' + element.path + '" ';
    }

    // console.log(addonstext); // chocolate doom uses -server instead of -host
    let commandarray = [
        `"${doomportpath}"`,
        ` -iwad "${gamepath}"`,
        `${addonstext ? ' -file ' + addonstext : ''}`,
        `${dehfile ? ' -deh ' + dehfile : ''}`,
        `${players > 1 && selectedDoomPortFlags == 'Chocolate' ? ' -server ' + ' -port ' + doomPort :
                 players > 1 ? ' -host ' + players  + ' -port ' + doomPort : ''}`,
        `${players > 1 && deathmatch ? selectedDoomPortFlags != 'Chocolate' ? ' +deathmatch 1 ' : ' -deathmatch ' : ''}`,
        `${players > 1 && !deathmatch ? selectedDoomPortFlags != 'Chocolate' ? ' +cooperative 1 ' : '' : ''}`,        
        `${skillactive ? ' -skill ' + skill : ''}`,
        `${mapobj.customname == 0 ? ' -warp ' + mapobj.map : mapobj.customname == 1 ? ' +map ' + mapobj.map : ''}`,    
        `${players > 1 && addedflags['dmflags'] ? ' +set dmflags ' + addedflags['dmflags'] : ''}`,
        `${players > 1 && addedflags['dmflags2'] ? ' +set dmflags2 ' + addedflags['dmflags2'] : ''}`,
        `${players > 1 && addedflags['dmflags3'] ? ' +set dmflags3 ' + addedflags['dmflags3'] : ''}`,
        `${players > 1 && addedflags['zadmflags'] ? ' +set zadmflags ' + addedflags['zadmflags'] : ''}`,
        `${players > 1 && selectedDoomPortFlags == 'Chocolate' && addedflags['commandline'] ? addedflags['commandline'] : ''}`,
    ];
    let commandline = '';
    if (joingame)
    {
        let jointxt = `${selectedDoomPortFlags == 'GZDoom' ? '-join ' : '-connect '}`   //all ports use -connect, only GZDoom -join
        commandline = `${doomportpath} -iwad "${gamepath}" -file ${addonstext} ${jointxt} ${joinIP}:${doomPort}`;
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
            return info.stdOut.replace(/\r?\n|\r/gm, '');
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
        return mySubString.replace(/\r?\n|\r/gm, '');
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

const wadhosts = [
    "https://euroboros.net/zandronum/download.php?file=",
    "https://allfearthesentinel.com/zandronum/download.php?file=",
    "https://action.fapnow.xyz/zandronum/download.php?file="
]

export async function download(filename, selectedwadhost = 0) {
        let src = `${wadhosts[selectedwadhost]}${filename}`
        let downloadpath = './downloads';
        try {
            await Neutralino.filesystem.createDirectory(downloadpath);
        } catch (error)
        {
            console.log('download dir exists');
        }
        let args = `--progress-bar -L -k -o "${downloadpath}/${filename}" "${src}" `;        
        //
        // Run curl with any argument
        let progress = 0;
        let debug = true;

        // let eStart = new Event("curlStart");
        // document.dispatchEvent(eStart);
        // console.log(NL_CWD, NL_PATH);
        console.log(args);
        
        
        let path = NL_PATH; //für linux , Mac
        if(NL_OS === 'Windows' ) {
            path = NL_CWD;
        }

        // für mac und linux ist NL_PATH nötig, siehe neutralino js curl github plugin
        let cmd = await Neutralino.os.spawnProcess(`"` + path + `/extensions/curl/curl" ${args}`);
        console.log(`"` + path + `/extensions/curl/curl" ${args}`);
        
        // cmd.filename = filename;

        Neutralino.events.on('spawnedProcess', (e) => {
            if(cmd.id == e.detail.id) {
                switch(e.detail.action) {
                    case 'stdOut':
                        // let eData = new CustomEvent("curlData", {detail: e.detail.data});
                        // document.dispatchEvent(eData);
                        break;
                    case 'stdErr':
                        const m = e.detail.data.match(/\d+\.\d+/);
                        if( m !== null && parseFloat(m[0]) >= progress) {
                            progress = parseFloat(m[0]);
                            if(debug) {
                                // console.log("Curl progress in percent: "+m[0]);
                                // console.log(filename);
                                
                            }
                            let eProgress = new CustomEvent("curlProgress", {detail: {progress: parseFloat(m[0]), filename}});
                            document.dispatchEvent(eProgress);
                        }
                        break;
                    case 'exit':
                        if(debug) {
                            console.log(`Curl terminated with exit code: ${e.detail.data}`);
                        }
                        // wichtig ob progress 0 war. denn wenn 404 von der download page kommt, dann gibt curl direkt data == 0 und ende zurück
                        if(e.detail.data == 0 && progress != 0) {
                            let eProgress = new CustomEvent("curlProgress", {detail: {progress: 'done', filename, path: downloadpath + '/' + filename }});
                            document.dispatchEvent(eProgress);
                        } else {
                            if (selectedwadhost == 0)
                            {
                                selectedwadhost = 1;
                                console.log('could not download, trying next URL: ', wadhosts[selectedwadhost]);
                                download(filename, selectedwadhost)
                            } else if (selectedwadhost == 1)
                            {
                                selectedwadhost = 2;
                                console.log('could not download, trying next URL: ', wadhosts[selectedwadhost]);
                                download(filename, selectedwadhost)
                            }
                            else if (selectedwadhost == 2)
                            {
                                console.log('no more wad urls, no download found');
                                //send progress -1 so the ui knows there was no download link found
                                let eProgress = new CustomEvent("curlProgress", {detail: {progress: -1, filename }});
                                document.dispatchEvent(eProgress);
                                //when 404 error than curl created the file with 0 kb. FAIL. delete it.
                                deleteFile(`${downloadpath}/${filename}`)
                            }
 
                        }
                        // let eEnd = new CustomEvent("curlEnd", {detail: parseInt(e.detail.data)});
                        // document.dispatchEvent(eEnd);
                        progress = 0;
                        break;
                }
            }
        });
    }

async function deleteFile(path) {
    try {
       await Neutralino.filesystem.remove(path);
    } catch (e) {
        console.error(`${path} could not be removed`);                                   
    }
}

async function readZipFast(path) {
  try {
    const stats = await Neutralino.filesystem.getStats(path);
    const fileSize = stats.size;

    // 1. Find EOCD (Search limit: 64KB comment + 22B header)
    const searchLimit = Math.min(fileSize, 65557);
    const searchBuffer = await Neutralino.filesystem.readBinaryFile(path, {
      pos: fileSize - searchLimit,
      size: searchLimit
    });

    const searchView = new DataView(searchBuffer);
    let eocdPos = -1;

    for (let i = searchLimit - 22; i >= 0; i--) {
      if (searchView.getUint32(i, true) === 0x06054b50) {
        eocdPos = i;
        break;
      }
    }

    if (eocdPos === -1) throw new Error("Not a valid ZIP");

    // 2. Extract Central Directory Metadata
    const totalEntries = searchView.getUint16(eocdPos + 10, true);
    const cdSize = searchView.getUint32(eocdPos + 12, true); // Size of the whole table
    const cdOffset = searchView.getUint32(eocdPos + 16, true); // Location in file

    // 3. ONE GIANT READ: Get the entire Central Directory at once -> much more efficient than use readBinryFile every time for every folder
    // console.log('size of CD in MB: ', cdSize/1024/1024);
    const cdBuffer = await Neutralino.filesystem.readBinaryFile(path, {
      pos: cdOffset,
      size: cdSize
    });

    const cdView = new DataView(cdBuffer);
    const decoder = new TextDecoder();
    let offset = 0;
    let fileList = [];

    // 4. Parse the buffer locally (this is near-instant)
    for (let i = 0; i < totalEntries; i++) {
      // Basic validation of CD header signature: 0x02014b50
      if (cdView.getUint32(offset, true) !== 0x02014b50) break;

      const nameLen = cdView.getUint16(offset + 28, true);
      const extraLen = cdView.getUint16(offset + 30, true);
      const commentLen = cdView.getUint16(offset + 32, true);

      // Extract name directly from the chunk we already have in memory
      const nameStart = offset + 46;
      const nameBytes = new Uint8Array(cdBuffer, nameStart, nameLen);
      fileList.push(decoder.decode(nameBytes));

      // Advance offset to the next file's header
      offset += 46 + nameLen + extraLen + commentLen;
    }

    // console.log(`Parsed ${fileList.length} files in 2 disk reads.`);
    // console.log(fileList);
    let maplist = fileList.filter(e => e.toLowerCase().includes('maps/'))
    maplist = maplist.map(e => e.replace("MAPS/", ""));
    maplist = maplist.filter(e => e.trim() != "");
    // console.log(maplist);
    return maplist;

  } catch (err) {
    console.error("Fast Read Error: ", path, err);
  }
}

// Usage
// readZipFast('./downloads/the_slaughterfest_compilation_(v1.8).pk3');


async function getWadTypeAndMapNames(wadPath) {
    try {
        // 1. Read only the Header (12 bytes) (WAD Directory)
        // pos: 0 starts at the beginning
        let headerArrayBuffer = await Neutralino.filesystem.readBinaryFile(wadPath, {
            pos: 0,
            size: 12
        });
        
        let headerView = new DataView(headerArrayBuffer);
        const wadtype = new Uint8Array(headerArrayBuffer, 0,4);
        const numLumps = headerView.getInt32(4, true); // true = little-endian
        const dirOffset = headerView.getInt32(8, true);

        // 2. Read only the Directory section
        // Each entry is 16 bytes: [4 offset][4 size][8 name]
        let dirArrayBuffer = await Neutralino.filesystem.readBinaryFile(wadPath, {
            pos: dirOffset,
            size: numLumps * 16
        });

        const mapNames = [];
        const mapRegex = /^(E\dM\d|MAP\d\d)$/;
        const decoder = new TextDecoder('utf-8');

        // 3. Parse names from the directory buffer
        for (let i = 0; i < numLumps; i++) {
            const entryStart = i * 16;
            // The name is 8 bytes long, starting at byte 8 of the entry
            const nameBuffer = new Uint8Array(dirArrayBuffer, entryStart + 8, 8);
            
            // Decode and trim null characters \0 (WAD format hat \0 for bytes not used)
            let lumpName = decoder.decode(nameBuffer).replace(/\0/g, '').trim();

            if (mapRegex.test(lumpName)) {
                mapNames.push(lumpName);
            }
        }

        const iwad = decoder.decode(wadtype) == 'IWAD' ? true: false;
        // console.log("Maps found:", mapNames);
        return {iwad, maps: mapNames};

    } catch (err) {
        console.error("Failed to read WAD:", err, wadPath);
    }
}

// Example usage:
// getMapNamesFast('./downloads/DOOM.WAD');
