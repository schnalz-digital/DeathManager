<script>

import * as neuMods from "./neuMods"
import { soundRestart } from "./shared.svelte.js";

let {
    showlevelselect = $bindable(), 
    gamewads,
    selectedGameWAD,
    lastselectedAddonWAD,

    scrollcursorLevels,
    clickInterval,
    // scrollupMaps,
    // scrolldownMaps,
    clearAllTimers,

    map = $bindable(),
    mapindex

    } = $props();

  function scrollupMaps() {
    if (mapindex > 0){ 
      mapindex--;
      //devide by 7 cause 7 scrollbar charheights for cursor position
      scrollcursorLevels = Math.floor( (mapindex+2) /(gamewads[selectedGameWAD]?.maps.length/7))

      soundRestart(0);
    }
    
  }

  function scrolldownMaps() {
    // lastselectedAddonWAD is Object of WAD with maps[] array. if its not 0 then an AddonWAD is selected...
    if (lastselectedAddonWAD && mapindex+8 < lastselectedAddonWAD.maps.length-1){ 
      mapindex++;
      scrollcursorLevels = Math.floor( (mapindex+6) / (lastselectedAddonWAD.maps.length/7))
      soundRestart(0);
    }
    // else lastselectedAddonWAD is undefined, so no AddonWAD was filtered as selected but a GamesWAD is valid. 
    if (lastselectedAddonWAD == undefined && mapindex+8 < gamewads[selectedGameWAD]?.maps.length-1) {
      mapindex++;
      scrollcursorLevels = Math.floor( (mapindex+6) / (gamewads[selectedGameWAD].maps.length/7))

      soundRestart(0);
    }
  }


</script>

			<div class="popup" style="grid-column: 6 / 46; grid-row: {2} / span 15"></div>
			<div class="border-outerhoriz-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
			<div class="border-outervertic-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

			<div class="h1" style="z-index:10; grid-column: 7 / 45; grid-row: {3}">Select Level <span style="color: var(--text);"> { lastselectedAddonWAD?.entry || gamewads[selectedGameWAD]?.entry} </span> </div>

			<div class="border-horizontal-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {4} / span 1"></div>
            <!-- SCROLL BUTTONS FOR MAPS -->
                <button class="cellupdown" style="z-index:11; grid-column: 43; grid-row: {5}" onmousedown="{()=>{clickInterval(scrollupMaps)}}" onmouseleave="{()=>clearAllTimers()}">↑</button>     
               <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="cellgray" style="z-index:11; grid-column:  43; grid-row: {5+1} / {5+8}">
                    <span onmousedown="{()=>{clickInterval(scrollupMaps)}}">░</span>
                    <span onmousedown="{()=>{scrollcursorLevels > 1 ? clickInterval(scrollupMaps) : clickInterval(scrolldownMaps) }}" >░</span>
                    <span onmousedown="{()=>{scrollcursorLevels > 2 ? clickInterval(scrollupMaps) : clickInterval(scrolldownMaps) }}" >░</span>
                    <span onmousedown="{()=>{scrollcursorLevels > 3 ? clickInterval(scrollupMaps) : clickInterval(scrolldownMaps) }}" >░</span>
                    <span onmousedown="{()=>{scrollcursorLevels > 4 ? clickInterval(scrollupMaps) : clickInterval(scrolldownMaps) }}" >░</span>
                    <span onmousedown="{()=>{scrollcursorLevels > 5 ? clickInterval(scrollupMaps) : clickInterval(scrolldownMaps) }}" >░</span>
                    <span onmousedown="{()=>{clickInterval(scrolldownMaps) }}">░</span>     
                </div> 
                <div class="cellgray" style="z-index:11; grid-column:  43; grid-row: {5+1+ scrollcursorLevels}">▓</div>
                <button class="cellupdown" style="z-index:11; grid-column: 43; grid-row: {5+8}" onmousedown="{()=>{clickInterval(scrolldownMaps)}}" onmouseleave="{()=>clearAllTimers()}">↓</button> 

				{#if lastselectedAddonWAD}
                    {#each Array(9) as rowMap, i}
                    <button class="h" style="text-align:left; z-index: 10; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {map =  lastselectedAddonWAD.maps[mapindex+i]; neuMods.save('map', map); soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldownMaps() : scrollupMaps()}">{lastselectedAddonWAD.maps[mapindex+i]}</button>
                    {/each}
                            {:else if gamewads[selectedGameWAD]}
                    {#each Array(9) as rowMap, i}
                    <button class="h" style="text-align:left; z-index: 10; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {map =  gamewads[selectedGameWAD].maps[mapindex+i]; neuMods.save('map', map); soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scrolldownMaps() : scrollupMaps()}"> {gamewads[selectedGameWAD].maps[mapindex+i]}</button>
                    {/each}
				{/if}

			<div class="border-horizontal-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>
			<button class="h" style="z-index:10; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {showlevelselect = 0; soundRestart(1);}}">Accept</button>
			

<style>

</style>