<script>

import * as neuMods from "./neuMods"
import { soundRestart } from "./shared.svelte.js";
import ScrollBar from "./scrollbar.svelte";

let {
    showlevelselect = $bindable(), 
    gamewads,
    selectedGameWAD,
    lastselectedAddonWAD,

    scrollcursorLevels,

    map = $bindable(),
    checkMapName,
    mapindex

    } = $props();

  
  function scroll(dir, visiblelines) {
    let maxindex = 0;
    // lastselectedAddonWAD is Object of WAD with maps[] array. if its not 0 then an AddonWAD is selected...
    if (lastselectedAddonWAD) 
        //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
        maxindex = Math.max(0, lastselectedAddonWAD.maps.length - visiblelines);
    // else lastselectedAddonWAD is undefined, so no AddonWAD was filtered as selected but a GamesWAD is valid. 
    else if (lastselectedAddonWAD == false)
        maxindex = Math.max(0, gamewads[selectedGameWAD]?.maps.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up')
    {
      if (mapindex > 0) mapindex--; 
    } else if (dir == 'down')
    {
      if (mapindex < maxindex) mapindex++; 
    }
    if (maxindex > 0)
      scrollcursorLevels =  Math.round( (mapindex / maxindex) * scrollbarsteps )
    soundRestart(0);
  }  

  function pageScroll(dir, visiblelines) {
  let maxindex = 0;
    // lastselectedAddonWAD is Object of WAD with maps[] array. if its not 0 then an AddonWAD is selected...
    if (lastselectedAddonWAD) 
        //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
        maxindex = Math.max(0, lastselectedAddonWAD.maps.length - visiblelines);
    // else lastselectedAddonWAD is undefined, so no AddonWAD was filtered as selected but a GamesWAD is valid. 
    else if (lastselectedAddonWAD == false)
        maxindex = Math.max(0, gamewads[selectedGameWAD]?.maps.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up') {
        mapindex = Math.max(0, mapindex - visiblelines);
    } else if (dir == 'down') {
        mapindex = Math.min(maxindex, mapindex + visiblelines);
    }
    if (maxindex > 0)
      scrollcursorLevels =  Math.round( (mapindex / maxindex) * scrollbarsteps )

    soundRestart(0);
}


</script>

			<div class="popup" style="grid-column: 6 / 46; grid-row: {2} / span 15"></div>
			<div class="border-outerhoriz-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
			<div class="border-outervertic-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

			<div class="h1" style="z-index:10; overflow: clip; white-space: nowrap;  grid-column: 7 / 45; grid-row: {3}">Select Level <span style="color: var(--text);"> { lastselectedAddonWAD?.entry || gamewads[selectedGameWAD]?.entry} </span> </div>

			<div class="border-horizontal-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {4} / span 1"></div>

      <ScrollBar rowstart={5} rows={9} column={43} zidx={11} scrollUp={()=>scroll('up', 9)} scrollDown={()=>scroll('down', 9)} pageScrollUp={()=>pageScroll('up', 9)} pageScrollDown={()=>pageScroll('down', 9)}  scrollcursorpos={scrollcursorLevels} />

				{#if lastselectedAddonWAD}
                    {#each Array(9) as rowMap, i}
                    <button class="h" style="text-align:left; z-index: 10; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {map =  lastselectedAddonWAD.maps[mapindex+i]; neuMods.save('map', map); soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scroll('down', 9) : scroll('up', 9)}">{lastselectedAddonWAD.maps[mapindex+i]}</button>
                    {/each}
        {:else if gamewads[selectedGameWAD]}
                    {#each Array(9) as rowMap, i}
                    <button class="h" style="text-align:left; z-index: 10; grid-column: 7 / 44; grid-row: {5+i}"  onclick="{()=> {map =  gamewads[selectedGameWAD].maps[mapindex+i]; neuMods.save('map', map); soundRestart(2);}}" onwheel="{e=>e.deltaY > 0 ? scroll('down', 9) : scroll('up', 9)}"> {gamewads[selectedGameWAD].maps[mapindex+i]}</button>
                    {/each}
				{/if}

			<div class="border-horizontal-popup" style="z-index: 10; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>
			<button class="h" style="z-index:10; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {showlevelselect = 0; checkMapName(); soundRestart(1);}}">Close</button>
			

<style>
 
</style>