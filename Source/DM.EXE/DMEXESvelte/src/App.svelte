<script>
// @ts-nocheck
// TODO 
// add custom command line arguments (already in chocolate doom implemented via flags)
// flags support odamex
// scrolllists presets (more than 8 presets support)
// support config files
// button to clear selected list
// after download wad read the mapnames so level select shows the maps
// sort maps

// servername save as storage and preset
// turbo save storage
// mapactive save

// support for all other unknown ports the zandronum presets for connect vs join command
// unknown doomports use flags of gzdoom?
// make a sourceport list like the wad fodlers list to quickly select doomports
// integrate with this an options menu, to choose port command line sets like zandronum or gzdoom or chocolatedoom 

import { onMount } from 'svelte';

import * as neuMods from "./lib/neuMods.js"

import { getIP, soundRestart, Volume, getZandronumServerList, getChocolateServerList, getOdamexServerList } from "./lib/shared.svelte.js";

import PopupFlags from "./lib/popupFlags.svelte";
import PopupWadFolders from "./lib/popupWadFolders.svelte";
import PopupServerList from "./lib/popupServerList.svelte";
import PopupPresets from "./lib/popupPresets.svelte";
import PopupMaps from "./lib/popupMaps.svelte";
import PopupOrderwads from "./lib/popupOrderwads.svelte";
import ScrollBar from "./lib/scrollbar.svelte";

import Snow from "./lib/snow.svelte";

  onMount(() => {
    document.addEventListener('curlProgress', function(e) {
      // console.log(addonwads);
      // console.log(e.detail.filename, e.detail.progress);
      let i = selectedaddonwads.findIndex(el=>el.entry == e.detail.filename)
      if (i != -1)
      {
        selectedaddonwads[i].progress = e.detail.progress;

        // this will enter if no download link was found
        // after 5 seconds, reset the progress and download, so you can try to click download button again
        if (e.detail.progress == -1)
        {
          setTimeout(() => {
            selectedaddonwads[i].progress = 0;
            selectedaddonwads[i].download = 0;
          }, 5000);
        }
        // this will enter if download was done, put the new wad into wadcollection
        // and rest all download markers of the wad
        if (e.detail.progress == 'done' )
        {
          selectedaddonwads[i].path = e.detail.path;

          wadcollection.push(selectedaddonwads[i]);
          //sort the new downloaded wad for addonwads list
          wadcollection.sort((a, b) => a.entry.toLowerCase() > b.entry.toLowerCase() ? 1 : a.entry.toLowerCase() == b.entry.toLowerCase() ? a.dupl=1 : -1);

          //timeout damit man noch grünen download balken sehen kann bei kleinen dateien
          setTimeout(() => {
            selectedaddonwads[i].progress = 0;
            selectedaddonwads[i].missing = 0;
            selectedaddonwads[i].download = 0;
          }, 500);
        }
      }
      else console.log('download filename not found in addonwads');
    });
    
    return () => {
      document.removeEventListener('curlProgress', ()=>{});
    };
  });



$effect(async () => {
  Volume(0.3);  // set sounds to volume less loud
  pupblicIP = await getIP();
  joinIP = await neuMods.getLocalIP();
  //load all variables
  doomPortpath = await neuMods.load('doomPortpath');
  if (!doomPortpath) doomPortpath = {name: 'Choose Doom Port ...'}
  //try to preselect gzoom or zandronum flags depends on filename of port.
  setSelectedDoomPortFlags(doomPortpath.name)
  
  wadfolders = await neuMods.load('wadfolders');
  //when app starts refresh (read) all files in folders new
  wadfolders ? readWadFolders() : wadfolders = [];

  selectedGameWAD = await neuMods.load('selectedGameWAD');
  if (!selectedGameWAD) selectedGameWAD = 0;
  folderindex = selectedGameWAD > 5 ? (selectedGameWAD -5) : 0;  // -5 so the selected gamewad si always at the bottom of the list visible


  players = await neuMods.load('players');
  if (!players) players = 1;

  deathmatch = await neuMods.load('deathmatch');
  if (!deathmatch) deathmatch = 0;

  map = await neuMods.load('map');
  if (!map) resetMap();

  //loading dmflags from save. if save is an older version of DMFLAGS, find out and dont overwrite dmflags with save!
  //otherwise the dmflags would be the old version and missing flags
  let tempdmflags = await neuMods.load('dmflags');
  if (tempdmflags) 
  {
    testloadedDMFlags(tempdmflags);
  }

  //then calc the correct flags for addedflags variable for commandline.
  calcAddedFlags();

  presets = await neuMods.load('presets');
  if (!presets) presets = [];

})

function testloadedDMFlags(tempdmflags) {
    let compareflags =  JSON.parse(JSON.stringify(tempdmflags));
    //search the saved compareflags and find the exact object properties for each flag.
    // if found then take the selected prop and write it to the dmflags master object.
    // works if master dmflags gets some entries deleted or added or changed
    for (let i = 0; i < dmflags.length; i++) {
        let test = compareflags.findIndex(e=>
          e.deathmatch == dmflags[i].deathmatch && 
          e.port == dmflags[i].port && 
          e.cvar == dmflags[i].cvar && 
          e.value == dmflags[i].value && 
          e.name == dmflags[i].name && 
          e.default == dmflags[i].default
        )
      if (test != -1)
        dmflags[i].selected = compareflags[test].selected;
      else
        console.log('old saved dmflags object version found. not compatible, ignored');
    }
}

  let cellw=8, cellh=16; 
  let cols = 50, rows = 20;
  let gridH = rows*cellh;
  let gridW = cols*cellw;

  let windowW = $state(1);
  let windowH = $state(1);

  let scale = $derived.by( () => {
    const scaleX = (windowW * 0.9) / gridW;
    const scaleY = (windowH * 0.9) / gridH;
    return Math.min(scaleX, scaleY).toFixed(3);
  });

  let cursortop = $state(0), cursorleft = $state(0);

  let calcPixelCurser = (e) => {
    let rect = e.currentTarget.getBoundingClientRect();
    let mousex = (e.clientX - rect.left) / scale; //x position within the element.
    let mousey = (e.clientY - rect.top) / scale;  //y position within the element.

    //for preventing - negative offsets or over grid, so mouse is not shown outside top and left right bottom borders
    if (mousex >= 0 && mousex < gridW && mousey >= 0 && mousey < gridH) {
      cursorleft = Math.floor(mousex/cellw) * cellw;
      cursortop = Math.floor(mousey/cellh) * cellh; 
    }
  }
  // $inspect(cursortop, cursorleft)
  
  function scroll(dir, visiblelines) {
    //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
    let maxindex = Math.max(0, gamewads.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up')
    {
      if (folderindex > 0) folderindex--; 
    } else if (dir == 'down')
    {
      if (folderindex < maxindex) folderindex++; 
    }
    if (maxindex > 0)
      scrollcursorGameWAD =  Math.round( (folderindex / maxindex) * scrollbarsteps )
    soundRestart(0);
  }  

  function pageScroll(dir, visiblelines) {
    let maxindex = Math.max(0, gamewads.length - visiblelines);
    let scrollbarsteps = visiblelines-3;

    if (dir == 'up') {
        folderindex = Math.max(0, folderindex - visiblelines);
    } else if (dir == 'down') {
        folderindex = Math.min(maxindex, folderindex + visiblelines);
    }
    if (maxindex > 0)
      scrollcursorGameWAD =  Math.round( (folderindex / maxindex) * scrollbarsteps )

    soundRestart(0);
}

  function pageScrollAddons(dir, visiblelines) {
    let maxindex = Math.max(0, addonwads.length - visiblelines);
    let scrollbarsteps = visiblelines-3;

    if (dir == 'up') {
        folderindexAddon = Math.max(0, folderindexAddon - visiblelines);
    } else if (dir == 'down') {
        folderindexAddon = Math.min(maxindex, folderindexAddon + visiblelines);
    }
    if (maxindex > 0)
      scrollcursorAddonWAD =  Math.round( (folderindexAddon / maxindex) * scrollbarsteps )
    
    soundRestart(0);
}

  function scrollAddons(dir, visiblelines) {
    //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
    let maxindex = Math.max(0, addonwads.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up')
    {
      if (folderindexAddon > 0) folderindexAddon--; 
    } else if (dir == 'down')
    {
      if (folderindexAddon < maxindex) folderindexAddon++; 
    }
    if (maxindex > 0)
      scrollcursorAddonWAD =  Math.round( (folderindexAddon / maxindex) * scrollbarsteps )
    soundRestart(0);
  }  

  

async function onWadFoldersAdd(i) {
  //parameter i comes from the UI Buttons index of 8 fixed Array buttons. this info is needed to know which row was clicked and will be overwritten if filled
  let newfolder = await neuMods.showFolderDialogAddFolder();
  //Cancel addwad folders if no folder was selected in folder dialog. otherwise there would be added an "" empty path as entry.
  if (newfolder == "") return;  
  let index = wadfolders.indexOf(newfolder);
  // overwrite folder with i parameter.
  if (index == -1) wadfolders[i] = newfolder;
  //save all folders to local store. when app restarts it load every folder fresh and reads every file new.
  neuMods.save('wadfolders', wadfolders);
}

//remove entry at index i from wadfolders array
function spliceWadFolders(i) {
  wadfolders.splice(i,1);
}

async function readWadFolders(presetwadcollection=[]) {
  wadfolders = wadfolders.filter(e=>e != ""); // delete all empty lines caused by folderdialog no folder selected 
  neuMods.save('wadfolders', wadfolders);

  wadcollection = await neuMods.readFolderPaths(wadfolders);
  wadcollection ? 0 : wadcollection = [];
  //-----READ WADCOLLECTION Storage, CHECK IF IT EXISTS IN READ FOLDERS ON HDD, OVERWRITE SELECTED AND IWADFAKE PROPERTY ONLY!------
  let tempwadcollection = [];
  if (presetwadcollection.length > 0)
    tempwadcollection = presetwadcollection;
  else
    tempwadcollection = await neuMods.load('wadcollection');
  if (tempwadcollection)
  {
    for (let i = 0; i < tempwadcollection.length; i++) {
      let entry = tempwadcollection[i].entry;
      let path = tempwadcollection[i].path;
      //path und entry sind eindeutig für einen wadcollection eintrag, also nutze sie um den index im neuen wadcollection zu finden
      let f = wadcollection.findIndex(e=> e.entry == entry && e.path == path);
      // console.log(wadcollection[f].iwadfake, tempwadcollection[i].iwadfake);
      if (f != -1)
        {
           wadcollection[f].selected = tempwadcollection[i].selected ;
           wadcollection[f].iwadfake = tempwadcollection[i].iwadfake ;
        }
    }
  }
  updateSelectedaddonwads();
}


let showwadfolders = $state(0);
let showlevelselect = $state(0);
let showserverlist = $state(0);
let showdeathmatchflags = $state(0);
let showpresets = $state(0);

let doomPortpath = $state({name: 'Choose Doom Port ...'})
let players = $state(1)
let deathmatch = $state(0);
let servername = $state('Deathmanager Super Server')
let pupblicIP = $state('0.0.0.0')

let joinIP = $state('192.168.0.1')
let joingame = $state(0);

let doomNetPort = $state('10666');
let skill = $state(3);
let skillactive = $state(0);
let turbo = $state(1);
let turboactive = $state(0);
let timer = $state(1);
let timeractive = $state(0);

let map = $state('');
let mapactive = $state(0);

let textfile = $state('');
let showtxt = $state(0);

let serverlist = $state([]);
let presets = $state([]);

//drag n drop variables to prevent drop on same list like addonwads or gamewads list
let draggamewad = $state(0);
let dragaddonwad = $state(0);

let folderindex = $state(0);      //for gamewad list scrolling
let scrollcursorGameWAD = $state(0);
let selectedGameWAD = $state(0);

let folderindexAddon = $state(0); //for addonwad list scrolling
let scrollcursorAddonWAD = $state(0);
let lastselectedAddonWAD = $state(0);

let folderindexOrderwads = $state(0);
let scrollcursorOrderwads = $state(0);

let mapindex = $state(0);         //for level list scrolling  
let scrollcursorLevels = $state(0);

let serverindex = $state(0);
let scrollcursorServers = $state(0);

let wadfolders = $state([]);

let wadcollection = $state([])

let gamewads = $derived.by(()=>wadcollection.filter(e=> e.iwad || e.iwadfake))

let showorderwads = $state(0);
let selectedaddonwads = $state([]);

let servernamefocus = $state(0);

function updateSelectedaddonwads() {
  let selected = addonwads.filter(e=> e.selected);
  if (selected != -1)
  {
    if (selectedaddonwads.length > 0)
    {
      selectedaddonwads = selectedaddonwads.filter(e=>e.selected);
      for (let i = 0; i < selected.length; i++) {
        //if a new addonwad is selected in the addon list, and its not alredy in the selectedaddonwads order. then add it to the array
        //this keeps the order of already added wads to the order list
        const a = selectedaddonwads.findIndex(e=> e.entry?.toLowerCase() == selected[i].entry?.toLowerCase());
        if (a == -1)
          selectedaddonwads.push(selected[i]);
      }
    } else {
      selectedaddonwads = selected;
    }

  }
}
  // $inspect('selectedaddonwads: ', selectedaddonwads);


let addonwads =  $derived.by(()=>
{
  //choose the addon wads woth same MapName Format like the GameWad has. 
  //if the file is a DEH or PK3 then also inlude it always!
  let mapname = gamewads[selectedGameWAD]?.maps && gamewads[selectedGameWAD]?.maps[0];
  let alladdonwads = wadcollection.filter(e=> !e.iwad && !e.iwadfake);
  // return alladdonwads; //used for other addonwads list filter. grey out addon wads via checkmapformat()
  // or this method: dont show addon wads incompatible map format at all:...
  let wads = []
  for (const element of alladdonwads) { 
    //exclude txt files in addonwadslist
    if (!element.path.toLowerCase().includes('.txt'))
    {
      //if mapname does not exist, iwadfake is selected, include all addonwads
      //inlude always DEH, .bex, PK3, zip, or other files where maps is not defined:
      if (!mapname || element.maps == undefined || element.maps?.length == 0) wads.push(element);
      else
      {
        //Include only MAPXX format addonwads when gamwad is also MAPXX format.
        if (mapname?.includes('MAP') && element.maps[0].includes('MAP'))    //mapname?... important because mapname can be undefined if no gamewads exist yet.
          {
            wads.push(element);
          }
        //otherwise include ExMy Map Format ADdons like Doom1
        else if (mapname?.includes('E') && element.maps[0].includes('E'))   //mapname?... important because mapname can be undefined if no gamewads exist yet.
          wads.push(element);
        // else if (!mapname)   //if iwadfake is selected, include all addonwads
          // wads.push(element);
      }
    }
  }
  //filter all XY.deh out, where the XY.wad is not existent in the active mapformat
  let alldeh = wads.filter(e=>e.entry.toLowerCase().includes('.deh'))
  for (let i=0; i<alldeh.length; i++) {
        let stem = alldeh[i].entry.slice(0, -4).toLowerCase();
        // console.log(stem + '.wad');
        let dehwad = wads.findIndex(e=>e.entry.toLowerCase().includes(stem + '.wad'));
        // console.log(dehwad >-1 && wads[dehwad].entry);
        if (dehwad == -1) 
        { 
          // console.log('removing deh to missing wad: ', alldeh[i].entry);
          let deldeh = wads.findIndex(e=>e.entry.toLowerCase() == alldeh[i].entry.toLowerCase());
          if (deldeh != -1)
            wads.splice(deldeh, 1);
        }    
  }

  return wads;
});



//make addonwads grey if the selected gamewad has another mapformat 
//or allow all if selected gamewad has no maps (deh or pk3) or iwadfake is selected
// use this then for button class: {checkMapformat(addonwads[folderindexAddon+i]) ? '' : ' hdis '}
/*
function checkMapformat(wad) {
  let mapformat = gamewads[selectedGameWAD]?.maps[0];
  if (!mapformat) return true; //when iwadfake or no maps could be read out of iwad is selected, allow all addonwads
  if (mapformat?.includes('MAP') && wad?.maps[0]?.includes('MAP') || 
        wad?.maps?.length == 0 ||
        mapformat?.includes('E') && wad?.maps[0]?.includes('E')) 
      return true;
}
*/

//TODO --better flags logic by deathmatch or coop preselect
function changeDMFlagDefaults() {
  let a = dmflags.find(e=>e.value == 4 && e.port == 'Zandronum');
  a ? a.selected = true : 0;
  a = dmflags.find(e=>e.value == 4 && e.port == 'GZDoom');
  a ? a.selected = true : 0;

  a = dmflags.find(e=>e.value == 4096 && e.port == 'Zandronum');
  a ? a.selected = true : 0;
  a = dmflags.find(e=>e.value == 4096 && e.port == 'GZDoom');
  a ? a.selected = true : 0;

  a = dmflags.find(e=>e.value == 16384 && e.port == 'Zandronum');
  a ? a.selected = true : 0;
  a = dmflags.find(e=>e.value == 16384 && e.port == 'GZDoom');
  a ? a.selected = true : 0;

  a = dmflags.find(e=>e.value == 128 && e.port == 'Zandronum');
  a ? a.selected = true : 0;
  a = dmflags.find(e=>e.value == 128 && e.port == 'GZDoom');
  a ? a.selected = true : 0;

  a = dmflags.find(e=>e.value == '-nomonsters' && e.port == 'Chocolate');
  a ? a.selected = true : 0;

  a = dmflags.find(e=>e.value == '-altdeath' && e.port == 'Chocolate');
  a ? a.selected = true : 0;
}

function resetFlagDefaults() {
  dmflags.forEach(e=>e.selected = e.default);
}

let dmflags = $state([]);
dmflags = [
  //dmflags
  {port:'GZDoom', cvar: 'dmflags', value: 16384, name: 'Items respawn', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 65536, name: 'Disallow jump', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 4, name: '(DM) Weapons Stay', deathmatch:1, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 128, name: '(DM) Respawn farthest away', deathmatch:1, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 1024, name: '(DM) Exit kills Player', deathmatch:1, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 4096, name: 'No monsters', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 32768, name: 'Fast monsters', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 8192, name: 'Respawn monsters', default: false, selected: false },
  {port:'GZDoom', cvar: 'dmflags', value: 33554432, name: '(coop) Lose keys on death', deathmatch:0, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 2097152, name: '(coop) No Deathmatch weapons', deathmatch:0, default: false, selected: false },

  {port:'Zandronum', cvar: 'dmflags', value: 16384, name: 'Items respawn', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 65536, name: 'Disallow jump', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 4, name: '(DM) Weapons Stay', deathmatch:1, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 128, name: '(DM) Respawn farthest away', deathmatch:1, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 1024, name: '(DM) Exit kills Player', deathmatch:1, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 4096, name: 'No monsters', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 32768, name: 'Fast monsters', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 8192, name: 'Respawn monsters', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 33554432, name: '(coop) Lose keys on death', deathmatch:0, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 2097152, name: '(coop) No Deathmatch weapons', deathmatch:0, default: false, selected: false },

  //dmflags2
  {port:'GZDoom', cvar: 'dmflags2', value: 134217728, name: 'Big powerups respawn', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags2', value: 4096, name: '(coop) Spawn where died', deathmatch:0, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags2', value: 2, name: 'Drop weapons when killed', default: false, selected: false  },

  {port:'Zandronum', cvar: 'dmflags', value: 524288, name: 'Big powerups respawn', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags2', value: 4096, name: '(coop) Spawn where died', deathmatch:0, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags2', value: 2, name: 'Drop weapons when killed', default: false, selected: false  },

  //dmflags3 - zandronum has zadmflags
  {port:'GZDoom', cvar: 'dmflags3', value: 2, name: '(coop) Share keys', deathmatch:0, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags3', value: 1, name: '(coop) No player collision and shooting', deathmatch:0, default: false, selected: false  },
  {port:'Zandronum', cvar: 'zadmflags', value: 64, name: '(coop) Share keys ', deathmatch:0, default: false, selected: false  },
  {port:'Zandronum', cvar: 'zadmflags', value: 16, name: 'Walk through players, but shooting', default: false, selected: false  },
  //command line with oldschool settings like chocolate
  {port:'Chocolate', cvar: 'commandline', value: '-nomonsters', name:'No Monsters', default:false, selected:false},
  {port:'Chocolate', cvar: 'commandline', value: '-altdeath', name:'Respawn Weapons and Items (DM2.0)', default:false, selected:false},
  {port:'Chocolate', cvar: 'commandline', value: '-fast', name:'Fast monsters', default:false, selected:false},
  {port:'Chocolate', cvar: 'commandline', value: '-respawn', name:'Respawn monsters', default:false, selected:false}
]

let selectedDoomPortFlags = $state('GZDoom');

//change for dmflags doomport tabs in flags menu. try to preselect depends on filename of port.
function setSelectedDoomPortFlags() {
  if (['gzdoom', 'zdoom', 'uzdoom'].some( e=>doomPortpath.name.toLowerCase().includes(e) ) ) selectedDoomPortFlags = 'GZDoom';
  if (doomPortpath.name.toLowerCase().includes('zandron')) selectedDoomPortFlags = 'Zandronum';
  if (['chocol', 'crispy', 'woof', 'rude'].some( e=>doomPortpath.name.toLowerCase().includes(e) ) ) selectedDoomPortFlags = 'Chocolate';
  if (doomPortpath.name.toLowerCase().includes('odamex')) selectedDoomPortFlags = 'odamex';
}

//derived ist für dmflags tabs auswahl für gzdoom oder zandronum
let dmflagsbyport = $derived(dmflags.filter(e=> (e.port == selectedDoomPortFlags && (e.deathmatch == deathmatch || e.deathmatch == undefined)  /*|| (selectedDoomPortFlags != 'Chocolate' && e.port == undefined)*/ ) ))
let addedflags = $state({});
// $inspect(dmflagsbyport).with(console.trace);

//ultra wichtig ist filter mit e.default != e.selected, denn allow jump ist standard an. aber die flag wird nicht addiert.
//NUR wenn allow jump != standard ist... also OFF... dann wird flag addiert!
function calcAddedFlags() {
  //CVAR ist die consolen variable dmflags oder dmflags2... wird mit +dmflags[x] xxxx benutzt
  addedflags['dmflags'] =  dmflagsbyport.filter(e=>e.cvar == 'dmflags' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
  addedflags['dmflags2'] =  dmflagsbyport.filter(e=>e.cvar == 'dmflags2' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
  addedflags['dmflags3'] =  dmflagsbyport.filter(e=>e.cvar == 'dmflags3' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
  addedflags['zadmflags'] =  dmflagsbyport.filter(e=>e.cvar == 'zadmflags' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
  addedflags['commandline'] = dmflagsbyport.filter(e=>e.cvar == 'commandline' && e.default != e.selected).reduce( (accum, current) => accum + ' ' + current.value, '' );

  neuMods.save('dmflags', dmflags); // save also dmflags in storage, so its read after restart of app
}
// $inspect(addedflags).with(console.trace);


function resetMap()
{
  map = '';
  mapactive = 0;
}


function selectGameWAD(folderindex) {
  //Do nothing if selectedGameswad is clicked again the same
  if (selectedGameWAD !=folderindex)
    {
      // console.log('in selectGamewad ', gamewads[folderindex]);
      
      //reset folderindexaddons and scrollcursor that scrolling is not buggy with scrollbar
      folderindexAddon = 0;
      scrollcursorAddonWAD = 0;
      selectedaddonwads = [];
      showorderwads = 0;
      scrollcursorLevels = 0;
      mapindex = 0;
      addonwads.map(e=>e.selected=0)  //reset all selected addonWads when changing GameWad
      resetMap();   //reset map warp text if another Gamewad is selected.
      gamewads[folderindex] ? selectedGameWAD=folderindex : 0

      neuMods.save('selectedGameWAD', selectedGameWAD);
      neuMods.save('wadcollection', wadcollection);
    }
  }

  function getButtonText(folderindex) {
	let text = "";
    if (gamewads[folderindex])
    {
      text = `${selectedGameWAD == folderindex ? '→': ''}${gamewads[folderindex].entry}`
    }
	return text.toUpperCase();
  }

  function selectAddonWAD(folderindex) {
	  lastselectedAddonWAD = 0; //reset this for level select whenever Addonlist changes.
	  resetMap(); // also reset map warp text input
    mapindex = 0; //and mapindex for level select menu

    if (addonwads[folderindex]) {
      if (addonwads[folderindex].selected)
        addonwads[folderindex].selected = 0;
      else
        addonwads[folderindex].selected = 1;
    }
    updateSelectedaddonwads();
    neuMods.save('wadcollection', wadcollection);
  }


  function getButtonTextAddon(folderindex) {
    let text = "";
    if (addonwads[folderindex])
    {
      text = `${addonwads[folderindex].selected ? '→': ''}${addonwads[folderindex].entry}`
    }
    return text.toUpperCase();
  }

  function getlastselectedAddonWAD() {
	  //level select popup should show the last wad file maps in Orderwads list.
    updateSelectedaddonwads();

    // e.maps? because DEH or BEX files have no maps array
    let i = selectedaddonwads?.findLastIndex(e=> e.maps?.length > 0)
    // console.log(i);  
    // console.log(selectedaddonwads);

    if (i != -1 && selectedaddonwads[i].selected)
      lastselectedAddonWAD = selectedaddonwads[i];
    else {/*selectedaddonwads = [];*/ lastselectedAddonWAD = 0}
    // resetMap();
    console.log('last found wad in orderlist with maps: ', lastselectedAddonWAD?.entry);
  }

let serverlistPort = $state('zandronum')

async function refreshServerList() {
  if (serverlistPort == 'zandronum')
    serverlist = await getZandronumServerList();
  if (serverlistPort == 'chocolate')
    serverlist = await getChocolateServerList();
  if (serverlistPort == 'odamex')
    serverlist = await getOdamexServerList();
}

function resetServertList() {
  serverlist = []
}


  function setjoinIP(newip, newport, iwad, newjoinPWADS) {
    //delete all missing wads in wadcollection added by previous server join
    
    for (let e = 0; e < wadcollection.length; e++) {
      //also reset any previous selected wads
      if (wadcollection[e].selected)
        wadcollection[e].selected = false; //reset all selected wads from previous join
    }
    //reset all ordered addonwads
    selectedaddonwads = [];


    joinIP = newip;
    doomNetPort = newport;
    // console.log(iwad);
    //select the iwad in gamewads list if found
    let i = gamewads.findIndex(e=>e.entry.toLowerCase() == iwad.toLowerCase());
    if (i != -1)
    {
      selectedGameWAD = i;
      selectGameWAD( i );
    }     
    else {
      console.log('missing iwad ', iwad);
      wadcollection.push( {entry: iwad.toLowerCase() , path: iwad, iwad: true, maps:[], missing: true } );
      //sort the missing iwad in gamewads
      wadcollection.sort((a, b) => a.entry.toLowerCase() > b.entry.toLowerCase() ? 1 : a.entry.toLowerCase() == b.entry.toLowerCase() ? a.dupl=1 : -1);
      //find the new position of the missing iwad
      let r = gamewads.findIndex(e=>e.path == iwad);  
      //and set the index in gamewads to that
      if (r != -1) selectedGameWAD = r;      
    }
    folderindex = selectedGameWAD > 5 ? (selectedGameWAD -5) : 0;  // -5 so the selected gamewad si always at the bottom of the list visible
    scrollcursorGameWAD =  Math.floor( (folderindex) /(gamewads.length/4) )

    // error when pwads are 0 then newjoinPWADS[newjoinPWADS.length-1] suxxx
    if (newjoinPWADS && newjoinPWADS.length > 0) {
      for (let a = 0; a < newjoinPWADS.length; a++) {
        let ia = addonwads.findIndex(e=>e.entry.toLowerCase() == newjoinPWADS[a].name.toLowerCase())
        if (ia != -1)
        {
          //if addon exists then select it
          addonwads[ia].selected = 1;
          //sehr wichtig hier upzudaten, nach jeder gefundenen wad, damit die reihenfolge der PWADs vom Server beibehalten wird!
          updateSelectedaddonwads();
          console.log('found wad in addonwads. updateing selectedaddonwads ');
        }
        else
        {
          selectedaddonwads.push( {entry: newjoinPWADS[a].name.toLowerCase(), path: newjoinPWADS[a].name, iwad: false, selected: true, maps:[], missing: true } );
          console.log('missing pwad ', newjoinPWADS[a].name, ' hash ', newjoinPWADS[a].hash);
        }
      }
    } else {
      //this is when no pwads exist, so scroll on top of the addonslist
      folderindexAddon = 0;
      scrollcursorAddonWAD = 0;
    }
      
    folderindexOrderwads = 0;
    scrollcursorOrderwads = 0;
    // updateSelectedaddonwads();
    showorderwads = 1; //show order wads list
    joingame = 1; //set join game flag
  }


  async function clearServerListPWADS() {
    //delete all missing wads in wadcollection added by previous server join
    for (let e = 0; e < wadcollection.length; e++) {
      if (wadcollection[e].missing)
      {
        wadcollection.splice(e,1);
        e--;
      }
    }

    selectedGameWAD = 0;
    selectGameWAD(0);
    folderindex = 0;
    scrollcursorGameWAD = 0;
    scrollcursorAddonWAD = 0;
    folderindexAddon = 0;
    mapindex = 0;
    resetMap();

    joinIP = await neuMods.getLocalIP();
    doomNetPort = '10666';
  }




  function deletePreset(i) {
    presets.splice(i, 1);
    neuMods.save('presets', presets);
  }

  async function changePresetName(i, newname) {
      presets[i].name = newname;
      neuMods.save('presets', presets);
  }

  function addPreset(i, name) {
      presets[i] = {name, doomPortpath, selectedGameWAD, players, deathmatch, map, skill, joinIP, joingame, doomNetPort}
      presets[i].wadfolders = JSON.parse(JSON.stringify(wadfolders));
      presets[i].wadcollection = JSON.parse(JSON.stringify(wadcollection));
      presets[i].dmflags= JSON.parse(JSON.stringify(dmflags));
      neuMods.save('presets', presets);
  }

  function savePreset(i) {
      let name = presets[i].name;
      presets[i] = {name, doomPortpath, selectedGameWAD, players, deathmatch, map, skill, joinIP, joingame, doomNetPort}
      presets[i].wadfolders = JSON.parse(JSON.stringify(wadfolders));
      presets[i].wadcollection = JSON.parse(JSON.stringify(wadcollection));
      presets[i].dmflags= JSON.parse(JSON.stringify(dmflags));
      neuMods.save('presets', presets);
  }

async function loadPreset(i) {
  // console.log('loading', presets);
  
  if (presets && presets.length > 0)
  {
    doomPortpath= presets[i].doomPortpath;
    wadfolders= JSON.parse(JSON.stringify(presets[i].wadfolders));
    //calculate the wadcollection new and set game
    await readWadFolders(presets[i].wadcollection);
    selectedGameWAD= presets[i].selectedGameWAD;
    players= presets[i].players;
    deathmatch= presets[i].deathmatch;

    let tempdmflags= JSON.parse(JSON.stringify(presets[i].dmflags));
    if (tempdmflags) 
    {
      testloadedDMFlags(tempdmflags);
    }

    map= presets[i].map || '';
    skill= presets[i].skill;
    joinIP= presets[i].joinIP;
    joingame= presets[i].joingame;
    doomNetPort= presets[i].doomNetPort;      
  
    selectGameWAD(selectedGameWAD);
    folderindex = selectedGameWAD > 5 ? (selectedGameWAD -5) : 0;  // -5 so the selected gamewad si always at the bottom of the list visible
    scrollcursorGameWAD =  Math.floor( (folderindex) /(gamewads.length/4) )

    //calculate the var selectedDoomportflags new
    setSelectedDoomPortFlags();
    //so the button flags is marked correctly after loading dmflags, addedflags has to be filled
    calcAddedFlags();
    
    //reset all scroll lists
    folderindexAddon=0;
    scrollcursorAddonWAD = 0;
    scrollcursorLevels = 0;
    mapindex=0;
    showorderwads = 0;
    selectedaddonwads = []; 
    updateSelectedaddonwads();

    //save all loaded preset variables as defaults
    neuMods.save('selectedgameWAD', selectedGameWAD);
    neuMods.save('wadcollection', wadcollection);
    neuMods.save('dmflags', dmflags);
    neuMods.save('doomPortpath', doomPortpath);
    neuMods.save('wadfolders', wadfolders);
    neuMods.save('deathmatch', deathmatch);
    neuMods.save('skill', skill);
    neuMods.save('joinIP', joinIP);
    neuMods.save('joingame', joingame);
    neuMods.save('doomNetPort', doomNetPort);
    neuMods.save('players', players);
    neuMods.save('map', map);
  }
}


  function handleDropAddonwads(e) {
    e.preventDefault();
    const index = e.dataTransfer.getData("text/plain");
    let entry = addonwads[index].entry;
    let path = addonwads[index].path;
    addonwads[index].iwadfake = 1;
    // console.log('in gamewads after drop ', addonwads[index]);
    
    // sortWADS(gamewads);
    let newindex = gamewads.findIndex(e=>e.entry == entry && e.path == path);
    // console.log('in gamewads after drop ', newindex);
    selectGameWAD(newindex);
    folderindex = selectedGameWAD > 5 ? (selectedGameWAD -5) : 0;  // -5 so the selected gamewad si always at the bottom of the list visible
    //set scrollbar cursor position from gamewads list
    scrollcursorGameWAD =  Math.floor( (folderindex+1) /(gamewads.length/4) )
    
    soundRestart(1);
  }

  function handleDropgamewads(e) {
    e.preventDefault();
    
    const index = e.dataTransfer.getData("text/plain");
    // console.log('in drops bei addons ', index);
    if (gamewads[index] && !gamewads[index].iwad)
      {
        gamewads[index].iwadfake = 0;
        if (selectedGameWAD>0) selectedGameWAD--; //fake gamewad will be removed from list so set selectedGameWAD one back
        neuMods.save('selectedgameWAD', selectedGameWAD);
        neuMods.save('wadcollection', wadcollection);
      }
    soundRestart(1);
  }

  function handleDragGamewad(e, i) {
    draggamewad = 1;
    e.dataTransfer.setData("text/plain", i);
    soundRestart(2);
  }

  function handleDragAddonwad(e, i) {
    dragaddonwad = 1;
    e.dataTransfer.setData("text/plain", i);
    soundRestart(2);
  }

  function hideAllPopups() {
    showwadfolders = 0;
    showlevelselect = 0;
    showserverlist = 0;
    showdeathmatchflags = 0;
    showpresets = 0;
    showtxt = 0;
  }

function checkMapName() {
  map = map.trim();
  if (!map) mapactive = 0;
}

function checkTurbo() {
  if (!turbo) {
    turbo = 1;
    turboactive = 0;
  }
}

function checkTimer() {
  if (!timer) {
    timer = 1;
    timeractive = 0;
  }
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
    //if the user inputs anything by hand, then give this back
    return {map: map, customname: 1}
}


async function findTextFile(wadpath) {
  // only allow dbl click textfile find when the game wad is clicked. (NOT .DEH, .BEX files)
    if (['.wad', '.iwad', '.pk3', '.zip', '.pk7'].some(e => wadpath.toLowerCase().includes(e)))
    {
      let parts = await neuMods.getPathParts(wadpath);
      // console.log(parts);
      let find = parts.parentPath.toLowerCase() + '/' + parts.stem.toLowerCase() + '.txt';
      let i = wadcollection.findIndex(e=>e.path.toLowerCase() == find );
      if (i != -1)
      {
        let txt = await neuMods.readTXT(wadcollection[i].path);
        let txtobj = {txt, wad: parts.filename}
        return txtobj;
      }
             
    }
    return '';
}

// $inspect('draggamewad: ', draggamewad);
// $inspect('dragaddonwad: ', dragaddonwad);
// $inspect('pwads', joinServerListPWADS)

// $inspect('addedflags: ', addedflags);

// $inspect('presets: ', presets);

// $inspect('wadcollection:', wadcollection, gamewads, addonwads);
// $inspect('addonwads: ',addonwads);
// $inspect('gamewads: ',gamewads);

function findMid() {
  let length = Math.min(doomPortpath.name.length+1, 25)
  let mid = cols/2-(length/2);
  // console.log(length, mid);
  
  return Math.round(mid);
}



</script>

<svelte:window bind:innerHeight="{windowH}" bind:innerWidth="{windowW}" />

<Snow {scale}/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="center-grid" style="width:{gridW}px; height:{gridH}px; transform: scale({scale}); grid-template-columns: repeat({cols}, {cellw}px); grid-template-rows: repeat({rows}, {cellh}px);" onmousemove="{e=>{calcPixelCurser(e)}}">
    <div class="cursor-cell" style="width:{cellw}px; height:{cellh}px;" style:left="{cursorleft}px"  style:top="{cursortop}px"> </div>

    <!-- Command line preview -->
    <div style="cursor: text; font-size:x-small; position: fixed; color:white; top:-16px; overflow: clip; white-space: nowrap;">
      C:\>{doomPortpath.name.toUpperCase()}.EXE 
      {players > 1 && !joingame ? selectedDoomPortFlags == 'Chocolate' ? ' -server ' + players : ' -host ' + players : ''}
      {gamewads.length ? '-iwad' : ''} {gamewads[selectedGameWAD]?.entry} 
      {mapformatted(map)?.customname ? '+map ' + mapformatted(map)?.map : ''} {mapformatted(map)?.customname == 0 ? '-warp ' + mapformatted(map)?.map : ''}
      {selectedaddonwads.length ? '-file' : ''} {selectedaddonwads?.map(e=>e.entry).join(' ')}
    </div>  
			
			<div class="border-outer"></div>
			<div class="border-inner"></div>

			<button class="h hov" style="overflow: hidden; white-space:pre; grid-column: {findMid()} / span {Math.min(doomPortpath.name.length+1, 25)}; grid-row: {1}" 
        title="click to change port"
        onmousedown="{()=> { soundRestart(0);}}" 
        onclick="{async ()=>{doomPortpath = await neuMods.showFileDialog(); setSelectedDoomPortFlags(); calcAddedFlags(); neuMods.save('doomPortpath', doomPortpath)}}"
        >{doomPortpath.name.toLocaleUpperCase()}</button>
      <button class="presetbtn" style=" grid-column: {cols-10} / span 7; grid-row: {1}" onmousedown="{()=>  {soundRestart(0);}}" onclick="{async ()=>{hideAllPopups(); }}"><span class="presetbtntext lines"> Config </span></button>

      <div class="h1" style="grid-column: 2 / 50; grid-row: {2}">DeathManager! v1.666 (C) 2025 Schnalz Soft ♥</div>

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {3}"></div>
			<div class="h2" style="grid-column: 3 / 12; grid-row: {3}">Game WAD</div>
			<button class="h4" style="grid-column: 13 / span 1; grid-row: {3}" onmousedown="{()=>  {soundRestart(0);}}" onclick="{async ()=>{hideAllPopups(); showwadfolders=1;}}">+</button>
	

			<!-- START GAME WAD Auswahl -->
      <ScrollBar rowstart={4} rows={6} column={19} scrollUp={()=>scroll('up', 6)} scrollDown={()=>scroll('down', 6)} pageScrollUp={()=>pageScroll('up', 6)} pageScrollDown={()=>pageScroll('down', 6)} scrollcursorpos={scrollcursorGameWAD} />

      {#each Array(6) as rowWAD, i}
        <button class="h4 {gamewads[folderindex+i]?.dupl && selectedGameWAD != folderindex+i ? 'hdis' : ''} { selectedGameWAD == folderindex+i ? 'hsel' : ''}" style="grid-column: {3} / span 16; grid-row: {4+i}; {gamewads[folderindex+i]?.missing ? 'color: red;' : '' }" 
        title="{gamewads[folderindex+i]?.path}"  
        draggable="{!gamewads[folderindex+i]?.iwad}" 
          ondragstart="{(e)=>handleDragAddonwad(e, folderindex+i)}" ondragend="{()=>dragaddonwad = 0}"
          ondrop="{(e)=>handleDropAddonwads(e)}" ondragover="{(e)=>{if (!showorderwads) dragaddonwad == 0 ? e.preventDefault() : 0}}" 
          onclick="{()=>{selectGameWAD(folderindex+i); updateSelectedaddonwads();  soundRestart(2);}}" 
          onwheel="{e=>e.deltaY > 0 ? scroll('down', 6) : scroll('up', 6)}"
          > 
            {getButtonText(folderindex+i)}
        </button>
      {/each}
			<!-- ENDE GAME WAD Auswahl -->

      <div class="border-mid" style="grid-column: {3+19}; grid-row: 3 / {13};"></div>

			<button class="h4" style="background-color:{showorderwads ? 'green' : 0}; grid-column: {24+17} / span {1}; grid-row: {3}" title="change order of wads" 
              onmousedown="{()=>  {soundRestart(0);}}" 
              onclick="{async ()=>{scrollcursorAddonWAD = 0; folderindexAddon = 0; folderindexOrderwads = 0; scrollcursorOrderwads = 0; updateSelectedaddonwads(); showorderwads = !showorderwads}}">
        ↕</button>

      <!-- START ADDON WAD Auswahl -->
      {#if !showorderwads}
        <div class="h2" style="white-space: nowrap; text-align:left; padding-left: 3px; grid-column: 24 / {34 +5}; grid-row: {3}">Addon WAD {addonwads.filter(e=>e.selected).length}/{addonwads.length}</div>

      <ScrollBar rowstart={4} rows={6} column={46} scrollUp={()=>scrollAddons('up', 6)} scrollDown={()=>scrollAddons('down', 6)} pageScrollUp={()=>pageScrollAddons('up', 6)} pageScrollDown={()=>pageScrollAddons('down', 6)} scrollcursorpos={scrollcursorAddonWAD} />

        {#each Array(6) as rowWAD, i}
          <div style="background-color: black; grid-column: {24} / span 22; grid-row: {4+i};">
          </div>
          <button class="h4 {addonwads[folderindexAddon+i]?.selected ? 'hsel' : ''}"   style="background: none; grid-column: {24} / span 22; grid-row: {4+i}; " 
            title="{addonwads[folderindexAddon+i]?.path}"  
            draggable="{addonwads[folderindexAddon+i] != undefined}" 
            ondragstart="{(e)=>{ handleDragGamewad(e, folderindexAddon+i) } }" 
            ondragend="{()=>{  draggamewad = 0 } }"
            ondrop="{(e)=>{ handleDropgamewads(e) } }" 
            ondragover="{(e)=>{ draggamewad == 0 ? e.preventDefault() : 0 } }"
            ondblclick={async ()=>{textfile = await findTextFile(addonwads[folderindexAddon+i].path); if (textfile) showtxt=1;}}
            onclick="{()=>{ if (addonwads[folderindexAddon+i] != undefined) selectAddonWAD(folderindexAddon+i); updateSelectedaddonwads();  soundRestart(2);}}" 
            onwheel="{e=>e.deltaY > 0 ? scrollAddons('down', 6) : scrollAddons('up', 6)}"
            
            >
              {getButtonTextAddon(folderindexAddon+i)}
          </button>
        {/each}
      {/if}
      <!-- ENDE ADDON WAD Auswahl -->

      <!-- START ORDER SELECTED ADDON WAD LIST -->
      {#if showorderwads}        
        <PopupOrderwads bind:selectedaddonwads bind:folderindexOrderwads bind:scrollcursorOrderwads {updateSelectedaddonwads} {resetMap} />
      {/if}
      <!-- ENDE ORDER SELECTED ADDON WAD LIST -->


      {#if showwadfolders}
        <PopupWadFolders bind:showwadfolders {wadfolders} {onWadFoldersAdd} {readWadFolders} {spliceWadFolders}/>
      {/if}

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {10}"></div>

			<!-- NUMBER OF PLAYERS with Radiobuttons -->
			<div class="h2" style="grid-column: 3 / 16; grid-row: {10}"># of Players</div>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: 3 / span 6; grid-row: {11}" onclick="{()=>{players=1; neuMods.save('players', players); soundRestart(2);}}"> (<span class="y">{players==1 ? '•' : ' '}</span>) SP </button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+7} / span 5; grid-row: {11}" onclick="{()=>{players=2; neuMods.save('players', players); soundRestart(2);}}">(<span class="y">{players==2 ? '•' : ' '}</span>) 2</button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3} / span 5; grid-row: {12}" onclick="{()=>{players=3; neuMods.save('players', players); soundRestart(2);}}">(<span class="y">{players==3 ? '•' : ' '}</span>) 3</button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+7} / span 5; grid-row: {12}" onclick="{()=>{players=4; neuMods.save('players', players); soundRestart(2);}}">(<span class="y">{players==4 ? '•' : ' '}</span>) 4</button>
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3+7+6} / span 5; grid-row: {11}" onclick="{()=>{players=5; neuMods.save('players', players); soundRestart(2);}}">(<span class="y">{players==5 ? '•' : ' '}</span>)5</button>
        
        <button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+7+5} / span 5; grid-row: {12}" onclick="{()=>{players=6; neuMods.save('players', players); soundRestart(2);}}">(<span class="y">{players>=6 ? '•' : ' '}</span>)</button>
        <input class="inp" style="grid-column: {3+7+6+3} / span 3; grid-row: {12}" maxlength="2" min="1"  max="64" type="number" spellcheck="false" bind:value={players} />

			<!-- GAMETYPEs with Radiobuttons -->
			<div class="h2" style="grid-column: 24 / 34; grid-row: {10}">Game Type</div>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: 24 / span 15; grid-row: {11}" onclick="{()=>{deathmatch=0; neuMods.save('deathmatch', deathmatch); resetFlagDefaults(); calcAddedFlags(); soundRestart(2);}}">(<span class="y">{deathmatch==0 ? '•' : ' '}</span>) Cooperative</button>
          <button class="h {joingame ? "hdis" : 0}" style="grid-column: {24+15} / span 10; grid-row: {11}" onclick="{()=>{hideAllPopups(); showdeathmatchflags = 1; soundRestart(0);}}">(<span class="y">{addedflags['dmflags'] || addedflags['dmflags2'] || addedflags['dmflags3'] || addedflags['zadmflags'] || addedflags['commandline'] ? '•' : ' ' }</span>) Flags</button>
        <button class="h {joingame ? "hdis" : 0}" style="grid-column: 24 / span 14; grid-row: {12}" onclick="{()=>{deathmatch=1; neuMods.save('deathmatch', deathmatch); changeDMFlagDefaults(); calcAddedFlags(); soundRestart(2);}}">(<span class="y">{deathmatch==1 ? '•' : ' '}</span>) DeathMatch</button>

        {#if showdeathmatchflags}
          <PopupFlags bind:showdeathmatchflags bind:dmflags bind:selectedDoomPortFlags {dmflagsbyport} bind:addedflags {calcAddedFlags} />
        {/if}
				
			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {13}"></div>

			<!-- IPADDRESS PUBLIC and JOIN IP with Radiobutton -->
			<div class="h2" style="grid-column: 3 / span 13; grid-row: {13}">Connect Type</div>
				<button class="h " style="text-align:left; grid-column: {3} / span 10; grid-row: {14}" onclick="{() =>{if (joingame) { joingame = 0; /*clearServerListPWADS();*/ } navigator.clipboard.writeText(pupblicIP); soundRestart(2);} }" >(<span class="y">{joingame == false ? '•' : ' '}</span>) Server</button>

        <button class="h {joingame ? "hdis" : 0}" style="text-align:right; grid-column: {18+13} / span 18; grid-row: {14}" onclick="{() =>{ navigator.clipboard.writeText(pupblicIP); soundRestart(1);} }" 
          title="copy to clipboard"
          > IP:{pupblicIP}</button>
        <input class="inp" style=" grid-column: {14} / span {16+servernamefocus*19}; grid-row: {14}" type="text" title="Servername" maxlength="80" spellcheck="false" onfocus={()=>{servernamefocus = 1}} onblur={()=>{servernamefocus = 0}} bind:value={servername} />

 
				<button class="h" style="text-align:left; grid-column: {3} / span 10; grid-row: {15}"  onclick="{()=> {joingame = 1; soundRestart(2);}}">(<span class="y">{joingame ? '•' : ' '}</span>) Join</button>
				<input class="inp" style="grid-column: {14} / span 16; grid-row: {15}"  maxlength="15" spellcheck="false" bind:value={joinIP} />
        <button class="h2" style="grid-column: {38} / span 11; grid-row: {16}"  onclick="{()=> {hideAllPopups(); showserverlist = 1; soundRestart(2);}}"> <span class="btntext pad">Server List</span> </button>

				<div class="h" style="text-align:left; grid-column: {3} / span 5; grid-row: {16}" >Port:</div>
				<input class="inp" style="grid-column: {14} / span 7; grid-row: {16}" type="number" maxlength="5" spellcheck="false" bind:value={doomNetPort} />
        
        {#if showserverlist}
        <PopupServerList bind:showserverlist {serverlist} bind:serverlistPort {refreshServerList} {resetServertList} {setjoinIP} {serverindex} {scrollcursorServers}/>
        {/if}

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {17}"></div>
			<!-- MAP with Radiobutton -->
			<div class="h2" style="grid-column: 3 / span 13; grid-row: {17}">Map Warping</div>
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3} / span 8; grid-row: {18}"  onclick="{()=> {getlastselectedAddonWAD(); hideAllPopups(); !mapactive ? showlevelselect=1 : 0; mapactive = !mapactive; soundRestart(0);}}">(<span class="y">{mapactive ? '•' : ' '}</span>) Map: </button>
				<!-- <button class="h2 {joingame ? "hdis" : 0}" style="text-align:left; white-space: pre; grid-column: {3} / span 8; grid-row: {18}"  onclick="{()=> {getlastselectedAddonWAD(); hideAllPopups();  showlevelselect=1; soundRestart(0);}}"> <span class="btntext">Select Map</span> </button> -->
        <input class="inp" style="grid-column: {3+9+1} / span 8; grid-row: {18}"  maxlength="8" spellcheck="false" bind:value={map} onblur={checkMapName} onchange="{()=>{ checkMapName(); neuMods.save('map', map) } }" />

        <!-- POPUP LEVEL SELECT -->
        {#if showlevelselect}
          <PopupMaps bind:showlevelselect {gamewads} {selectedGameWAD} {lastselectedAddonWAD} {scrollcursorLevels} bind:map {mapindex} {checkMapName}/>
        {/if}

        <!-- SKILL OPTION -->
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3} / span 10; grid-row: {18+1}"  onclick="{()=> {skillactive = !skillactive; soundRestart(2);}}">(<span class="y">{skillactive ? '•' : ' '}</span>) Skill</button>
				<input class="inp" style="grid-column: {3+10} / span 3; grid-row: {18+1}" maxlength="1" min="1" max="5" type="number" bind:value={skill} />
				<div class="h5 {joingame ? "hdis" : 0}" style="grid-column: {3+10+3} / span 5; grid-row: {18+1}">[1-5]</div>
			
      <!-- TURBO OPTION -->
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3+21} / span 10; grid-row: {18}"  onclick="{()=> {turboactive = !turboactive; soundRestart(2);}}">(<span class="y">{turboactive ? '•' : ' '}</span>) Turbo</button>
				<input class="inp" style="grid-column: {3+21+10} / span 5; grid-row: {18}" maxlength="3" min="1" max="250" type="number" onchange={checkTurbo} bind:value={turbo} />
				<div class="h5 {joingame ? "hdis" : 0}" style="grid-column: {3+21+10+5} / span 8; grid-row: {18}">[1-250]</div>
      <!-- TIMER OPTION -->
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3+21} / span 10; grid-row: {18+1}"  onclick="{()=> {timeractive = !timeractive; soundRestart(2);}}">(<span class="y">{timeractive ? '•' : ' '}</span>) Timer</button>
				<input class="inp" style="grid-column: {3+21+10} / span 4; grid-row: {18+1}" maxlength="2" min="1" max="99" type="number" onchange={checkTimer} bind:value={timer} />
				<div class="h5 {joingame ? "hdis" : 0}" style="grid-column: {3+21+10+4} / span 8; grid-row: {18+1}">[1-99]</div>

      <!-- PRESET BUTTON and PRESET SELECTION POPUP -->
      <button class="presetbtn" style=" grid-column: 21 / span 9; grid-row: {rows}" onmousedown="{()=>  {soundRestart(0);}}" onclick="{async ()=>{hideAllPopups(); showpresets = 1;}}"><span class="presetbtntext lines">☺ Preset</span></button>
      {#if showpresets}
        <PopupPresets bind:showpresets {presets} {savePreset} {loadPreset} {changePresetName} {addPreset} {deletePreset}/>
      {/if}

      <!-- <button class="presetbtn" style=" grid-column: 9 / span 9; grid-row: {20}" onmousedown="{()=>  {soundRestart(0);}}" onclick="{async ()=>{hideAllPopups(); showpresets = 1;}}"><span class="presetbtntext lines">Commands</span></button> -->

      <!-- GO BUTTON AT BOTTOM LINE -->
			<button class="go" style="grid-column: 43 / span 5; grid-row: {rows}" onclick="{()=>{ soundRestart(1); neuMods.startGame(selectedDoomPortFlags, doomPortpath.fullpath, gamewads[selectedGameWAD]?.path , selectedaddonwads, joingame, joinIP, doomNetPort, players, deathmatch, skillactive, skill, mapactive, mapformatted(map), addedflags, servername, turboactive, turbo, timeractive, timer); /*clearServerListPWADS()*/ } }">Go!</button>  


      <!-- TEXT FILE OPEN POPUP -->
      {#if showtxt}
        <div class="popup" style="z-index:20; grid-column: 4 / 48; grid-row: {2} / span 15"></div>
        <div class="border-outerhoriz-popup" style="z-index: 20; grid-column: 4 / 48; grid-row: {2} / span 15"></div>
        <div class="border-outervertic-popup" style="z-index: 20; grid-column: 4 / 48; grid-row: {2} / span 15"></div>
        <div class="presetbtntext" style="z-index:20; text-transform: capitalize; text-align:center; grid-column: 6 / span {textfile?.wad.length+1}; grid-row: {2}" >{textfile?.wad}</div>
   
        <textarea class="txt" style="z-index:20; grid-column: 5 / 47; grid-row: {3} / span 13" spellcheck="false" readonly value="{textfile?.txt}"></textarea>
        <button class="presetbtntext" style="z-index:20; grid-column: 41 / span 6; grid-row: {16}" onclick={()=>showtxt=0} >Close</button>
      {/if}

</div>


<style>
:root {
	--bg-window: rgb(0, 0, 170);
	--border: rgb(94, 255, 255);

	--text: rgb(255, 255, 255);
	--text-column: rgb(85, 255, 85);
	--text-black: black;

	--text-selected: black;
	--bg-selected: rgb(0, 170, 170);


	--text-popup: rgb(170, 170, 170);
	--bg-popup: rgb(170, 170, 170);
	--border-popup: black;
	--text-important: rgb(255, 255, 85);
	--btn-selected: rgb(170, 85, 0);
}

.center-grid {
    position: relative;
    display: grid;
    background-color: var(--bg-window);
    cursor: none;
}

.cursor-cell {
  z-index:1000;
	user-select: none;
	mix-blend-mode:difference;
	color: black;
	font-family: monospace;
	font-weight: bolder;

	background-color: rgb(255, 0, 0);
	position: absolute;
	pointer-events: none;
}

.txt {
  font-family: 'WebPlus_IBM_VGA_8x16';
  resize: none;
  font-size: 0.5em;
  border-width: 0px;
  color: rgb(214, 214, 214);
  background-color: rgb(12, 12, 12);
  /* overflow: scroll; */
  white-space: pre;
  scrollbar-width: thin;
  scrollbar-color: white grey;
  border-radius: 0px;
  outline: none;
}

:global(.popup)  {
	background-color: var(--bg-window);
	z-index: 10;
	box-shadow: 16px 16px 0px 0px rgba(0,0,0,0.8);
}

:global(.cellupdown) {
	position: relative;
	margin: 0; padding: 0; width: 8px; height: 16px;
	border: 0; cursor: none;
	font-weight: bolder;
	user-select: none;
	font-size: 16px;
	background-color: black; 
	color: var(--text);
}

.border-outer {
	grid-column: 1 / -1;
	grid-row: 1 / -1;
	margin: 6px 1px 8px 2px;
	border-left: 2px solid var(--border);
	border-right: 2px solid var(--border);
	border-top: 1px solid var(--border);
	border-bottom: 1px solid var(--border);
}

.lines {
	border-left: 2px solid var(--border);
	border-right: 2px solid var(--border);
  margin:0;
  padding-left: 4px;
  padding-right: 4px;
}
.pad {
  margin:0;
  padding-left: 4px;
  padding-right: 4px;
}

.border-inner {
	grid-column: 1 / -1;
	grid-row: 1 / -1;
	margin: 6px 4px 8px 5px;
	border-left: 2px solid var(--border);
	border-right: 2px solid var(--border);
	/* border-top: 1px solid var(--border); */
	/* border-bottom: 1px solid var(--border); */
}


.border-mid {
	margin: 6px 1px -6px 2px;
	border-left: 2px solid var(--border);
	border-right: 2px solid var(--border);
}

.border-horizontal {
	margin: 6px -2px 8px -2px;
	border-top: 1px solid var(--border);
}

:global(.border-outerhoriz-popup) {
	margin: 6px 1px 8px 1px;
	border-top: 1px solid var(--border);
	border-bottom: 1px solid var(--border);
}
:global(.border-outervertic-popup) {
	margin: 6px 1px 8px 1px;
	border-left: 2px solid var(--border);
	border-right: 2px solid var(--border);
}
:global(.border-horizontal-popup) {
	margin: 6px 1px 8px 1px;
	border-top: 1px solid var(--border);
}

:global(.h) {
	user-select: none;
	text-align: center;
	background-color: var(--bg-window); 
	color: var(--text);
}


:global(.h1) {
	user-select: none;
	text-align: center;
	background-color: var(--bg-popup); 
	color: var(--text-black);
}

:global(.h2) {
	user-select: none;
	text-align: center;
	background-color: var(--bg-window); 
	color: var(--text-column);
}

.presetbtn, .presetbtntext {
  user-select: none;
	text-align: center;
  color: var(--border);
  background-color: var(--bg-window); 
}

.presetbtntext {
  user-select: none;
	text-align: center;
  white-space: pre;
  color: var(--text);
  background-color: var(--bg-window); 
}

.presetbtntext:hover {
  /* color: var(--border); */
  background-color: rgb(100, 100, 100); 
  color: var(--text);
}

.btntext {
  user-select: none;
	text-align: center;
  white-space: pre;
  color: var(--text-important);
  background-color: var(--bg-window); 
}

.btntext:hover {
  /* color: var(--border); */
  background-color: rgb(100, 100, 100); 
  color: var(--text);
}


:global(.cellgray) {
	user-select: none;
	text-align: center;
  overflow-wrap: break-word;
	background-color: var(--bg-window);
  color: rgb(225, 225, 225);
}
:global(.cellblack) {
	user-select: none;
	text-align: center;
	background-color: rgb(0, 0, 0); 
}
:global(.h4) {
	user-select: none;
	text-align: left;
	overflow: hidden;
	background-color: black; 
	color: var(--text);
  white-space: nowrap;
}



.go {
    user-select: none;
    text-align: center;
    overflow: hidden;
    background-color:rgb(255, 255, 255);
    color: var(--text-black);
    /* top:8px; */
    /* box-shadow: 8px 8px 0px 0px rgba(0,0,0,0.8); */
}

.go:hover {
    background-color:var(--btn-selected);
    color: var(--text-black);
    /* top:8px; */
    /* box-shadow: 8px 8px 0px 0px rgba(0,0,0,0.8); */
}

.h5 {
	user-select: none;
	text-align: left;
	overflow: hidden;
	color: var(--border);
}

:global(button, input) {
	position: relative;
	margin: 0; padding: 0;
	border: 0; cursor: none;
	user-select: none;
	font-size: 16px;
	background-color: black; 
	color: var(--text);
}

:global(button:active) {
	color: var(--bg-selected);
}

:global(button:hover) {
	color: var(--border);
}

.y {
	color: var(--text-important);
}

.hdis {
	color: gray;
}
:global(.hsel) {
	color: var(--text-important);
}

:global(.hov) {
	background-color: none;
}

:global(.hov:hover) {
	background-color: rgb(100, 100, 100); 
  color: var(--text);
}

.inp {
  outline: 0px ; 
  text-align:left;
  background-color: rgba(0, 0, 0, 0.605);
  color: rgb(255, 255, 255);
  text-overflow: ellipsis;
}

.inp:active, .inp:focus {
  background-color: black;
  color: white;
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
