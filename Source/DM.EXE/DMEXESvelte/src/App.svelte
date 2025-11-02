<script>
// @ts-nocheck
import * as neuMods from "./lib/neuMods.js"

import { getIP, soundRestart, getZandronumServerList } from "./lib/shared.svelte.js";

import Popup from "./lib/popupFlags.svelte";
import PopupWadFolders from "./lib/popupWadFolders.svelte";
import PopupServerList from "./lib/popupServerList.svelte";
import PopupPresets from "./lib/popupPresets.svelte";

  $effect(async () => {
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

    //then calc the correct flags for addedflags variable for commandline.
    calcAddedFlags();

    presets = await neuMods.load('presets');
    if (!presets) presets = [];

    let refreshservers = setInterval( async () => {
      serverlist = await getZandronumServerList();
    }, 30000);
    serverlist = await getZandronumServerList();
    
  })

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

  let c = (e) => {
    let rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left; //x position within the element.
    let y = e.clientY - rect.top;  //y position within the element.
    let cellw=8, cellh=16; 
    cursorleft = Math.max( Math.floor(x/(scale*cellw))*cellw, 0 );
    cursortop= Math.max( Math.floor(y/(scale*cellh))*cellh, 0 ); 
  }


  function scrollup() {
	if (folderindex > 0) {
    folderindex--; 
    //scrollcursor has 4 chars height scrollspace. so devide all gamewads by 4 to fit all games in 4 scrollbarchars
    //folderindex +1 for the lower bounds. that gives up down scrolling smooth distance of cursor bounce
    scrollcursorGameWAD =  Math.floor( (folderindex+1) /(gamewads.length/4) )
  }
  // console.log(gamewads.length, folderindex/(gamewads.length/4));
  soundRestart(0);
  }

  function scrolldown() {
    if (folderindex+5 < gamewads.length-1){ 
      folderindex++; 
      //set +5 to check lower bounds for scrollcursor. otherwise the cursor bounces at end folderindexes
      //folderindex +4 for the upper bounds. that gives up down scrolling smooth distance of cursor bounce
      scrollcursorGameWAD = Math.floor( (folderindex+5) /(gamewads.length/4))
    }
    // console.log(gamewads.length, folderindex/(gamewads.length/4));
    soundRestart(0);
  }

  function scrollupAddons() {
    if (folderindexAddon > 0) {
      folderindexAddon--; 
      scrollcursorAddonWAD = Math.floor( (folderindexAddon+1) /(addonwads.length/4))
    }
    // console.log(addonwads.length, folderindexAddon/(addonwads.length/4));
    soundRestart(0);
  }

  function scrolldownAddons() {
    if (folderindexAddon+5 < addonwads.length-1) {
        folderindexAddon++; 
        scrollcursorAddonWAD = Math.floor( (folderindexAddon+5) /(addonwads.length/4) )
    }
    // console.log(addonwads.length, folderindexAddon/(addonwads.length/4));  
    soundRestart(0);
}

  function scrollupMaps() {
    if (mapindex > 0){ 
      mapindex--;
      //devide by 7 cause 7 scrollbar charheights for cursor position
      scrollcursorLevels = Math.floor( (mapindex+2) /(gamewads[selectedGameWAD]?.maps.length/7))
    }
    soundRestart(0);
  }

  function scrolldownMaps() {
    // lastselectedAddonWAD is Object of WAD with maps[] array. if its not 0 then an AddonWAD is selected...
    if (lastselectedAddonWAD && mapindex+8 < lastselectedAddonWAD.maps.length-1){ 
      mapindex++;
      scrollcursorLevels = Math.floor( (mapindex+6) / (lastselectedAddonWAD.maps.length/7))
    }
    // else lastselectedAddonWAD is undefined, so no AddonWAD was filtered as selected but a GamesWAD is valid. 
    if (lastselectedAddonWAD == undefined && mapindex+8 < gamewads[selectedGameWAD]?.maps.length-1) {
      mapindex++;
      scrollcursorLevels = Math.floor( (mapindex+6) / (gamewads[selectedGameWAD].maps.length/7))
    }
    soundRestart(0);
    
  }

  let mouseclickTimer = $state({});

  function clickInterval(scrollfunk) {
  // clearInterval(mouseclickTimer);
    scrollfunk();

    mouseclickTimer = setInterval(()=>{
       scrollfunk();
    }, 200)
  }

  let folderindex = $state(0);
  let selectedGameWAD = $state(0);

  let folderindexAddon = $state(0);
//   let selectedAddonWAD = $state(-1);

function spliceWadFolders(i) {
  wadfolders.splice(i,1);
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

async function readWadFolders() {
  wadfolders = wadfolders.filter(e=>e != ""); // delete all empty lines caused by folderdialog no folder selected 
  wadcollection = await neuMods.readFolderPaths(wadfolders)
  neuMods.save('wadfolders', wadfolders);
}

let wadfolders = $state([]);

let wadcollection = $state(
  [

  ]
)

let gamewads = $derived(wadcollection.filter(e=> e.iwad))
// let addonwads =  $derived(wadcollection.filter(e=> !e.iwad))
let addonwads =  $derived.by(()=>
{
  //choose the addon wads woth same MapName Format like the GameWad has. 
  //if the file is a DEH or PK3 then also inlude it always!
  let mapname = gamewads[selectedGameWAD]?.maps[0];
  let alladdonwads = wadcollection.filter(e=> !e.iwad);
  let wads = []
  for (const element of alladdonwads) { 
    //inlude DEH and PK3 always:
    if (element.maps.length==0) wads.push(element);
    else
    {
      //Include only MAPXX format addonwads when gamwad is also MAPXX format.
      if (mapname?.includes('MAP') && element.maps[0].includes('MAP'))    //mapname?... important because mapname can be undefined if no gamewads exist yet.
        wads.push(element);
      //otherwise include ExMy Map Format ADdons like Doom1
      else if (mapname?.includes('E') && element.maps[0].includes('E'))   //mapname?... important because mapname can be undefined if no gamewads exist yet.
        wads.push(element);
    }
  }
  return wads;
})
// $inspect(addonwads);


function selectGameWAD(folderindex) {
  //Do nothing if selectedGameswad is clicked again the same
  if (selectedGameWAD !=folderindex)
    {
      //reset folderindexaddons and scrollcursor that scrolling is not buggy with scrollbar
      folderindexAddon = 0;
      scrollcursorAddonWAD = 0;
      scrollcursorLevels = 0;
      mapindex = 0;
      addonwads.map(e=>e.selected=0)  //reset all selected addonWads when changing GameWad
      map = '';   //reset map warp text if another Gamewad is selected.
      gamewads[folderindex] ? selectedGameWAD=folderindex : 0
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
	let selectedAddons = addonwads.filter(e => e.selected && e.entry.toLowerCase().includes('.wad') && e.maps.length > 0)
	// console.log(selectedAddons[selectedAddons.length-1]);
    // selectedAddons[] is empty when no addonWAD is selected at all, so lastselectedAddonWAD is UNDEFINED!
	lastselectedAddonWAD = 	selectedAddons[selectedAddons.length-1]
    // console.log(lastselectedAddonWAD);
  }

  let players = $state(1)
  let deathmatch = $state(0)

  let pupblicIP = $state('0.0.0.0')
  let joinIP = $state('192.168.0.1')
  let joingame = $state(0);
  let doomNetPort = $state('10666');

  let map = $state('');
  //Map name formatted  MAPXX to XX for -warp XX command
  //or ExMy formatted to x y for -warp x y 
  let mapformatted = $derived.by( ()=>
  {
    if (map.includes('MAP')) return map.slice(3,5)
    if (map.includes('E')) {
        let m = map.replaceAll('E', ' '); 
        m = m.replaceAll('M', ' ');      
        return m;
    }
  })

  let mapindex = $state(0);

  let skill = $state(3);
  let skillactive = $state(0);

  let showlevelselect = $state(0);
  let lastselectedAddonWAD = $state(0);

  let showwadfolders = $state(0);

  let doomPortpath = $state({name: 'Choose Doom Port ...'})
  let scrollcursorGameWAD = $state(0);
  let scrollcursorAddonWAD = $state(0);
  let scrollcursorLevels = $state(0);

  let dmflags = $state([]);
  dmflags = [
        //dmflags
        {cvar: 'dmflags', value: 16384, name: 'Items respawn', default: false, selected: false  },
        {cvar: 'dmflags', value: 65536, name: 'Allow jump', default: true, selected: true  },
        {cvar: 'dmflags', value: 4, name: 'Weapons Stay', default: false, selected: false  },
        {cvar: 'dmflags', value: 33554432, name: '(coop) Keep keys ', default: true, selected: true  },
        {cvar: 'dmflags', value: 2097152, name: '(coop) No Deathmatch weapons ', default: true, selected: true },
        //dmflags2
        {port:'GZDoom', cvar: 'dmflags2', value: 134217728, name: 'Big powerups respawn', default: false, selected: false  },
        {port:'Zandronum', cvar: 'dmflags', value: 524288, name: 'Big powerups respawn', default: false, selected: false  },
        //dmflags3 - zandronum has zadmflags
        {port:'GZDoom', cvar: 'dmflags3', value: 2, name: '(coop) Share keys ', default: false, selected: false  },
        {port:'Zandronum', cvar: 'zadmflags', value: 64, name: '(coop) Share keys ', default: false, selected: false  },
    ]

  let selectedDoomPortFlags = $state('GZDoom');

  //change for dmflags doomport tabs in flags menu. try to preselect depends on filename of port.
  function setSelectedDoomPortFlags() {
    if (doomPortpath.name.toLowerCase().includes('gzdoom')) selectedDoomPortFlags = 'GZDoom';
    if (doomPortpath.name.toLowerCase().includes('zandron')) selectedDoomPortFlags = 'Zandronum';
  }

  //derived ist für dmflags tabs auswahl für gzdoom oder zandronum
  let dmflagsbyport = $derived(dmflags.filter(e=> (e.port == selectedDoomPortFlags || e.port == undefined) ))

  let addedflags = $state({});
  let showdeathmatchflags = $state(0);

    //ultra wichtig ist filter mit e.default != e.selected, denn allow jump ist standard an. aber die flag wird nicht addiert.
    //NUR wenn allow jump != standard ist... also OFF... dann wird flag addiert!
    function calcAddedFlags() {
        //CVAR ist die consolen variable dmflags oder dmflags2... wird mit +dmflags[x] xxxx benutzt
        addedflags['dmflags'] =  dmflagsbyport.filter(e=>e.cvar == 'dmflags' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
        addedflags['dmflags2'] =  dmflagsbyport.filter(e=>e.cvar == 'dmflags2' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
        addedflags['dmflags3'] =  dmflagsbyport.filter(e=>e.cvar == 'dmflags3' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
        addedflags['zadmflags'] =  dmflagsbyport.filter(e=>e.cvar == 'zadmflags' && e.default != e.selected).reduce( (accum, current) => accum + current.value,0 )
    }

  // $inspect(addedflags).with(console.trace);

  let showserverlist = $state(0);
  let serverlist = $state([]);

  function setjoinIP(newip, newport) {
    joinIP = newip;
    doomNetPort = newport;
  }

  let showpresets = $state(0);
  let presets = $state([
    // {name: 'last state'}
  ]);


  function deletePreset(i) {
    presets.splice(i, 1);
    neuMods.save('presets', presets);
  }

  async function changePresetName(i, newname) {
      presets[i].name = newname;
      neuMods.save('presets', presets);
  }

  function addPreset(i, name) {
      presets[i] = {name, doomPortpath, wadfolders, selectedGameWAD, addonwads, players, deathmatch, dmflags, map, skill, joinIP, joingame, doomNetPort}
      presets[i].wadfolder = JSON.parse(JSON.stringify(wadfolders));
      presets[i].dmflags= JSON.parse(JSON.stringify(dmflags));
      neuMods.save('presets', presets);
  }

  function savePreset(i) {
      presets[i] = {name: presets[i].name, doomPortpath, wadfolders, selectedGameWAD, addonwads, players, deathmatch, dmflags, map, skill, joinIP, joingame, doomNetPort}
      presets[i].wadfolder = JSON.parse(JSON.stringify(wadfolders));
      presets[i].dmflags= JSON.parse(JSON.stringify(dmflags));
      neuMods.save('presets', presets);
  }


    $inspect('addedflags: ', addedflags);

    $inspect('presets: ', presets);
    $inspect('wadcollection:', wadcollection);

    async function loadPreset(i) {
      console.log('loading', presets);
      
      if (presets && presets.length > 0)
      {

          doomPortpath= presets[i].doomPortpath;
          wadfolders= JSON.parse(JSON.stringify(presets[i].wadfolders));
          //calculate the wadcollection new
          await readWadFolders();
          selectedGameWAD= presets[i].selectedGameWAD;
          players= presets[i].players;
          deathmatch= presets[i].deathmatch;
          dmflags= JSON.parse(JSON.stringify(presets[i].dmflags));
          map= presets[i].map;
          skill= presets[i].skill;
          joinIP= presets[i].joinIP;
          joingame= presets[i].joingame;
          doomNetPort= presets[i].doomNetPort;      
        
          if (presets[i].addonwads)
            {
              for (let a = 0; a < presets[i].addonwads.length; a++) {
                addonwads[a].selected = presets[i].addonwads[a].selected;
              }
            }

          //calculate the var selectedDoomportflags new
          setSelectedDoomPortFlags();
          //so the button flags is marked correctly after loading dmflags, addedflags has to be filled
          calcAddedFlags();
          
          //reset all scroll lists
          folderindex=0;
          folderindexAddon=0;
          scrollcursorAddonWAD = 0;
          scrollcursorGameWAD=0;
          scrollcursorLevels = 0;
          mapindex=0;
      }
  }

  function hideAllPopups() {
    showdeathmatchflags = 0;
    showlevelselect = 0;
    showpresets = 0;
    showserverlist = 0;
    showwadfolders = 0;
  }

</script>

<main>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="center" onmouseup="{()=>clearInterval(mouseclickTimer)}" bind:clientHeight="{hview}" bind:clientWidth="{vview}" style="display: grid;  height:100vh;">

    <div class="scale" onmousemove="{e=>{c(e)}}" style="display: flex; justify-self: center; align-self: center; transform:translate({left}px,{top}px) scale({scale});">

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
			<button class="cellupdown" style="grid-column: 19; grid-row: {4}" onmousedown="{()=>{clickInterval(scrollup)}}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↑</button>
				<div class="cellgray" style="grid-column:  19; grid-row: {4+1} / {4+5}">░░░░</div>
        <div class="cellgray" style="grid-column:  19; grid-row: {4+1+ scrollcursorGameWAD}">▓</div>
			<button class="cellupdown" style="grid-column: 19; grid-row: {4+5}" onmousedown="{()=>{clickInterval(scrolldown)}}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↓</button>

      {#each Array(6) as rowWAD, i}
        <button class="h4 { selectedGameWAD == folderindex+i ? 'hsel' : ''}" style="grid-column: {3} / span 16; grid-row: {4+i}" onclick="{()=>{selectGameWAD(folderindex+i);  soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldown() : scrollup()}"> {getButtonText(folderindex+i)}</button>
      {/each}
			<!-- ENDE GAME WAD Auswahl -->

			<div class="border-mid" style="grid-column: {3+19}; grid-row: 3 / {13};"></div>

			<div class="h2" style="grid-column: 24 / 34; grid-row: {3}">Addon WAD</div>
			
			<button class="cellupdown" style="grid-column: 47; grid-row: {4}" onmousedown="{()=>{clickInterval(scrollupAddons)}}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↑</button>     
				<div class="cellgray" style="grid-column:  47; grid-row: {4+1} / {4+5}">░░░░</div> 
        <div class="cellgray" style="grid-column:  47; grid-row: {4+1+ scrollcursorAddonWAD}">▓</div>
                <div class="cellblack" style="grid-column:  46; grid-row: {4} / {4+1+5}"></div>
			<button class="cellupdown" style="grid-column: 47; grid-row: {4+5}" onmousedown="{()=>{clickInterval(scrolldownAddons)}}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↓</button>    

      {#each Array(6) as rowWAD, i}
        <button class="h4 {addonwads[folderindexAddon+i]?.selected ? 'hsel' : ''}"   style="grid-column: {24} / span 22; grid-row: {4+i}" onclick="{()=>{selectAddonWAD(folderindexAddon+i);  soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldownAddons() : scrollupAddons()}">{getButtonTextAddon(folderindexAddon+i)}</button>
      {/each}

      {#if showwadfolders}
      <PopupWadFolders bind:showwadfolders {wadfolders} {onWadFoldersAdd} {readWadFolders} {spliceWadFolders}/>
      {/if}

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {10}"></div>

			<!-- NUMBER OF PLAYERS with Radiobuttons -->
			<div class="h2" style="grid-column: 3 / 16; grid-row: {10}"># of Players</div>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: 3 / span 6; grid-row: {11}" onclick="{()=>{players=1; soundRestart(2);}}"> (<span class="y">{players==1 ? '•' : ' '}</span>) SP </button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+8} / span 5; grid-row: {11}" onclick="{()=>{players=2; soundRestart(2);}}">(<span class="y">{players==2 ? '•' : ' '}</span>) 2</button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3} / span 5; grid-row: {12}" onclick="{()=>{players=3; soundRestart(2);}}">(<span class="y">{players==3 ? '•' : ' '}</span>) 3</button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+8} / span 5; grid-row: {12}" onclick="{()=>{players=4; soundRestart(2);}}">(<span class="y">{players==4 ? '•' : ' '}</span>) 4</button>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+8+6} / span 5; grid-row: {11}" onclick="{()=>{players=5; soundRestart(2);}}">(<span class="y">{players==5 ? '•' : ' '}</span>)5</button>
        <button class="h {joingame ? "hdis" : 0}" style="grid-column: {3+8+6} / span 5; grid-row: {12}" onclick="{()=>{players=6; soundRestart(2);}}">(<span class="y">{players==6 ? '•' : ' '}</span>)6</button>

			<!-- GAMETYPEs with Radiobuttons -->
			<div class="h2" style="grid-column: 24 / 34; grid-row: {10}">Game Type</div>
				<button class="h {joingame ? "hdis" : 0}" style="grid-column: 24 / span 15; grid-row: {11}" onclick="{()=>{deathmatch=0; calcAddedFlags(); soundRestart(2);}}">(<span class="y">{deathmatch==0 ? '•' : ' '}</span>) Cooperative</button>
          <button class="h {joingame ? "hdis" : 0}" style="grid-column: {24+15} / span 10; grid-row: {11}" onclick="{()=>{hideAllPopups(); showdeathmatchflags = 1; soundRestart(0);}}">(<span class="y">{addedflags['dmflags'] || addedflags['dmflags2'] || addedflags['dmflags3'] || addedflags['zadmflags'] ? '•' : ' '}</span>) Flags</button>
        <button class="h {joingame ? "hdis" : 0}" style="grid-column: 24 / span 14; grid-row: {12}" onclick="{()=>{deathmatch=1; calcAddedFlags(); soundRestart(2);}}">(<span class="y">{deathmatch==1 ? '•' : ' '}</span>) DeathMatch</button>

        {#if showdeathmatchflags}
          <Popup bind:showdeathmatchflags bind:dmflags bind:selectedDoomPortFlags {dmflagsbyport} bind:addedflags {calcAddedFlags}/>
        {/if}
				
			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {13}"></div>

			<!-- IPADDRESS PUBLIC and JOIN IP with Radiobutton -->
			<div class="h2" style="grid-column: 3 / span 13; grid-row: {13}">Connect Type</div>
				<button class="h " style="text-align:left; grid-column: {3} / span 10; grid-row: {14}" onclick="{() =>{ joingame = 0; navigator.clipboard.writeText(pupblicIP); soundRestart(2);} }" >(<span class="y">{joingame == false ? '•' : ' '}</span>) Server</button>
							
				<button class="h" style="text-align:left; grid-column: {3} / span 10; grid-row: {15}"  onclick="{()=> {joingame = 1; soundRestart(2);}}">(<span class="y">{joingame ? '•' : ' '}</span>) Join</button>
				<input style="outline: 0px ; text-align:left; grid-column: {18} / span 15; grid-row: {15}"  maxlength="15" bind:value={joinIP} />
        <button class="h2" style="{joingame? '' : 'color: grey;'} text-align:left; grid-column: {38} / span 11; grid-row: {16}"  onclick="{()=> {hideAllPopups(); showserverlist = 1; soundRestart(2);}}"> Server List</button>

				<div class="h" style="text-align:left; grid-column: {3} / span 5; grid-row: {16}" >Port:</div>
				<input style="outline: 0px ; text-align:left; grid-column: {18} / span 7; grid-row: {16}" type="number" maxlength="5" bind:value={doomNetPort} />

				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {18} / span 29; grid-row: {14}" onclick="{() =>{ navigator.clipboard.writeText(pupblicIP); soundRestart(1);} }" > Public IP: {pupblicIP}</button>
        
        {#if showserverlist}
        <PopupServerList bind:showserverlist {serverlist} {setjoinIP}/>
        {/if}

			<div class="border-horizontal" style="grid-column: 2 / 50; grid-row: {17}"></div>
			<!-- MAP with Radiobutton -->
			<div class="h2" style="grid-column: 3 / span 13; grid-row: {17}">Map Warping</div>
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3} / span 16; grid-row: {18}"  onclick="{()=> {getlastselectedAddonWAD(); hideAllPopups();  showlevelselect=1; soundRestart(0);}}"> Select map...</button>

				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3} / span 5; grid-row: {19}"  onclick="{0}"> Map:</button>
				<input style="outline: 0px ; text-align:left; grid-column: {3+5} / span 8; grid-row: {19}"  maxlength="8" bind:value={map} />

			<!-- SKILL OPTION -->
				<button class="h {joingame ? "hdis" : 0}" style="text-align:left; grid-column: {3+27} / span 10; grid-row: {18}"  onclick="{()=> {skillactive = !skillactive; soundRestart(2);}}">(<span class="y">{skillactive ? '•' : ' '}</span>) Skill</button>
				<input style="outline: 0px ; text-align:left; grid-column: {3+27+10} / span 3; grid-row: {18}"  maxlength="1" min="1" max="5" type="number" bind:value={skill} />
				<div class="h5 {joingame ? "hdis" : 0}" style="grid-column: {3+27+10+4} / span 5; grid-row: {18}">[1-5]</div>

			<button class="go" style="grid-column: 43 / span 5; grid-row: {rows}" onclick="{()=>{ soundRestart(1); neuMods.startGame(selectedDoomPortFlags, doomPortpath.fullpath, gamewads[selectedGameWAD]?.path , addonwads, joingame, joinIP, doomNetPort, players, deathmatch, skillactive, skill, mapformatted, addedflags) } }">Go!</button>  

			<!-- POPUP LEVEL SELECT -->
			{#if showlevelselect}
				
			<div class="popup" style="grid-column: 6 / 46; grid-row: {2} / span 15"></div>
			<div class="border-outerhoriz-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
			<div class="border-outervertic-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

			<div class="h1" style="z-index:10; grid-column: 7 / 45; grid-row: {3}">Select Level <span style="color: var(--text);"> { lastselectedAddonWAD?.entry || gamewads[selectedGameWAD]?.entry} </span> </div>

			<div class="border-horizontal-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {4} / span 1"></div>
            <!-- SCROLL BUTTONS FOR MAPS -->
                <button class="cellupdown" style="z-index:11; grid-column: 43; grid-row: {5}" onmousedown="{()=>{clickInterval(scrollupMaps)}}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↑</button>     
                <div class="cellgray" style="z-index:11; grid-column:  43; grid-row: {5+1} / {5+8}">░░░░░░░</div> 
                <div class="cellgray" style="z-index:11; grid-column:  43; grid-row: {5+1+ scrollcursorLevels}">▓</div>
                <button class="cellupdown" style="z-index:11; grid-column: 43; grid-row: {5+8}" onmousedown="{()=>{clickInterval(scrolldownMaps)}}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↓</button> 

				{#if lastselectedAddonWAD}
        {#each Array(9) as rowMap, i}
          <button class="h" style="text-align:left; z-index: 10; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {map =  lastselectedAddonWAD.maps[mapindex+i]; soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldownMaps() : scrollupMaps()}">{lastselectedAddonWAD.maps[mapindex+i]}</button>
        {/each}
				{:else if gamewads[selectedGameWAD]}
        {#each Array(9) as rowMap, i}
          <button class="h" style="text-align:left; z-index: 10; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {map =  gamewads[selectedGameWAD].maps[mapindex+i]; soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldownMaps() : scrollupMaps()}"> {gamewads[selectedGameWAD].maps[mapindex+i]}</button>
        {/each}
				{/if}

			<div class="border-horizontal-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>
			<button class="h" style="z-index:10; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {showlevelselect = 0; soundRestart(1);;}}">Accept</button>
			
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

.h2 {
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
.cellblack {
	user-select: none;
	text-align: center;
	background-color: rgb(0, 0, 0); 
}
.h4 {
	user-select: none;
	text-align: left;
	overflow: hidden;
	background-color: black; 
	color: var(--text);
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

.y {
	color: var(--text-important);
}

.hdis {
	color: gray;
}
.hsel {
	color: var(--text-important);
}
</style>
