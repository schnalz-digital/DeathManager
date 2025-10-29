<script>

import { soundRestart } from "./shared.svelte.js";

let {
    showserverlist = $bindable(), 
    serverlist,
    setjoinIP
    } = $props();

    let searchname = $state('');
    let searchservers = $derived( serverlist.filter(
        e => {
            let search = searchname.toLowerCase();
            let t = e.name?.toLowerCase().includes(search) || e.iwad?.toLowerCase().includes(search)
            if (e.pwads)
                t = t || e.pwads[0]?.toLowerCase().includes(search)
            return t;
        }
        )
    )
    

let mouseclickTimer = $state(0);
let serverindex = $state(0);
let scrollcursorServers = $state(0);

function clickInterval(scrollfunk) {
    scrollfunk();
    mouseclickTimer = setInterval(()=>{
        scrollfunk();
    }, 200)
}

function scrollup() {
    if (serverindex > 0){ 
        serverindex--;
        //devide by 7 cause 7 scrollbar charheights for cursor position
        scrollcursorServers = Math.floor( (serverindex+2) /(searchservers.length/7))
    }
    soundRestart(0);
}

function scrolldown() {
    if (serverindex+8 < searchservers.length-1){ 
        serverindex++;
        scrollcursorServers = Math.floor( (serverindex+7) / (searchservers.length/7))
    }
    soundRestart(0);
}

function listAllpwads (pwads)
{
    if (pwads) {
        let t = '';
        for (const element of pwads) {
            t += '\n' + element;
        }        
        return t.toString();
    }
}

</script>


<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outerhoriz-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outervertic-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

<div class="h1" style="z-index: 50; grid-column: 7 / 45; grid-row: {3}">Zandronum Server Select ({searchservers.length})</div>

<div class="border-horizontal-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {4} / span 1"></div>


{#each Array(9) as server, i}
    {#if searchservers[serverindex+i]}
    <button class="h {searchservers[serverindex+i].forcejoinpassword || searchservers[serverindex+i].forcepassword ? 'password' : ''}" style="font-size:x-small; text-align:left; z-index: 50; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {setjoinIP(searchservers[serverindex+i].addr, searchservers[serverindex+i].port); soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldown() : scrollup()}"> 
        <span title="{searchservers[serverindex+i].name}" style=" width:9.0em;"> {searchservers[serverindex+i].name?.substring(0,19)} </span>
        <span class="l">│</span><span style=" width:2em;"> {searchservers[serverindex+i].numplaying}/{searchservers[serverindex+i].maxplayers} </span> 
        <span class="l">│</span><span style=" width:3.0em;">{searchservers[serverindex+i].iwad?.substring(0,7)}</span> 
        <span class="l">│</span><span style=" width:2.5em;">{searchservers[serverindex+i].gametype?.gamemode?.substring(0,6)}</span> 
        <span class="l">│</span><span title="{listAllpwads(searchservers[serverindex+i].pwads)}" style=" width:2em;">{searchservers[serverindex+i].pwads?.length ? searchservers[serverindex+i]?.pwads[0]?.substring(0,13) : ''}</span>
    </button> 
    {/if}
{/each}

    <!-- SCROLL BUTTONS FOR MAPS -->
    <button class="cellupdown" style="z-index: 51; grid-column: 43; grid-row: {5}" onmousedown="{()=>{clickInterval(scrollup)}}" onmouseup="{()=>clearInterval(mouseclickTimer)}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↑</button>     
    <div class="cellgray" style="z-index: 51; grid-column:  43; grid-row: {5+1} / {5+8}">░░░░░░░</div> 
    <div class="cellgray" style="z-index: 51; grid-column:  43; grid-row: {5+1+ scrollcursorServers}">▓</div>
    <button class="cellupdown" style="z-index: 51; grid-column: 43; grid-row: {5+8}" onmousedown="{()=>{clickInterval(scrolldown)}}" onmouseup="{()=>clearInterval(mouseclickTimer)}" onmouseleave="{()=>clearInterval(mouseclickTimer)}">↓</button> 

<div class="border-horizontal-popup" style="z-index: 50; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>

<div class="h" style="z-index: 50; text-align:left; grid-column: {6+1} / span 6; grid-row: {15}" >Search:</div>
<input style="z-index: 50; outline: 0px ; text-align:left; grid-column: {6+7+1} / span 15; grid-row: {15}"  maxlength="15" bind:value={searchname} oninput="{()=>{scrollcursorServers=0; serverindex=0}}"/>

<button class="h" style="z-index: 50; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {showserverlist = 0; soundRestart(1);}}">Accept</button>


<style>
span {
    display:inline-block;
    /* text-overflow:clip; */
    white-space: nowrap;
}

.l {
    font-size: medium;
}

.password {
    color: red;
}
</style>