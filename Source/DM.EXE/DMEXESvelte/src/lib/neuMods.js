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
            try {
                let entries = await Neutralino.filesystem.readDirectory(fpath, {recursive: true});
    
                for (const element of entries) {
                    if (element.type == 'FILE' && ['.wad', '.pk3', '.deh', '.bex', '.iwad', '.pk7', 'zip'].some(e => element.entry.toLowerCase().includes(e)) ) 
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
            } catch (error)
            {
                console.error(error);
            }
        }

    }
    //sort alphabetically CASE_IN_sensitive because all wadfolderpaths would stack up unordered
    result.sort((a, b) => a.entry.toLowerCase() > b.entry.toLowerCase() ? 1 :
        a.entry.toLowerCase() == b.entry.toLowerCase() ? a.dupl=1 : -1);

    // console.log(result);
    return result;
}


async function isIWAD (path) {
    //Bytes 0-4 sind der Typ der Wadfile: IWAD oder PWAD. I= Intern und P=Patched
    if (path.toLowerCase().includes('.wad') || path.toLowerCase().includes('.iwad') )
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
    else if (path.toLowerCase().includes('.pk3'))
    {
        //PK3 files are ZIP files and need too long to unzip without streams 
        // --> disabled
        
        // let names = await testpk3maps(path);
        // return names;
    }
    return []
}

export async function startGame(selectedDoomPortFlags, doomportpath, gamepath, selectedaddons, joingame, joinIP, doomPort, players, deathmatch, skillactive, skill, map, addedflags) {

    let addonstext = "";
    let dehfile = "";
    
    for (const element of selectedaddons) {
        if (element.path.toLowerCase().includes('.deh'))
            dehfile = element.path;
        else
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
        `${skillactive ? ' -skill ' + skill : ''}`,
        `${map ? ' -warp ' + map : ''}`,
        // `${selectedDoomPortFlags == 'Zandronum' ? ' +alwaysapplydmflags 1 +sv_defaultdmflags 0 ' : ''}`,
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

        let eStart = new Event("curlStart");
        document.dispatchEvent(eStart);
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
                        let eData = new CustomEvent("curlData", {detail: e.detail.data});
                        document.dispatchEvent(eData);
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
                                console.log('no more wad urls, no download found');
                                //send progress -1 so the ui knows there was no download link found
                                let eProgress = new CustomEvent("curlProgress", {detail: {progress: -1, filename }});
                                document.dispatchEvent(eProgress);
                            }
 
                        }
                        let eEnd = new CustomEvent("curlEnd", {detail: parseInt(e.detail.data)});
                        document.dispatchEvent(eEnd);
                        progress = 0;
                        break;
                }
            }
        });
    }

/*
export async function testpk3maps(path) {
    let file = await Neutralino.filesystem.readBinaryFile(path);
    console.log(path);
    
    let view = new Uint8Array(file);
    // console.log(view);
    let entries = await getZIPEntries(view, 0);
    // console.log(entries);

    //extract all mapnames as array "/MAP01.wad", "/E1M1"
    let maps = entries.filter(e => /\/E\dM\d/.test(e.filename) || /\/MAP\d\d/.test(e.filename) );
    let mapnames = maps.map(e => e.filename.slice(e.filename.indexOf('/')+1, e.filename.indexOf('.')) ); //slice after 'maps/' till the next '/' to get only the mapname
    // console.log(mapnames);
    return mapnames;
}

export async function getZIPEntries(data, dataStartOffset) {
  var view = new DataView(data.buffer, data.byteOffset, data.length);
  var entriesLeft = 0;
  var offset = 0;
  var endoffset = data.length;
  // Find EOCD (0xFFFF is the maximum size of an optional trailing comment).
  for (var i = data.length - 22, ii = Math.max(0, i - 0xFFFF); i >= ii; --i) {
    if (data[i] === 0x50 && data[i + 1] === 0x4b &&
      data[i + 2] === 0x05 && data[i + 3] === 0x06) {
        endoffset = i;
        offset = view.getUint32(i + 16, true);
        entriesLeft = view.getUint16(i + 8, true);
        break;
      }
  }
  var entries = [{
    directory: true,
    filename: '/',
    uncompressedSize: 0,
    centralDirectoryStart: offset,
  }];
  if (dataStartOffset) {
    offset -= dataStartOffset;
  }
  if (offset >= data.length || offset <= 0) {
    // EOCD not found or malformed. Try to recover if possible (the result is
    // most likely going to be incomplete or bogus, but we can try...).
    offset = -1;
    entriesLeft = 0xFFFF;
    while (++offset < data.length && data[offset] !== 0x50 &&
      data[offset + 1] !== 0x4b && data[offset + 2] !== 0x01 &&
        data[offset + 3] !== 0x02);
  }
  endoffset -= 46;  // 46 = minimum size of an entry in the central directory.
  while (--entriesLeft >= 0 && offset < endoffset) {
    if (view.getUint32(offset) != 0x504b0102) {
      break;
    }
    var bitFlag = view.getUint16(offset + 8, true);
    var uncompressedSize = view.getUint32(offset + 24, true);
    var fileNameLength = view.getUint16(offset + 28, true);
    var extraFieldLength = view.getUint16(offset + 30, true);
    var fileCommentLength = view.getUint16(offset + 32, true);
    var filename = data.subarray(offset + 46, offset + 46 + fileNameLength);
    var utfLabel = (bitFlag & 0x800) ? 'utf-8' : 'ascii';
    filename = decodeFilename(filename, utfLabel);

    entries.push({
      directory: filename.endsWith('/'),
      filename: filename,
      uncompressedSize: uncompressedSize,
    });
    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }
  return entries;
};

function decodeFilename(filename, utfLabel) {
  if (typeof TextDecoder == 'function') {
    return new TextDecoder(utfLabel).decode(filename);
  }
  return new Buffer(filename).toString(utfLabel);  // Node.js
};
*/