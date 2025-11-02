<script>

import { soundRestart } from "./shared.svelte.js";

let {
    showdeathmatchflags = $bindable(), 
    dmflagsbyport, 
    addedflags = $bindable(), 
    selectedDoomPortFlags = $bindable(), 
    calcAddedFlags
    } = $props();

    // on new popup shwo calc fresh
    calcAddedFlags();
</script>


<div class="popup" style="z-index:20; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outerhoriz-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outervertic-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

<div class="h1" style="z-index: 20; grid-column: 7 / 45; grid-row: {3}">Flags select (grey = default) </div>

<button class="h" style=" text-align:left; z-index: 20; grid-column: 7 / span 11; grid-row: {4}"  onclick="{()=> {selectedDoomPortFlags = 'GZDoom'; calcAddedFlags(); soundRestart(2);}}" >(<span class="y">{selectedDoomPortFlags == 'GZDoom' ? '•' : ' '}</span>) GZDoom </button>
<button class="h" style=" text-align:left; z-index: 20; grid-column: {7+12} / span 14; grid-row: {4}"  onclick="{()=> {selectedDoomPortFlags = 'Zandronum'; calcAddedFlags(); soundRestart(2);}}" >(<span class="y">{selectedDoomPortFlags == 'Zandronum' ? '•' : ' '}</span>) Zandronum</button>

<div class="border-horizontal-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {5} / span 1"></div>


{#each Array(dmflagsbyport.length) as flag, i}
    <button class="h" style="{dmflagsbyport[i].default != dmflagsbyport[i].selected ? '' : 'color: gray;'} text-align:left; z-index: 20; grid-column: 7 / 44; grid-row: {6+i}"  onclick="{()=> {dmflagsbyport[i].selected = !dmflagsbyport[i].selected; calcAddedFlags(); soundRestart(2);}}" >(<span class="y">{dmflagsbyport[i].selected ? '•' : ' '}</span>) {dmflagsbyport[i].name}</button> 
{/each}

<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1} / span 13; grid-row: {14}">#1: {addedflags['dmflags']}</div>
<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1 + 13} / span 13; grid-row: {14}">#2: {addedflags['dmflags2']}</div>
<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1} / span 13; grid-row: {15}">#3: {addedflags['dmflags3']}</div>
<div class="h" style="z-index: 20; text-align:left; grid-column: {6+1 +13} / span 13; grid-row: {15}">ZA: {addedflags['zadmflags']}</div>

<div class="border-horizontal-popup" style="z-index: 20; grid-column: 6 / 46; grid-row: {2+11} / span 1"></div>
<button class="h" style="z-index: 20; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {showdeathmatchflags = 0; soundRestart(1);}}">Accept</button>


<style>

</style>