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

// const fetchserver = 'http://127.0.0.1:5666/doom/zandronum';
// const fetchserverodamex = 'http://127.0.0.1:5666/doom/odamex';
const fetchserverodamex = 'https://kfo.uber.space/doom/odamex';
const fetchserver = 'https://kfo.uber.space/doom/zandronum';
// const fetchserverchoc = 'http://127.0.0.1:5666/doom/chocolate';
const fetchserverchoc = 'https://kfo.uber.space/doom/chocolate';

export async function getZandronumServerList() {
    try {
        const response = await fetch(fetchserver);
        const data = await response.json();
        // console.log(data);
        
        let formated = [];

        for (const [key, value] of Object.entries(data)) {
            // console.log(value);
            if (value.info != undefined && value.info.name != undefined)        //somw servers are empty with no infos, skip them, scrollist of serverlist would be ugly
                formated.push(value);
        }
        
        formated.sort(sortbyPlayersandGamemode)

        if (data.length > 0 && data[data.length-1].finished) {
            console.log('shared: pushing finished');
            
            formated.push({finished: 1});   //push artificial the finished object at the end of the list
            //this is used in the UI to stop http requests every 2 secs.
        }
        // console.log(formated);
        return formated;
    } catch (error) {
        console.error('Error fetching doomlist.net api list:', error);
        return [{error: 'server not responding: ' + fetchserver}];
    }
}

export async function getChocolateServerList() {
    try {
        const response = await fetch(fetchserverchoc);
        const data = await response.json();
        // console.log(data);
        
        let formated = [];

        for (const [key, value] of Object.entries(data)) {
            // console.log(value);
            if (value.info != undefined && value.info.version != undefined)        //somw servers are empty with no infos, skip them, scrollist of serverlist would be ugly
                formated.push(value);
        }
        
        formated.sort(sortbyPlayersandGamemode)

        if (data.length > 0 && data[data.length-1].finished) {
            console.log('shared: pushing finished');
            
            formated.push({finished: 1});   //push artificial the finished object at the end of the list
            //this is used in the UI to stop http requests every 2 secs.
        }
        // console.log(formated);
        return formated;
    } catch (error) {
        console.error('Error fetching doomlist.net api list:', error);
        return [{error: 'server not responding: ' + fetchserverchoc}];
    }
}

export async function getOdamexServerList() {
    try {
        const response = await fetch(fetchserverodamex);
        const data = await response.json();
        // console.log(data);
        
        let formated = [];

        for (const [key, value] of Object.entries(data)) {
            // console.log(value);
            if (value.info != undefined && value.info.name != undefined)        //somw servers are empty with no infos, skip them, scrollist of serverlist would be ugly
                formated.push(value);
        }
        
        formated.sort(sortbyPlayersandGamemode)

        if (data.length > 0 && data[data.length-1].finished) {
            console.log('shared: pushing finished');
            
            formated.push({finished: 1});   //push artificial the finished object at the end of the list
            //this is used in the UI to stop http requests every 2 secs.
        }
        // console.log(formated);
        return formated;
    } catch (error) {
        console.error('Error fetching doomlist.net api list:', error);
        return [{error: 'server not responding: ' + fetchserverodamex}];
    }
}

function sortbyPlayersandGamemode(a, b) {
    let players_order = b.info.numPlayers - a.info.numPlayers;
    // let gamemode_order = a.gametype.gamemode > b.gametype.gamemode ? 1 : -1;
    return players_order /*|| gamemode_order*/ ;
};

