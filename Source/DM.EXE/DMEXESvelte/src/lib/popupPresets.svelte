<script>

import { soundRestart } from "./shared.svelte.js";

let {
    showpresets = $bindable(), 
    presets = $bindable(),
    savePreset,
    loadPreset,
    changePresetName,
    addPreset,
    deletePreset,
    } = $props();

    let hoveredpreset = $state(-1);
    let selectedpreset = $state(-1);
</script>


<div class="popup" style="z-index: 30; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outerhoriz-popup" style="z-index: 30; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outervertic-popup" style="z-index: 30; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

<div class="h1" style="z-index: 30; grid-column: 7 / 45; grid-row: {3}"> Manage your Presets </div>

<div class="border-horizontal-popup" style="z-index: 30; grid-column: 6 / 46; grid-row: {4} / span 1"></div>

{#each Array(9) as temp, i}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="h {i <= presets.length && hoveredpreset == i ? 'hov' : ''} " style="white-space: nowrap; text-align:left; z-index: 30; grid-column: 7 / 44; grid-row: {5+i}" onmouseenter="{()=>hoveredpreset=i}">
    
    {#if i <= presets.length}
        {#if i == presets.length}
            <button style="width:100%; background:none; text-align:left;" onclick="{ ()=>{selectedpreset = i; soundRestart(2); addPreset(i, 'new Preset')} }">
                +
            </button>
            
        {:else}
        {#if hoveredpreset == i}
            <button class="h del" style="position: absolute; right:0px; text-align:right; z-index: 30; grid-column: 7 / 44; grid-row: {5+i};" onclick="{()=> {soundRestart(1); deletePreset(hoveredpreset); selectedpreset = -1;}}">X</button>
        {/if}
            <!-- <span>{selectedpreset == i ? '→' : ''}</span> -->
            <input type="text" maxlength="35" class="h inputtext" style="{selectedpreset == i ? 'color: white;' : 'color: gray;'} {hoveredpreset == i && selectedpreset != i ? 'color: black;' : ''} text-align:left; " value="{presets[i].name}"  
                onclick="{()=> {selectedpreset = i; soundRestart(2);}}"
                onchange="{e=>{if (e.target.value.trim() == '') {e.target.value = 'noname'} changePresetName(i, e.target.value.trim()); } }"
            > 
        {/if}
    {/if}
</div>
       
{/each}


<div class="border-horizontal-popup" style="z-index: 30; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>
<button class="h" style="z-index: 30; text-align:left; grid-column: {6+7} / span 5; grid-row: {15}"  onclick="{()=> {if (selectedpreset >= 0) { savePreset(selectedpreset); showpresets = 0; }  soundRestart(1); }}">Save</button>
<button class="h" style="z-index: 30; text-align:left; grid-column: {7} / span 5; grid-row: {15}"  onclick="{()=> {if (selectedpreset >= 0) {loadPreset(selectedpreset); showpresets = 0; } soundRestart(1); }}">Load</button>
<!-- <button class="h" style="z-index: 30; text-align:left; grid-column: {8+6+6} / span 6; grid-row: {15}"  onclick="{()=> {soundRestart(1); deletePreset(selectedpreset); selectedpreset = -1;}}">Delete</button> -->
<button class="h" style="z-index: 30; text-align:left; grid-column: {34+6} / span 5; grid-row: {15}"  onclick="{()=> {showpresets = 0; soundRestart(1); }}">Close</button>


<style>
.hov {
    background-color: #5d5d5d;
}
.inputtext {
    display: inline-block;
    position: relative;
    background-color: none;
    background: none;
    outline: none;
    width:100%;
    text-transform: capitalize;
}
.del
{
    background-color: rgb(180, 0, 0);
}
</style>