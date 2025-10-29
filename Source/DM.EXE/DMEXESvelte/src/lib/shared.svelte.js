import sounda from "../assets/Sound1.wav"
import soundb from "../assets/Sound2.wav"
import soundc from "../assets/Sound3.wav"

const sound = [new Audio(sounda), new Audio(soundb), new Audio(soundc)];

export function soundRestart(i) {
    sound[i].load();        // reset soundplay to make sound spammable
    sound[i].play();
}

export async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error fetching IP address:', error);
    }
}

export async function getZandronumServerList() {
    try {
        const response = await fetch('https://doomlist.net/api/full');
        const data = await response.json();
        let formated = [];
        for (const [key, value] of Object.entries(data)) {
            if (value.name != undefined)        //somw servers are empty with no infos, skip them, scrollist of serverlist would be ugly
                formated.push(value);
        }
        formated.sort(sortbyPlayersandGamemode)
        // console.log(formated);
        
        return formated;
    } catch (error) {
        console.error('Error fetching doomlist.net api list:', error);
    }
}

function sortbyPlayersandGamemode(a, b) {
    let players_order = b.numplaying - a.numplaying;
    // let gamemode_order = a.gametype.gamemode > b.gametype.gamemode ? 1 : -1;
    return players_order /*|| gamemode_order*/ ;
};
