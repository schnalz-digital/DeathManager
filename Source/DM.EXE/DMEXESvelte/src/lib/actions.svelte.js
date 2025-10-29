
export function scrollTexta(node, wadfolder) {

    let index = 0;
    let interval;
    

	function handleMouseOver(event) {
        interval = setInterval(scrollText, 100);
	}

    function scrollText() {
        if (index < wadfolder().length-34)
        {   
            index++;
            node.innerText = wadfolder().slice(index, index+34) + '...';
        } else {
            node.innerText = wadfolder().slice(index, index+34)
        }
    } 

    function stopScroll() {
        index=0; 
        node.innerText = wadfolder().slice(0,34) + '...'; 
        clearInterval(interval)
    }

	$effect(() => {

        if (wadfolder().length > 35)
        {
            node.innerText = wadfolder().slice(0,34) + '...';
            node.addEventListener('mouseenter', handleMouseOver);
            node.addEventListener('mouseleave', stopScroll)
        } else {
            node.innerText = wadfolder()
        }

		return () => {
            clearInterval(interval);
            node.removeEventListener('mouseenter', handleMouseOver);
            node.removeEventListener('mouseleave', stopScroll);
            // reset innerText to changed wadfolder, if undefined then use empty string. otherwise "undefined" button text would appear
            node.innerText = wadfolder() || '';
		};

	});

}