<script>

//TODO---------------------- scrolltext with span in button

import { soundRestart } from "./shared.svelte.js";
import { scrollTexta } from "./actions.svelte.js";

let {
    showwadfolders = $bindable(), 
    wadfolders,
    onWadFoldersAdd,
    readWadFolders,
    spliceWadFolders
    } = $props();

    let hoveredfolder = $state(-1);

function onclickFolderbutton(i)
{
    //the fixed array of button 8, make no click function if button is not the last entry or greater of wadfolders.
    // empty button should not react.
    if (i <= wadfolders.length) 
    { soundRestart(2); onWadFoldersAdd(i)}
}

</script>


<div class="popup" style="z-index: 40; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outerhoriz-popup" style="z-index: 40; grid-column: 6 / 46; grid-row: {2} / span 15"></div>
<div class="border-outervertic-popup" style="z-index: 40; grid-column: 6 / 46; grid-row: {2} / span 15"></div>

<div class="h1" style="z-index: 40; grid-column: 7 / 45; grid-row: {3}">Add Wad Folder... </div>

<div class="border-horizontal-popup" style="z-index: 40; grid-column: 6 / 46; grid-row: {4} / span 1"></div>


{#each Array(8) as flag, i}
    <!-- svelte-ignore a11y_mouse_events_have_key_events -->
    <button class="h folderpath" style="background-color:{hoveredfolder==i && i <= wadfolders.length? '#5d5d5d' : ''}; text-align:left; z-index: 40; grid-column: 7 / 45; grid-row: {5+i}" 
        use:scrollTexta={()=>i == wadfolders.length ? '+': wadfolders[i] || ''} onmouseenter="{()=>hoveredfolder=i}" onclick="{()=> onclickFolderbutton(i) }" > 
            <!-- {i == wadfolders.length ? '+': wadfolders[i]}  -->
    </button> 
    {#if hoveredfolder == i && i < wadfolders.length}
        <button class="h del" style="text-align:right; z-index: 40; grid-column: 44 / 45; grid-row: {5+i}" onclick="{()=>spliceWadFolders(i)}">X</button>
    {/if}
    
{/each}


<div class="border-horizontal-popup" style="z-index: 40; grid-column: 6 / 46; grid-row: {2+12} / span 1"></div>
<button class="h" style="z-index: 40; text-align:left; grid-column: {6+33} / span 6; grid-row: {15}"  onclick="{()=> {showwadfolders = 0; soundRestart(1); readWadFolders(); }}">Accept</button>


<style>
.folderpath {
    overflow: clip;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.del
{
    background-color: rgb(180, 0, 0);
}
</style>