<script>
import { onMount } from 'svelte';

import * as neuMods from "./neuMods"
import { soundRestart } from "./shared.svelte.js";
import ScrollBar from "./scrollbar.svelte";

let {
    selectedaddonwads = $bindable(),
    folderindexOrderwads = $bindable(),
    scrollcursorOrderwads = $bindable(),
    resetMap

    } = $props();


  function scroll(dir, visiblelines) {
    //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
    let maxindex = Math.max(0, selectedaddonwads.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up')
    {
      if (folderindexOrderwads > 0) folderindexOrderwads--; 
    } else if (dir == 'down')
    {
      if (folderindexOrderwads < maxindex) folderindexOrderwads++; 
    }
    if (maxindex > 0)
      scrollcursorOrderwads =  Math.round( (folderindexOrderwads / maxindex) * scrollbarsteps )
    soundRestart(0);
  }  

  function pageScroll(dir, visiblelines) {
    let maxindex = Math.max(0, selectedaddonwads.length - visiblelines);
    let scrollbarsteps = visiblelines-3;

    if (dir == 'up') {
        folderindexOrderwads = Math.max(0, folderindexOrderwads - visiblelines);
    } else if (dir == 'down') {
        folderindexOrderwads = Math.min(maxindex, folderindexOrderwads + visiblelines);
    }
    if (maxindex > 0)
      scrollcursorOrderwads =  Math.round( (folderindexOrderwads / maxindex) * scrollbarsteps )

    soundRestart(0);
}

  function getButtonTextOrder(folderindex) {
	let text = "";
	if (selectedaddonwads[folderindex])
	{
		text = `${selectedaddonwads[folderindex].selected ? '→': ''}${selectedaddonwads[folderindex].entry}`
	}
	return text.toUpperCase();
  }

    function handleDragOrderwad(e, i) {
    // draggamewad = 1;
    e.dataTransfer.setData("text/plain", i);
    soundRestart(2);
  }

  function handleDropOrderwad(e, towadindex) {
    e.preventDefault();
    
    const index = e.dataTransfer.getData("text/plain");
    console.log('in drops bei addons ', index);
    console.log('to addonwad index: ', towadindex);

    let wad = selectedaddonwads[index];

    // addonwads[index] = towad;
    // addonwads[towadindex] = wad;
    selectedaddonwads.splice(index,1); //remove from old position
    selectedaddonwads.splice(towadindex,0, wad); //insert at new position

    selectedaddonwads = [...selectedaddonwads]; //cheat update UI list, splice of selectedaddonwads does not trigger upddate
    
    soundRestart(1);
  }

    // berechne aus jedem prozent 0-100 nur die schritte mit 22 zeichen lang
  // damit die div breite jede 22 steps breiter gemacht wird beim download.
  function calcPercentSteps (percent) {
    let steps = 22;
    const schrittIndexFloat = percent * (steps / 100.0);
    // 3. Runden auf den nächsten ganzen Schritt-Index
    let r = Math.round(schrittIndexFloat);
    // console.log(' round: ', r);
    r = r * 100 / steps;
    return r
  }

  let invert = $state(1);

	onMount(() => {
    let blinktimer = setInterval(() => {
      invert ? invert = 0 : invert = 1;
    }, 300);

		return () => clearInterval(blinktimer);
	});

</script>

        <div class="h2" style="text-align:left; padding-left: 3px; grid-column: 24 / {34 +4}; grid-row: {3}">Order WAD {selectedaddonwads.length}</div>

        <ScrollBar rowstart={4} rows={6} column={46} scrollUp={()=>scroll('up', 6)} scrollDown={()=>scroll('down', 6)} pageScrollUp={()=>pageScroll('up', 6)} pageScrollDown={()=>pageScroll('down', 6)} scrollcursorpos={scrollcursorOrderwads} />

        {#each Array(6) as rowWAD, i}
          <div style="background-color: black; overflow: hidden; color: green; grid-column: {24} / span 22; grid-row: {4+i};">
          {selectedaddonwads[folderindexOrderwads+i]?.progress > 0 ? '░░░░░░░░░░░░░░░░░░░░░░░░░░░░' : ''}</div>
          {#if selectedaddonwads[folderindexOrderwads+i]?.progress > 0 || selectedaddonwads[folderindexOrderwads+i]?.progress == 'done'}
            <div style="background-color: none; text-align: right; color:gray; grid-column: {24} / span 22; grid-row: {4+i}; width: {calcPercentSteps(selectedaddonwads[folderindexOrderwads+i]?.progress) + 4.5}%">
            {invert > 0 ? '▓' : '░'}</div>
            <div style="background-color: black; color:green; overflow: hidden; grid-column: {24} / span 22; grid-row: {4+i}; width: {calcPercentSteps(selectedaddonwads[folderindexOrderwads+i]?.progress)}%">
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
          {/if}
          {#if selectedaddonwads[folderindexOrderwads+i]?.progress == -1}
            <div style="margin-top: 7px; height: 1px; background-color: red; grid-column: {24} / span 22; grid-row: {4+i}; width: {selectedaddonwads[folderindexOrderwads+i]?.progress}%">
            </div>
          {/if}
          <button class="h4 {selectedaddonwads[folderindexOrderwads+i]?.selected ? 'hsel' : ''}"   style="background: none; grid-column: {24} / span 22; grid-row: {4+i}; {selectedaddonwads[folderindexOrderwads+i]?.missing ? 'color: red;' : '' }" 
            draggable="{selectedaddonwads[folderindexOrderwads+i] != undefined}" 
            ondragstart="{ (e)=>{ handleDragOrderwad(e, folderindexOrderwads+i) } }" 
            ondrop="{ (e)=>{ handleDropOrderwad(e, folderindexOrderwads+i) } }" 
            ondragover="{ (e)=>{if (selectedaddonwads[folderindexOrderwads+i]) e.preventDefault() } }"
             onclick="{()=>{ if (selectedaddonwads[folderindexOrderwads+i]) selectedaddonwads[folderindexOrderwads+i].selected =!selectedaddonwads[folderindexOrderwads+i].selected; resetMap(); /*updateSelectedaddonwads();*/ soundRestart(2);}}" 
            onwheel="{e=>e.deltaY > 0 ? scroll('down', 6) : scroll('up', 6)}"
            >
              {getButtonTextOrder(folderindexOrderwads+i)}
          </button>
          {#if selectedaddonwads[folderindexOrderwads+i]?.missing && selectedaddonwads[folderindexOrderwads+i]?.download != 1 }
            <button class="h2" style="z-index:11; grid-column: {24+25} / span 1; grid-row: {4+i};" 
                    onclick="{()=>{selectedaddonwads[folderindexOrderwads+i].download = 1; 
                              neuMods.download(selectedaddonwads[folderindexOrderwads+i]?.entry) } }">
                ▼
            </button>
          {/if}
        {/each}

<style>

</style>