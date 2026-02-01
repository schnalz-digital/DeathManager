<script>
import { onMount } from 'svelte';

let {
    rowstart, 
    rows,
    column,
    zidx=10,

    scrollUp,
    scrollDown,
    scrollcursorpos, 
    pageScrollUp,
    pageScrollDown,
    } = $props();


  // timer for scrolling acceleration when mouse button is held down
  let mouseclickTimer = $state(0);

  function clickInterval(scrollfunk) {
    if(mouseclickTimer) clearInterval(mouseclickTimer); // seems to help by spam clicking and draggin in the window timer goes forever error
    
    scrollfunk();
    startInterval(130, scrollfunk);
  }

  function startInterval(speed, scrollfunk) {
    mouseclickTimer = setInterval(()=>{ 
        clearInterval(mouseclickTimer);
        if (speed > 36) speed -= 8;
        startInterval(speed, scrollfunk);

        scrollfunk();
    }, speed)
  }

  function clearAllTimers() {
    clearInterval(mouseclickTimer);
  }

	onMount(() => {
		return () => clearInterval(mouseclickTimer);
	});
</script>


<button class="cellupdown" style="z-index:{zidx}; grid-column: {column}; grid-row: {rowstart}" onmousedown="{()=>{clickInterval(scrollUp)}}" onmouseleave="{()=>clearAllTimers()}" onmouseup="{()=>clearAllTimers()}">↑</button>
    <div class="cellgray" style="z-index:{zidx}; grid-column:  {column}; grid-row: {rowstart+1} / {rowstart+rows-1}"> 
    {#each Array(rows-2) as row, i}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span style="z-index:{zidx};" onmouseleave="{()=>clearAllTimers()}" onmouseup="{()=>clearAllTimers()}"  onmousedown="{()=>{scrollcursorpos > i ? clickInterval(pageScrollUp) : clickInterval(pageScrollDown) }}">░</span>
    {/each}
    </div>
<div class="cellgray" style="z-index:{zidx}; grid-column:  {column}; grid-row: {rowstart+1+ scrollcursorpos}">▓</div>
<button class="cellupdown" style="z-index:{zidx}; grid-column: {column}; grid-row: {rowstart+rows-1}" onmousedown="{()=>{clickInterval(scrollDown)}}" onmouseleave="{()=>clearAllTimers()}" onmouseup="{()=>clearAllTimers()}">↓</button>



<style>

</style>