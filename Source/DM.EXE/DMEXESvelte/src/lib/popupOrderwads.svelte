<script>
import { onMount } from 'svelte';

import * as neuMods from "./neuMods"
import { soundRestart } from "./shared.svelte.js";

let {
    selectedaddonwads = $bindable(),
    folderindexOrderwads = $bindable(),
    scrollcursorOrderwads = $bindable(),
    clickInterval,
    clearAllTimers,
    updateSelectedaddonwads,

    } = $props();


  function scrollupOrder() {
    if (folderindexOrderwads > 0) {
      folderindexOrderwads--; 
      scrollcursorOrderwads = Math.floor( (folderindexOrderwads+1) /(selectedaddonwads.length/4))

      soundRestart(0);
    }
    // console.log(addonwads.length, folderindexAddon/(addonwads.length/4));
  }

  function scrolldownOrder() {
    if (folderindexOrderwads+5 < selectedaddonwads.length-1) {
        folderindexOrderwads++; 
        scrollcursorOrderwads = Math.floor( (folderindexOrderwads+5) /(selectedaddonwads.length/4) )

        soundRestart(0);
    }
    // console.log(addonwads.length, folderindexAddon/(addonwads.length/4));  
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

        <button class="cellupdown" style="grid-column: 47; grid-row: {4}" onmousedown="{()=>{clickInterval(scrollupOrder)}}" onmouseleave="{()=>clearAllTimers()}">↑</button>     
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="cellgray" style="grid-column:  47; grid-row: {4+1} / {4+5}">
              
              <span onmousedown="{()=>{clickInterval(scrollupOrder)}}">░</span>
              <span onmousedown="{()=>{scrollcursorOrderwads > 1 ? clickInterval(scrollupOrder) : clickInterval(scrolldownOrder) }}">░</span>
              <span onmousedown="{()=>{scrollcursorOrderwads > 2 ? clickInterval(scrollupOrder) : clickInterval(scrolldownOrder) }}">░</span>
              <span onmousedown="{()=>{clickInterval(scrolldownOrder) }}">░</span>        
          </div> 
          <div class="cellgray" style="grid-column:  47; grid-row: {4+1+ scrollcursorOrderwads}">▓</div>
                  <div class="cellblack" style="grid-column:  46; grid-row: {4} / {4+1+5}"></div>
        <button class="cellupdown" style="grid-column: 47; grid-row: {4+5}" onmousedown="{()=>{clickInterval(scrolldownOrder)}}" onmouseleave="{()=>clearAllTimers()}">↓</button>    

        {#each Array(6) as rowWAD, i}
          <div style="background-color: black; grid-column: {24} / span 22; grid-row: {4+i};">
          </div>
          {#if selectedaddonwads[folderindexOrderwads+i]?.progress > 0 || selectedaddonwads[folderindexOrderwads+i]?.progress == 'done'}
            <div style="background-color: grey; grid-column: {24} / span 22; grid-row: {4+i}; width: {calcPercentSteps(selectedaddonwads[folderindexOrderwads+i]?.progress) + invert*4}%">
            </div>
            <div style="background-color: green; grid-column: {24} / span 22; grid-row: {4+i}; width: {calcPercentSteps(selectedaddonwads[folderindexOrderwads+i]?.progress)}%">
            </div>
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
             onclick="{()=>{ if (selectedaddonwads[folderindexOrderwads+i]) selectedaddonwads[folderindexOrderwads+i].selected =!selectedaddonwads[folderindexOrderwads+i].selected; /*updateSelectedaddonwads();*/ soundRestart(2);}}" 
            onwheel="{e=>e.deltaY > 0 ? scrolldownOrder() : scrollupOrder()}"
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