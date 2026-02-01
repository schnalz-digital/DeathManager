<script>
import { onMount } from 'svelte';
import imgkey from '../assets/key.png';

let {scale} = $props();

  let canvas;
  let ctx;
  let widthw;
  let heightw;
  let frame;
  let snowflakes = [];
  let spritekey = new Image();

  const snowflakeCount = 190;

function resize() {
    widthw = canvas.width = window.innerWidth;
    heightw = canvas.height = window.innerHeight;
  }

function createSnowflakes() {
    for (let i = 0; i < snowflakeCount; i++) {
        snowflakes.push(createNewflake());
    }
  }

  const flakechars = [
    {char: '.', height: 1, chance: 0.7}, 
    {char: '☼', height: 0, chance: 0.03}, 
    {char: '▪', height: -2, chance: 0.6}, 
    {char: '+', height: -2, chance: 0.03}, 
    {char: '*', height: -2, chance: 0.03}, 
    {char: '♦', height: -1, chance: 0.03}, 
    {char: '♥', height: 0, chance: 0.02},
    {char: 'doomkey', height: 0, chance: 0.02}
  ];

  function getflakeChar(items) {
    // 1. Calculate the sum of all chances
    const totalWeight = items.reduce((sum, item) => sum + item.chance, 0);
    // 2. Pick a random threshold
    let random = Math.random() * totalWeight;
    // 3. Find which "bucket" the random number falls into
    for (const item of items) {
      if (random < item.chance) {
        return item;
      }
      random -= item.chance;
    }

  }

  function createNewflake(f = {}) {    
      f.x =  Math.random() * widthw;
      f.y = Math.random() * -heightw;  //spawn over the top all initial flakes
      f.speed = Math.random() + 0.3;
      f.drift = Math.random() - 0.3;
      // f.scale = Math.random() *1.3 + 0.3;
      f.scale = 1;
      f.lifeframes = 800;  //life is in frames
      f.opac = 1.0;
      let flakeobj = getflakeChar(flakechars);
      f.height = flakeobj.height;
      f.char = flakeobj.char;
      if (f.char == '♥') f.color = {r:255, g:0, b:0};
      else f.color = {r:255, g:255, b:255};
      return f;
  }
let i = 0;
function draw() {
    ctx.clearRect(0, 0, widthw, heightw);  
    ctx.imageSmoothingEnabled = false;
    // ctx.drawImage(spritekey, 0, 0);
    snowflakes.forEach(flake => {
      if (flake.char == 'doomkey') {
        const scaledHeight = spritekey.naturalHeight * scale;
        const scaledWidth = spritekey.naturalWidth * scale;
        // sehr wichtig: flake.y ist immer die neue baseline wo das bild negativ nach oben gemahlt werden soll.
        // Also -scaledHeight. wenn + scaled heihgt, dann scaled das bild nach unten rechts. is kacke für boden stehen bleiben
        const yPos = flake.y - scaledHeight;
        ctx.drawImage(spritekey, flake.x, yPos, scaledWidth, scaledHeight);
      }
      else
      {
        ctx.save();
        ctx.fillStyle = `rgba(${flake.color.r}, ${flake.color.g}, ${flake.color.b}, ${flake.opac})`;
        ctx.font = `${scale*flake.scale*16}px WebPlus_IBM_VGA_8x16`;
        ctx.fillText(flake.char, flake.x, flake.y);
        //   ctx.fillRect(flake.x, flake.y, 2, 2);
        ctx.restore();
      }


      if (flake.speed == 0)
      {
        // logic for window resize if window height gets bigger
        if (flake.y < heightw - flake.height)
          flake.speed = Math.random() + 0.3;
        else
        // if window height gets smaller
        if (flake.y > heightw - flake.height)
          flake.y = heightw - flake.height ;
        else
        {
            flake.lifeframes--;
            if (flake.lifeframes < 50) {
                flake.opac -= 0.02; // Fade out during the last 50 frames
            }

            // Respawn logic
            if (flake.lifeframes <= 0) {
                createNewflake(flake);
            }          
        }
      } else
      if (flake.speed > 0)
      {
        flake.y += flake.speed*scale;
        flake.x += flake.drift*scale;

        if (flake.x > widthw || flake.x < -5)
          {
            createNewflake(flake);
          }

        // Reset wenn unten aus dem Bild
        if (flake.y > heightw - flake.height ) {
          flake.y = heightw - flake.height;
          flake.speed = 0;
          
          // flake.x = Math.random() * widthw;
          // flake.scale = Math.random() *1.3 + 0.3;
        }
      }

      
    });

    frame = requestAnimationFrame(draw);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');

    spritekey.src = imgkey;
    spritekey.onerror = (e) => console.log('error', e);
    spritekey.onload = ()=>{
      // Initialisierung
      resize();
      createSnowflakes();
      draw();
    }

    return () => {
      // Cleanup: Animation stoppen, wenn Komponente zerstört wird
      cancelAnimationFrame(frame);
    };
  });
</script>

<svelte:window on:resize={resize}></svelte:window>
<canvas bind:this={canvas} style="image-rendering: pixelated; z-index:0; position: absolute; top:50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;" ></canvas>

<style>

</style>