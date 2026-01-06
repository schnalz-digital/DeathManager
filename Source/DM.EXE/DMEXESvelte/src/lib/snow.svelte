<script>
import { onMount } from 'svelte';

let {scale} = $props();

  let canvas;
  let ctx;
  let widthw;
  let heightw;
  let frame;
  let snowflakes = [];

  const snowflakeCount = 40;

function resize() {
    widthw = canvas.width = window.innerWidth;
    heightw = canvas.height = window.innerHeight;
  }

function createSnowflakes() {
    snowflakes = Array.from({ length: snowflakeCount }, () => ({
      x: Math.random() * widthw,
      y: Math.random() * heightw,
      speed: Math.random() + 0.3,
      drift: Math.random() - 0.3,
      scale: Math.random() *1.3 + 0.3
    }));
  }

function draw() {
    ctx.clearRect(0, 0, widthw, heightw);
    ctx.fillStyle = "white";  

    snowflakes.forEach(flake => {
      // 2x2 Pixel zeichnen
     
      ctx.save();
      ctx.font = `${scale*flake.scale*16}px WebPlus_IBM_VGA_8x16`;
      ctx.fillText('.', flake.x, flake.y);
    //   ctx.fillRect(flake.x, flake.y, 2, 2);
      ctx.restore();

      flake.y += flake.speed*scale;
      flake.x += flake.drift*scale;

      // Reset wenn unten aus dem Bild
      if (flake.y > heightw) {
        flake.y = -2;
        flake.x = Math.random() * widthw;
        flake.scale = Math.random() *1.3 + 0.3;
      }
      
    });

    frame = requestAnimationFrame(draw);
  }


  onMount(() => {
    ctx = canvas.getContext('2d');
    
    // Initialisierung
    resize();
    createSnowflakes();
    draw();

    return () => {
      // Cleanup: Animation stoppen, wenn Komponente zerstört wird
      cancelAnimationFrame(frame);
    };
  });
</script>

<svelte:window on:resize={resize}></svelte:window>
<canvas bind:this={canvas} style="z-index:0; position: fixed; width:100vw; height:100vh; pointer-events: none;" ></canvas>

<style>

</style>