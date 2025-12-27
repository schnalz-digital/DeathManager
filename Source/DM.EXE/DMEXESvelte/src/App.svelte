<script>
// @ts-nocheck
// TODO 
// add custom command line arguments (already in chocolate doom implemented via flags)
// flags support odamex
// scrolllists for flags, presets
// gzdoom deathmatch defaults checken
// zandronum register master server und broadcast als command line dazu
// unknown doomports use flags of gzdoom?
// permissions check evtl. bei ./downloads path erstellung? wegen linux und mac?
// change gamewads and addonwads to states and not derived. use functions to update gamewads and addonwads
// support config files
// hide deh files dependant if exmy wad or map wad is selected
// button to clear selected list
// add wad download https://www.quaddicted.com/files/idgames/levels/doom2/ folders a-c ...
// pk7(seems 7zip) support read folder structure 

import { onMount } from 'svelte';

import * as neuMods from "./lib/neuMods.js"

import { getIP, soundRestart, getZandronumServerList, getChocolateServerList, getOdamexServerList } from "./lib/shared.svelte.js";

import PopupFlags from "./lib/popupFlags.svelte";
import PopupWadFolders from "./lib/popupWadFolders.svelte";
import PopupServerList from "./lib/popupServerList.svelte";
import PopupPresets from "./lib/popupPresets.svelte";
import PopupMaps from "./lib/popupMaps.svelte";
import PopupOrderwads from "./lib/popupOrderwads.svelte";


$effect(async () => {
  // neuMods.testpk3();
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
  if (!map) map = '';

  //loading dmflags from save. if save is an older version of DMFLAGS, find out and dont overwrite dmflags with save!
  //otherwise the dmflags would be the old version and missing flags
  let tempdmflags = await neuMods.load('dmflags');
  if (tempdmflags) 
  {
    testloadedDMFlags(tempdmflags);

    // let compareflags =  JSON.parse(JSON.stringify(tempdmflags));
    // let missingflag = 0;
    // for (let i = 0; i < dmflags.length; i++) {
    //   let found = compareflags.some(e=> e.cvar == dmflags[i].cvar && e.value == dmflags[i].value && e.name == dmflags[i].name && dmflags[i].default == e.default)
    //   if (found == false) 
    //   {missingflag = 1; break;}
    // }
    // if (missingflag) 
    //   console.log('old saved dmflags object version');
    // else
    //   dmflags = JSON.parse(JSON.stringify(tempdmflags));
  }

  //then calc the correct flags for addedflags variable for commandline.
  calcAddedFlags();

  presets = await neuMods.load('presets');
  if (!presets) presets = [];


  document.addEventListener('curlProgress', function(e) {
    // console.log(addonwads);
    // console.log(e.detail.filename, e.detail.progress);
    let i = selectedaddonwads.findIndex(el=>el.entry == e.detail.filename)
    if (i != -1)
    {
      selectedaddonwads[i].progress = e.detail.progress;

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

})

function testloadedDMFlags(tempdmflags) {
    let compareflags =  JSON.parse(JSON.stringify(tempdmflags));
    let missingflag = 0;
    for (let i = 0; i < dmflags.length; i++) {
      let found = compareflags.some(e=>e.deathmatch == dmflags[i].deathmatch && e.port == dmflags[i].port && e.cvar == dmflags[i].cvar && e.value == dmflags[i].value && e.name == dmflags[i].name && dmflags[i].default == e.default)
      if (found == false) 
      {missingflag = 1; break;}
    }
    if (missingflag) 
      console.log('old saved dmflags object version');
    else
      dmflags = JSON.parse(JSON.stringify(tempdmflags));  
}

  let cols = 50, rows = 20;
  let hwindow = rows*16;
  let vwindow = cols*8;

  let hview = $state(1);
  let vview = $state(1);

  let scale = $derived.by( () => {
    if (vview/hview >= 4/3)       //wichtig falls window horizontal breiter als vertikal, dann bastel scalefaktor nur mit höhe
      return (hview / hwindow -0.1);
    else                          //ansonsten nimm scalefaktor aus den breitenwerten
      return (vview / vwindow -0.1);
  });

  //der scheiss ist, weil transform scale bei weniger als 400x300 pixeln (so groß ist das center window)
  //das top und left zum browserwindow verkackt. muss künstlich nach links und oben -top, -left gesetzt weren.
  let top = $derived.by( () => {
    if (hview < 320) return (hview*scale - 320*scale); 
    else return 0;
  });

  let left = $derived.by( () => {
    if (vview < 400) return (vview*scale - 400*scale); 
    else return 0;
  });

  let cursortop = $state(0), cursorleft = $state(0);

  let calcPixelCurser = (e) => {
    let rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left; //x position within the element.
    let y = e.clientY - rect.top;  //y position within the element.
    let cellw=8, cellh=16; 
    cursorleft = Math.max( Math.floor(x/(scale*cellw))*cellw, 0 );
    cursortop= Math.max( Math.floor(y/(scale*cellh))*cellh, 0 ); 
  }
  

  function scrollupGameWAD() {
	if (folderindex > 0) {
    folderindex--; 
    //scrollcursor has 4 chars height scrollspace. so devide all gamewads by 4 to fit all games in 4 scrollbarchars
    //folderindex +1 for the lower bounds. that gives up down scrolling smooth distance of cursor bounce
    scrollcursorGameWAD =  Math.floor( (folderindex+1) /(gamewads.length/4) )

    soundRestart(0);
    }
  // console.log(gamewads.length, folderindex/(gamewads.length/4));
  }

  function scrolldownGameWAD() {
    if (folderindex+5 < gamewads.length-1){ 
      folderindex++; 
      //set +5 to check lower bounds for scrollcursor. otherwise the cursor bounces at end folderindexes
      //folderindex +4 for the upper bounds. that gives up down scrolling smooth distance of cursor bounce
      scrollcursorGameWAD = Math.floor( (folderindex+5) /(gamewads.length/4))

      soundRestart(0);
    }
    // console.log(gamewads.length, folderindex/(gamewads.length/4));
  }

  function scrollupAddons() {
    if (folderindexAddon > 0) {
      folderindexAddon--; 
      scrollcursorAddonWAD = Math.floor( (folderindexAddon+1) /(addonwads.length/4))

      soundRestart(0);
    }
    // console.log(addonwads.length, folderindexAddon/(addonwads.length/4));
  }

  function scrolldownAddons() {
    if (folderindexAddon+5 < addonwads.length-1) {
        folderindexAddon++; 
        scrollcursorAddonWAD = Math.floor( (folderindexAddon+5) /(addonwads.length/4) )

        soundRestart(0);
    }
    // console.log(addonwads.length, folderindexAddon/(addonwads.length/4));  
}

  // timer for scrolling acceleration when mouse button is held down
  let mouseclickTimer = $state(0);

  function clickInterval(scrollfunk) {
    if(mouseclickTimer) clearInterval(mouseclickTimer); // seems to help by spam clicking and draggin in the window timer goes forever error
    
    scrollfunk();
    startInterval(130, scrollfunk);
  }

  function startInterval(speed, scrollfunk) {
    mouseclickTimer = setInterval(()=>{ 
        clearInterval(mouseclickTimer);
        if (speed > 36) speed -= 8;
        startInterval(speed, scrollfunk);

        scrollfunk();
    }, speed)
  }

  function clearAllTimers() {
    clearInterval(mouseclickTimer);
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


let showwadfolders = $state(0);
let showlevelselect = $state(0);
let showserverlist = $state(0);
let showdeathmatchflags = $state(0);
let showpresets = $state(0);

let doomPortpath = $state({name: 'Choose Doom Port ...'})
let players = $state(1)
let deathmatch = $state(0)
let pupblicIP = $state('0.0.0.0')

let joinIP = $state('192.168.0.1')
let joingame = $state(0);

let doomNetPort = $state('10666');
let skill = $state(3);
let skillactive = $state(0);
let map = $state('');
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
    //inlude DEH and PK3 always:
    if (element.maps == undefined || element.maps?.length == 0) wads.push(element);
    else
    {
      //Include only MAPXX format addonwads when gamwad is also MAPXX format.
      if (mapname?.includes('MAP') && element.maps[0].includes('MAP'))    //mapname?... important because mapname can be undefined if no gamewads exist yet.
        wads.push(element);
      //otherwise include ExMy Map Format ADdons like Doom1
      else if (mapname?.includes('E') && element.maps[0].includes('E'))   //mapname?... important because mapname can be undefined if no gamewads exist yet.
        wads.push(element);
      else if (!mapname)   //if iwadfake is selected, include all addonwads
        wads.push(element);
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

  a = dmflags.find(e=>e.value == '-nomonsters' && e.port == selectedDoomPortFlags);
  a ? a.selected = true : 0;

  a = dmflags.find(e=>e.value == '-altdeath' && e.port == selectedDoomPortFlags);
  a ? a.selected = true : 0;
}

function resetFlagDefaults() {
  dmflags.forEach(e=>e.selected = e.default);
}

let dmflags = $state([]);
dmflags = [
  //dmflags
  {port:'GZDoom', cvar: 'dmflags', value: 16384, name: 'Items respawn', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 65536, name: 'Allow jump', default: true, selected: true  },
  {port:'GZDoom', cvar: 'dmflags', value: 4, name: '(DM) Weapons Stay', deathmatch:1, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 128, name: '(DM) Respawn farthest away', deathmatch:1, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 4096, name: 'No monsters', default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 33554432, name: '(coop) Lose keys on death', deathmatch:0, default: false, selected: false  },
  {port:'GZDoom', cvar: 'dmflags', value: 2097152, name: '(coop) No Deathmatch weapons', deathmatch:0, default: false, selected: false },

  {port:'Zandronum', cvar: 'dmflags', value: 16384, name: 'Items respawn', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 65536, name: 'Allow jump', default: true, selected: true  },
  {port:'Zandronum', cvar: 'dmflags', value: 4, name: '(DM) Weapons Stay', deathmatch:1, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 128, name: '(DM) Respawn farthest away', deathmatch:1, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 4096, name: 'No monsters', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 33554432, name: '(coop) Lose keys on death', deathmatch:0, default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 2097152, name: '(coop) No Deathmatch weapons', deathmatch:0, default: false, selected: false },
  //dmflags2
  {port:'GZDoom', cvar: 'dmflags2', value: 134217728, name: 'Big powerups respawn', default: false, selected: false  },
  {port:'Zandronum', cvar: 'dmflags', value: 524288, name: 'Big powerups respawn', default: false, selected: false  },
  //dmflags3 - zandronum has zadmflags
  {port:'GZDoom', cvar: 'dmflags3', value: 2, name: '(coop) Share keys ', deathmatch:0, default: false, selected: false  },
  {port:'Zandronum', cvar: 'zadmflags', value: 64, name: '(coop) Share keys ', deathmatch:0, default: false, selected: false  },
  {port:'Chocolate', cvar: 'commandline', value: '-nomonsters', name:'No Monsters', default:false, selected:false},
  {port:'Chocolate', cvar: 'commandline', value: '-altdeath', name:'Respawn Weapons and Items (DM2.0)', default:false, selected:false}
    
]

let selectedDoomPortFlags = $state('GZDoom');

//change for dmflags doomport tabs in flags menu. try to preselect depends on filename of port.
function setSelectedDoomPortFlags() {
  if (doomPortpath.name.toLowerCase().includes('gzdoom')) selectedDoomPortFlags = 'GZDoom';
  if (doomPortpath.name.toLowerCase().includes('zandron')) selectedDoomPortFlags = 'Zandronum';
  if (doomPortpath.name.toLowerCase().includes('chocol')) selectedDoomPortFlags = 'Chocolate';
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
      map = '';   //reset map warp text if another Gamewad is selected.
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
	  map = '' // also reset map warp text input
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
	  //level select popup should show the last wad file maps.
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
    map = '';

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

    tempdmflags= JSON.parse(JSON.stringify(presets[i].dmflags));
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
  }


// $inspect('draggamewad: ', draggamewad);
// $inspect('dragaddonwad: ', dragaddonwad);
// $inspect('pwads', joinServerListPWADS)

// $inspect('addedflags: ', addedflags);

// $inspect('presets: ', presets);

// $inspect('wadcollection:', wadcollection, gamewads, addonwads);
// $inspect('addonwads: ',addonwads);
// $inspect('gamewads: ',gamewads);

</script>

<svelte:window onblur="{()=>clearAllTimers()}" onmouseout="{()=>clearAllTimers()}" onmouseleave="{()=>clearAllTimers()}" onmouseup="{()=>clearAllTimers()}" />

<main>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="center"  bind:clientHeight="{hview}" bind:clientWidth="{vview}" style="display: grid;  height:100vh;">

    <div class="scale" onmousemove="{e=>{calcPixelCurser(e)}}" style="display: flex; justify-self: center; align-self: center; transform:translate({left}px,{top}px) scale({scale});">

		<div class="cell" style="z-index: 400;" style:left="{cursorleft}px"  style:top="{cursortop}px"> </div>

		<div class="window" style="grid-template-columns: repeat({cols}, 8px); grid-template-rows: repeat({rows}, 16px);">
			
			<div class="border-outer"></div>
			<div class="border-inner"></div>

			<button class="h" style="grid-column: {cols/2-24/2} / span 25; grid-row: {1}" onmousedown="{()=> { soundRestart(0);}}" onclick="{async ()=>{doomPortpath = await neuMods.showFileDialog(); setSelectedDoomPortFlags(); calcAddedFlags(); neuMods.save('doomPortpath', doomPortpath)}}">{doomPortpath.name.toLocaleUpperCase()}</button>
			<div class="h1" style="grid-column: 2 / 50; grid-row: {2}">DeathManager! v1.666 (C) 2025 Schnalz Soft ♥</div>

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {3}"></div>
			<div class="h2" style="grid-column: 3 / 12; grid-row: {3}">Game WAD</div>
			<button class="h4" style="grid-column: 13 / span 1; grid-row: {3}" onmousedown="{()=>  {soundRestart(0);}}" onclick="{async ()=>{hideAllPopups(); showwadfolders=1;}}">+</button>

			<!-- START GAME WAD Auswahl -->
			<button class="cellupdown" style="grid-column: 19; grid-row: {4}" onmousedown="{()=>{clickInterval(scrollupGameWAD)}}" onmouseleave="{()=>clearAllTimers()}">↑</button>
				<div class="cellgray" style="grid-column:  19; grid-row: {4+1} / {4+5}"> 
            <span onmousedown="{()=>{clickInterval(scrollupGameWAD)}}">░</span>
            <span onmousedown="{()=>{scrollcursorGameWAD > 1 ? clickInterval(scrollupGameWAD) : clickInterval(scrolldownGameWAD) }}">░</span>
            <span onmousedown="{()=>{scrollcursorGameWAD > 2 ? clickInterval(scrollupGameWAD) : clickInterval(scrolldownGameWAD) }}">░</span>
            <span onmousedown="{()=>{clickInterval(scrolldownGameWAD) }}">░</span>
        </div>
        <div class="cellgray" style="grid-column:  19; grid-row: {4+1+ scrollcursorGameWAD}">▓</div>
			<button class="cellupdown" style="grid-column: 19; grid-row: {4+5}" onmousedown="{()=>{clickInterval(scrolldownGameWAD)}}" onmouseleave="{()=>clearAllTimers()}">↓</button>

      {#each Array(6) as rowWAD, i}
        <button class="h4 {gamewads[folderindex+i]?.dupl ? 'hdis' : ''} { selectedGameWAD == folderindex+i ? 'hsel' : ''}" style="grid-column: {3} / span 16; grid-row: {4+i}; {gamewads[folderindex+i]?.missing ? 'color: red;' : '' }" 
        title="{gamewads[folderindex+i]?.path}"  
        draggable="{!gamewads[folderindex+i]?.iwad}" 
          ondragstart="{(e)=>handleDragAddonwad(e, folderindex+i)}" ondragend="{()=>dragaddonwad = 0}"
          ondrop="{(e)=>handleDropAddonwads(e)}" ondragover="{(e)=>{if (!showorderwads) dragaddonwad == 0 ? e.preventDefault() : 0}}" 
          onclick="{()=>{selectGameWAD(folderindex+i);  soundRestart(2);}}" 
          onwheel="{e=>e.deltaY > 0 ? scrolldownGameWAD() : scrollupGameWAD()}"
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

        <button class="cellupdown" style="grid-column: 47; grid-row: {4}" onmousedown="{()=>{clickInterval(scrollupAddons)}}" onmouseleave="{()=>clearAllTimers()}">↑</button>     
          <div class="cellgray" style="grid-column:  47; grid-row: {4+1} / {4+5}">
              <span onmousedown="{()=>{clickInterval(scrollupAddons)}}">░</span>
              <span onmousedown="{()=>{scrollcursorAddonWAD > 1 ? clickInterval(scrollupAddons) : clickInterval(scrolldownAddons) }}">░</span>
              <span onmousedown="{()=>{scrollcursorAddonWAD > 2 ? clickInterval(scrollupAddons) : clickInterval(scrolldownAddons) }}">░</span>
              <span onmousedown="{()=>{clickInterval(scrolldownAddons) }}">░</span>        
          </div> 
          <div class="cellgray" style="grid-column:  47; grid-row: {4+1+ scrollcursorAddonWAD}">▓</div>
                  <div class="cellblack" style="grid-column:  46; grid-row: {4} / {4+1+5}"></div>
        <button class="cellupdown" style="grid-column: 47; grid-row: {4+5}" onmousedown="{()=>{clickInterval(scrolldownAddons)}}" onmouseleave="{()=>clearAllTimers()}">↓</button>    

        {#each Array(6) as rowWAD, i}
          <div style="background-color: black; grid-column: {24} / span 22; grid-row: {4+i};">
          </div>
          <button class="h4 {addonwads[folderindexAddon+i]?.selected ? 'hsel' : ''}"   style="background: none; grid-column: {24} / span 22; grid-row: {4+i}; " 
            draggable="{addonwads[folderindexAddon+i] != undefined}" 
            ondragstart="{(e)=>{ handleDragGamewad(e, folderindexAddon+i) } }" 
            ondragend="{()=>{  draggamewad = 0 } }"
            ondrop="{(e)=>{ handleDropgamewads(e) } }" 
            ondragover="{(e)=>{ draggamewad == 0 ? e.preventDefault() : 0 } }"
            onclick="{()=>{ if (addonwads[folderindexAddon+i] != undefined) selectAddonWAD(folderindexAddon+i);  soundRestart(2);}}" 
            onwheel="{e=>e.deltaY > 0 ? scrolldownAddons() : scrollupAddons()}"
            >
              {getButtonTextAddon(folderindexAddon+i)}
          </button>
        {/each}
      {/if}
      <!-- ENDE ADDON WAD Auswahl -->

      <!-- START ORDER SELECTED ADDON WAD LIST -->
      {#if showorderwads}        
        <PopupOrderwads bind:selectedaddonwads bind:folderindexOrderwads bind:scrollcursorOrderwads {clickInterval} {clearAllTimers} {updateSelectedaddonwads} {resetMap} />
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
        <input style="outline: 0px ; text-align:left; grid-column: {3+7+6+3} / span 3; grid-row: {12}" maxlength="2" min="1"  max="64" type="number" bind:value={players} />

			<!-- GAMETYPEs with Radiobuttons -->
			<div class="h2" style="grid-column: 24 / 34; grid-row: {10}">Game Type</div>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: 24 / span 15; grid-row: {11}" onclick="{()=>{deathmatch=0; neuMods.save('deathmatch', deathmatch); resetFlagDefaults(); calcAddedFlags(); soundRestart(2);}}">(<span class="y">{deathmatch==0 ? '•' : ' '}</span>) Cooperative</button>
          <button class="h {joingame ? "hdis" : 0}" style="grid-column: {24+15} / span 10; grid-row: {11}" onclick="{()=>{hideAllPopups(); showdeathmatchflags = 1; soundRestart(0);}}">(<span class="y">{addedflags['dmflags'] || addedflags['dmflags2'] || addedflags['dmflags3'] || addedflags['zadmflags'] || addedflags['commandline'] ? '•' : ' ' }</span>) Flags</button>
        <button class="h {joingame ? "hdis" : 0}" style="grid-column: 24 / span 14; grid-row: {12}" onclick="{()=>{deathmatch=1; neuMods.save('deathmatch', deathmatch); changeDMFlagDefaults(); calcAddedFlags(); soundRestart(2);}}">(<span class="y">{deathmatch==1 ? '•' : ' '}</span>) DeathMatch</button>

        {#if showdeathmatchflags}
          <PopupFlags bind:showdeathmatchflags bind:dmflags bind:selectedDoomPortFlags {dmflagsbyport} bind:addedflags {calcAddedFlags}/>
        {/if}
				
			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {13}"></div>

			<!-- IPADDRESS PUBLIC and JOIN IP with Radiobutton -->
			<div class="h2" style="grid-column: 3 / span 13; grid-row: {13}">Connect Type</div>
				<button class="h " style="text-align:left; grid-column: {3} / span 10; grid-row: {14}" onclick="{() =>{if (joingame) { joingame = 0; /*clearServerListPWADS();*/ } navigator.clipboard.writeText(pupblicIP); soundRestart(2);} }" >(<span class="y">{joingame == false ? '•' : ' '}</span>) Server</button>
							
				<button class="h" style="text-align:left; grid-column: {3} / span 10; grid-row: {15}"  onclick="{()=> {joingame = 1; soundRestart(2);}}">(<span class="y">{joingame ? '•' : ' '}</span>) Join</button>
				<input style="outline: 0px ; text-align:left; grid-column: {18} / span 15; grid-row: {15}"  maxlength="15" bind:value={joinIP} />
        <button class="h2" style="{joingame? '' : 'color: grey;'} text-align:left; grid-column: {38} / span 11; grid-row: {16}"  onclick="{()=> {hideAllPopups(); showserverlist = 1; soundRestart(2);}}"> Server List</button>

				<div class="h" style="text-align:left; grid-column: {3} / span 5; grid-row: {16}" >Port:</div>
				<input style="outline: 0px ; text-align:left; grid-column: {18} / span 7; grid-row: {16}" type="number" maxlength="5" bind:value={doomNetPort} />

				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {18} / span 29; grid-row: {14}" onclick="{() =>{ navigator.clipboard.writeText(pupblicIP); soundRestart(1);} }" > Public IP: {pupblicIP}</button>
        
        {#if showserverlist}
        <PopupServerList bind:showserverlist {serverlist} bind:serverlistPort {refreshServerList} {resetServertList} {setjoinIP} {serverindex} {scrollcursorServers} {mouseclickTimer} {clickInterval}/>
        {/if}

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {17}"></div>
			<!-- MAP with Radiobutton -->
			<div class="h2" style="grid-column: 3 / span 13; grid-row: {17}">Map Warping</div>
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3} / span 16; grid-row: {18}"  onclick="{()=> {getlastselectedAddonWAD(); hideAllPopups();  showlevelselect=1; soundRestart(0);}}"> Select map...</button>

				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3} / span 5; grid-row: {19}" > Map:</button>
				<input style="outline: 0px ; text-align:left; grid-column: {3+5} / span 8; grid-row: {19}"  maxlength="8" bind:value={map} onchange="{()=>neuMods.save('map', map)}" />

			<!-- SKILL OPTION -->
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3+27} / span 10; grid-row: {18}"  onclick="{()=> {skillactive = !skillactive; soundRestart(2);}}">(<span class="y">{skillactive ? '•' : ' '}</span>) Skill</button>
				<input style="outline: 0px ; text-align:left; grid-column: {3+27+10} / span 3; grid-row: {18}" maxlength="1" min="1" max="5" type="number" bind:value={skill} />
				<div class="h5 {joingame ? "hdis" : 0}" style="grid-column: {3+27+10+4} / span 5; grid-row: {18}">[1-5]</div>

			<button class="go" style="grid-column: 43 / span 5; grid-row: {rows}" onclick="{()=>{ soundRestart(1); neuMods.startGame(selectedDoomPortFlags, doomPortpath.fullpath, gamewads[selectedGameWAD]?.path , selectedaddonwads, joingame, joinIP, doomNetPort, players, deathmatch, skillactive, skill, map, addedflags); /*clearServerListPWADS()*/ } }">Go!</button>  

			<!-- POPUP LEVEL SELECT -->
			{#if showlevelselect}
				<PopupMaps bind:showlevelselect {gamewads} {selectedGameWAD} {lastselectedAddonWAD} {scrollcursorLevels} {clickInterval} {clearAllTimers} bind:map {mapindex}/>
			{/if}

      <!-- PRESET BUTTON and PRESET SELECTION POPUP -->
      <button class="presetbtn" style=" grid-column: 21 / span 10; grid-row: {20}" onmousedown="{()=>  {soundRestart(0);}}" onclick="{async ()=>{hideAllPopups(); showpresets = 1;}}">┤<span class="presetbtntext">☺ Preset</span>├</button>
      {#if showpresets}
        <PopupPresets bind:showpresets {presets} {savePreset} {loadPreset} {changePresetName} {addPreset} {deletePreset}/>
      {/if}
    </div>
    </div>

</div>
</main>

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

:global(.popup)  {
	background-color: var(--bg-window);
	z-index: 10;
	box-shadow: 16px 16px 0px 0px rgba(0,0,0,0.8);
}

.center {
	position: relative;
}

.window {
	cursor: none;
	position: relative;
	display: grid;
	background-color: var(--bg-window);
}

.cell {
	width: 8px;
	height: 16px;
	user-select: none;
	mix-blend-mode:difference;
	color: black;
	font-family: monospace;
	font-weight: bolder;

	background-color: rgb(255, 0, 0);
	position: absolute;
	pointer-events: none;
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
  color: var(--text);
  background-color: var(--bg-window); 
}

.presetbtntext:hover {
  color: var(--border);
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

</style>
