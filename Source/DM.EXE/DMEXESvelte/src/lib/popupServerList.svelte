<script>
import { onMount } from 'svelte';
import { soundRestart, getZandronumServerList } from "./shared.svelte.js";
import ScrollBar from "./scrollbar.svelte";

let {
    showserverlist = $bindable(), 
    serverlistPort = $bindable(),
    serverlist,
    refreshServerList,
    resetServertList,
    setjoinIP,

    serverindex,
    scrollcursorServers,
    } = $props();


    let searchname = $state('');
    let searchservers = $state([])

    let debouncetimer;

function debounce(callback, delay) {
    clearTimeout(debouncetimer);
    debouncetimer = setTimeout(() => callback(), delay);
}

function searchServer() {
    searchservers = serverlist?.filter(
        e => {
            let search = searchname.toLowerCase();
            let t = e.info?.name?.toLowerCase().includes(search) 
                    || e.info?.iwad?.toLowerCase().includes(search)
                    || e.info?.gamemode?.toLowerCase().includes(search)
            if (e.info?.pwads?.length > 0)
                t = t || e.info?.pwads?.some(e=> e.name?.toLowerCase().includes(search))
            return t;
        }
    )
}


  function scroll(dir, visiblelines) {
    //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
    let maxindex = Math.max(0, searchservers.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up')
    {
      if (serverindex > 0) serverindex--; 
    } else if (dir == 'down')
    {
      if (serverindex < maxindex) serverindex++; 
    }
    if (maxindex > 0)
      scrollcursorServers =  Math.round( (serverindex / maxindex) * scrollbarsteps )
    soundRestart(0);
  }  

  function pageScroll(dir, visiblelines) {
    let maxindex = Math.max(0, searchservers.length - visiblelines);
    let scrollbarsteps = visiblelines-3;

    if (dir == 'up') {
        serverindex = Math.max(0, serverindex - visiblelines);
    } else if (dir == 'down') {
        serverindex = Math.min(maxindex, serverindex + visiblelines);
    }
    if (maxindex > 0)
      scrollcursorServers =  Math.round( (serverindex / maxindex) * scrollbarsteps )

    soundRestart(0);
}


function listAllpwads (pwads)
{
    if (pwads) {
        let t = '';
        for (const element of pwads) {
            t += '\n' + element.name;
        }        
        return t.toString();
    }
}

let refreshserverstimer = $state(0);
let searching = $state(0);

async function refreshTillFinished() {
    if (searching) return;
    //reset scrollbar and index of list
    scrollcursorServers = 0;
    serverindex = 0;
    
    searching = 1;

    refreshserverstimer = setInterval( async () => {
        //after 2 secs interval searching can be changed to 0 from buttons
        if (searching) {
            // console.log('in interval');
            await refreshServerList();
            searchServer();
            let l = serverlist.length;
            
            if (l > 0 && serverlist[l-1].finished) {       //finished wird gesetzt wenn der fetchserver finished gesetzt hat.
                clearInterval(refreshserverstimer);
                searching = 0;           
                // serverlist[l-1].finished = 0;       //reset finished otherwise it would directly clear interval again
            }
        } else {
            clearInterval(refreshserverstimer);
        }

    }, 2000);

    await refreshServerList();
}

function resetViewList() {
    searchservers=[];
    scrollcursorServers = 0;
    serverindex = 0;
    searching = 0;
}

//when window opens, then get fresh serverlist, but only if no servers are fetched already
if (serverlist.length == 0)
{
    refreshTillFinished();
}    


onMount(() => {
    searchServer();
  return () => {clearInterval(refreshserverstimer); clearTimeout(debouncetimer);}
});


</script>


<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outerhoriz-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outervertic-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

<div class="h1" style="z-index: 50; text-transform: capitalize; grid-column: 7 / 45; grid-row: {3}">{serverlistPort} Server Select ({searchservers.length})</div>

<div class="border-horizontal-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {5} / span 1"></div>

<button class="h" style=" text-align:left; z-index: 50; grid-column: 7 / span 18; grid-row: {4}"  onclick="{()=> {if (serverlistPort != 'zandronum') { serverlistPort = 'zandronum'; resetViewList(); resetServertList(); refreshTillFinished(); soundRestart(2);}} }" >(<span class="select">{serverlistPort == 'zandronum' ? '•' : ' '}</span>) Zandronum </button>
<button class="h" style=" text-align:left; z-index: 50; grid-column: {7+14} / span 18; grid-row: {4}"  onclick="{()=> {if (serverlistPort != 'chocolate') { serverlistPort = 'chocolate'; resetViewList(); resetServertList(); refreshTillFinished();  soundRestart(2);}} }" >(<span class="select">{serverlistPort == 'chocolate' ? '•' : ' '}</span>) Chocolate</button>
<button class="h" style=" text-align:left; z-index: 50; grid-column: {7+14+ 14} / span 10; grid-row: {4}"  onclick="{()=> {if (serverlistPort != 'odamex') { serverlistPort = 'odamex'; resetViewList(); resetServertList(); refreshTillFinished();  soundRestart(2);}} }" >(<span class="select">{serverlistPort == 'odamex' ? '•' : ' '}</span>) Odamex</button>

{#if serverlist[0]?.error}
     <div class="h password" style="font-size:small; text-align:left; z-index: 50; grid-column: 7 / 44; grid-row: {6}" > 
        {serverlist[0].error}
     </div>
{/if}
{#if serverlist.length == 0}
     <div class="h" style="font-size:small; text-align:left; z-index: 50; grid-column: 7 / 44; grid-row: {6}" > 
        refreshing...
     </div>
{/if}
{#each Array(8) as server, i}
    {#if searchservers[serverindex+i]}
    <button class="h {searchservers[serverindex+i].info.forceJoinPassword || searchservers[serverindex+i].info.forcePassword ? 'password' : ''}" style="font-size:x-small; text-align:left; z-index: 50; grid-column: 7 / 44; grid-row: {6+i}"  onclick="{()=> {setjoinIP(searchservers[serverindex+i].ip, searchservers[serverindex+i].port, searchservers[serverindex+i].info.iwad, searchservers[serverindex+i].info.pwads); soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scroll('down', 8) : scroll('up', 8)}"> 
        <span title="{searchservers[serverindex+i].info.name}" style=" width:9.0em;"> {searchservers[serverindex+i].info.name?.substring(0,19)} </span>
        <span class="l">│</span><span style=" width:2em;"> {searchservers[serverindex+i].info.numPlayers}/{searchservers[serverindex+i].info.maxPlayers} </span> 
        <span class="l">│</span><span style=" width:3.0em;" title="{searchservers[serverindex+i].info.iwad}">{searchservers[serverindex+i].info.iwad?.substring(0,7)}</span> 
        <span class="l">│</span><span style=" width:2.5em;">{searchservers[serverindex+i].info.gamemode?.toLowerCase().substring(0,6)}</span> 
        <span class="l">│</span><span title="{listAllpwads(searchservers[serverindex+i].info.pwads)}" style=" width:2em;">{searchservers[serverindex+i].info.pwads?.length ? searchservers[serverindex+i]?.info.pwads[0]?.name.substring(0,13) : ''}</span>
    </button> 
    {/if}
{/each}


<ScrollBar rowstart={6} rows={8} column={43} zidx={51} scrollUp={()=>scroll('up', 8)} scrollDown={()=>scroll('down', 8)} pageScrollUp={()=>pageScroll('up', 8)} pageScrollDown={()=>pageScroll('down', 8)} scrollcursorpos={scrollcursorServers} />

<div class="border-horizontal-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>

<div class="h" style="z-index: 50; text-align:left; grid-column: {6+1} / span 6; grid-row: {15}" >Search:</div>
<input style="z-index: 50; outline: 0px ; text-align:left; grid-column: {6+7+1} / span 14; grid-row: {15}"  maxlength="14" spellcheck="false" bind:value={searchname} oninput="{()=>{scrollcursorServers=0; serverindex=0; debounce(searchServer, 100)}}"/>

<button class="h" style="z-index: 50; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {searching = 0; showserverlist = 0; soundRestart(1);}}">Accept</button>
<button class="h {searching ? 'dis' : ''}" style="z-index: 50; text-align:left; grid-column: {6+24} / span 7; grid-row: {15}"  onclick="{()=> {if (searching == 0) {soundRestart(1); resetServertList(); refreshTillFinished(); } }}">Refresh</button>

<style>
span {
    display:inline-block;
    /* text-overflow:clip; */
    white-space: nowrap;
}

.select {
    display: inline;
}

.l {
    font-size: medium;
}

.dis {
    color: grey;
}

.password {
    color: red;
}
</style>