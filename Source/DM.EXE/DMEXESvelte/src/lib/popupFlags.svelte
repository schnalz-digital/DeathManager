<script>

import { soundRestart } from "./shared.svelte.js";
// import { scrollTexta } from "./actions.svelte.js";
import ScrollBar from "./scrollbar.svelte";

let {
    showdeathmatchflags = $bindable(), 
    dmflagsbyport, 
    addedflags = $bindable(), 
    selectedDoomPortFlags = $bindable(), 
    calcAddedFlags,

    } = $props();

    let scrollindex = $state(0);
    let scrollcursorflags = $state(0);

    // on new popup shwo calc fresh
    calcAddedFlags();
    $inspect(addedflags);


  function scroll(dir, visiblelines) {
    //calc the max top index of listview. use 0 if list is smaller than the maxlines visible
    let maxindex = Math.max(0, dmflagsbyport.length - visiblelines);
    // steps of the cursor of scrollbar from 0-x. steps are between the arrow buttons.
    let scrollbarsteps = visiblelines-3;
    if (dir == 'up')
    {
      if (scrollindex > 0) scrollindex--; 
    } else if (dir == 'down')
    {
      if (scrollindex < maxindex) scrollindex++; 
    }
    if (maxindex > 0)
      scrollcursorflags =  Math.round( (scrollindex / maxindex) * scrollbarsteps )
    soundRestart(0);
  }  

  function pageScroll(dir, visiblelines) {
    let maxindex = Math.max(0, dmflagsbyport.length - visiblelines);
    let scrollbarsteps = visiblelines-3;

    if (dir == 'up') {
        scrollindex = Math.max(0, scrollindex - visiblelines);
    } else if (dir == 'down') {
        scrollindex = Math.min(maxindex, scrollindex + visiblelines);
    }
    if (maxindex > 0)
      scrollcursorflags =  Math.round( (scrollindex / maxindex) * scrollbarsteps )

    soundRestart(0);
}

function resetScrollbar(){
    scrollindex = 0;
    scrollcursorflags = 0;
}

</script>


<div class="popup" style="z-index:20; grid-column: 6 / 46; grid-row: {2} / span {15+1}"></div>
<div class="border-outerhoriz-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {2} / span {15+1}"></div>
<div class="border-outervertic-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {2} / span {15+1}"></div>

<div class="h1" style="z-index: 20; grid-column: 7 / 45; grid-row: {3}">Flags select (grey = default) </div>

<button class="h" style=" text-align:left; z-index: 20; grid-column: 7 / span 11; grid-row: {4}"  onclick="{()=> {selectedDoomPortFlags = 'GZDoom'; calcAddedFlags(); resetScrollbar(); soundRestart(2);}}" >(<span class="y">{selectedDoomPortFlags == 'GZDoom' ? '•' : ' '}</span>) GZDoom </button>
<button class="h" style=" text-align:left; z-index: 20; grid-column: {7+11} / span 13; grid-row: {4}"  onclick="{()=> {selectedDoomPortFlags = 'Zandronum'; calcAddedFlags(); resetScrollbar(); soundRestart(2);}}" >(<span class="y">{selectedDoomPortFlags == 'Zandronum' ? '•' : ' '}</span>) Zandronum</button>
<button class="h" style=" text-align:left; z-index: 20; grid-column: {7+12+13} / span 13; grid-row: {4}"  onclick="{()=> {selectedDoomPortFlags = 'Chocolate'; calcAddedFlags(); resetScrollbar(); soundRestart(2);}}" >(<span class="y">{selectedDoomPortFlags == 'Chocolate' ? '•' : ' '}</span>) Chocolate</button>

<div class="border-horizontal-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {5} / span 1"></div>

{#each Array(8) as server, i}
    {#if dmflagsbyport[scrollindex+i]}
    <button class="h"  style="{dmflagsbyport[scrollindex+i].default != dmflagsbyport[scrollindex+i].selected ? '' : 'color: gray;'} text-align:left; white-space: pre; overflow:hidden; z-index: 20; grid-column: 7 / 44; grid-row: {6+i}"  
        title="{dmflagsbyport[scrollindex+i].name}"    
        onclick="{()=> {dmflagsbyport[scrollindex+i].selected = !dmflagsbyport[scrollindex+i].selected; calcAddedFlags(); soundRestart(2);}}" 
        onwheel="{e=>e.deltaY > 0 ? scroll('down', 8) : scroll('up', 8)}" 
        >
        (<span class="y">{dmflagsbyport[scrollindex+i].selected ? '•' : ' '}</span>) {dmflagsbyport[scrollindex+i].name}
    </button> 
    {/if}
{/each}

<ScrollBar rowstart={6} rows={8} column={43} zidx={51} scrollUp={()=>scroll('up', 8)} scrollDown={()=>scroll('down', 8)} pageScrollUp={()=>pageScroll('up', 8)} pageScrollDown={()=>pageScroll('down', 8)} scrollcursorpos={scrollcursorflags} />


<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1} / span 13; grid-row: {14+1}">#1: {addedflags['dmflags']}</div>
<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1 + 13} / span 13; grid-row: {14+1}">#2: {addedflags['dmflags2']}</div>
<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1} / span 13; grid-row: {15+1}">#3: {addedflags['dmflags3']}</div>
<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1 +13} / span 13; grid-row: {15+1}">ZA: {addedflags['zadmflags']}</div>

<div class="border-horizontal-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {2+11+1} / span 1"></div>
<button class="h" style="z-index: 20; text-align:left; grid-column: {6+33} / span 6; grid-row: {15+1}"  onclick="{()=> {showdeathmatchflags = 0; soundRestart(1);}}">Accept</button>


<style>

</style>