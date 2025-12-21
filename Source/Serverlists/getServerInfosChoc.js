const dgram = require("dgram");

const SERVER_QUERY = 13;

//https://github.com/chocolate-doom/chocolate-doom/blob/master/src/d_mode.h
const gamemission = [
    "doom",            // Doom 1
    "doom2",           // Doom 2
    "pack_tnt",        // Final Doom: TNT: Evilution
    "pack_plut",       // Final Doom: The Plutonia Experiment
    "pack_chex",       // Chex Quest (modded doom)
    "pack_hacx",       // Hacx (modded doom2)
    "heretic",         // Heretic
    "hexen",           // Hexen
    "strife",          // Strife
    "doom2f",          // Doom 2: L'Enfer sur Terre
    "none"
]

const gamemode = [
    "shareware",       // Doom/Heretic shareware
    "registered",      // Doom/Heretic registered
    "commercial",      // Doom II/Hexen
    "retail",          // Ultimate Doom
    "indetermined"     // Unknown.
]

function getIWAD(gamemission, gamemode) {
    let txt = ''
    if (gamemode == 'shareware') {
        txt = gamemission == 'doom' ? 'doom1.wad' :
                gamemission == 'heretic' ? 'heretic1.wad' : ''
    } else {
        txt = gamemission == 'doom' ? 'doom.wad' : 
                gamemission == 'doom2' ? 'doom2.wad' : 
                gamemission == 'pack_tnt' ? 'tnt.wad' : 
                gamemission == 'pack_plut' ? 'plutonia.wad' : 
                gamemission == 'pack_chex' ? 'chex.wad' : 
                gamemission == 'pack_hacx' ? 'hacx.wad' : 
                gamemission == 'heretic' ? 'heretic.wad' : 
                gamemission == 'hexen' ? 'hexen.wad' : 
                gamemission == 'strife' ? 'strife.wad' : 
                gamemission == 'doom2f' ? 'doom2f.wad' : ''
    }      
    return txt;
}

//  https://github.com/chocolate-doom/chocolate-doom/blob/master/src/net_server.c
const serverstate = [
    // waiting for the game to be "launched" (key player to press the start
    // button)
    "SERVER_WAITING_LAUNCH",
    // game has been launched, we are waiting for all players to be ready
    // so the game can start.
    "SERVER_WAITING_START",
    // in a game
    "SERVER_IN_GAME",
]

const request = Buffer.alloc(2);
request.writeInt16BE(SERVER_QUERY, 0);   // long (32-bit)


async function getServerInfos(HOST, PORT) {
    return new Promise(async (resolve) => {
        let socket = dgram.createSocket("udp4");
        let serverinfos = {};
        let timeout = setTimeout(() => {
            socket.close();
            resolve( {} );
        }, 500); // 2 Sekunden Timeout
            // Erstelle den UDP-Socket und verbinde ihn mit dem Zielhost und Port
        socket.on("message", (msg, rinfo) => {
             clearTimeout(timeout);
            // Callback-Funktion, die bei Empfang von Daten aufgerufen wird
            // buffer ist ein Uint8Array (Web API)

            // console.log(`\nAntwort erhalten von ${rinfo.address}:${rinfo.port} (${msg.length} Bytes)`);           

            let header = msg.readInt16BE(0); //Header
            let offset = 2;
            if (header == 14) 
            {
                // console.log('Server Response == 14 ok')

                serverinfos.version = readString(msg, offset);
                offset += serverinfos.version.length +1;
                
                serverinfos.server_state = serverstate[msg.readUInt8(offset)];
                serverinfos.num_players = msg.readUInt8(offset +1);
                serverinfos.max_players = msg.readUInt8(offset +2);
                serverinfos.gamemode = gamemode[msg.readUInt8(offset +3)];
                serverinfos.gamemission = gamemission[ msg.readUInt8(offset +4)];
                offset += 5;
                serverinfos.description = readString(msg, offset);

                //data modification so the values are like zandronum and the UI can read it easy
                serverinfos.name = serverinfos.description;
                serverinfos.iwad = getIWAD(serverinfos.gamemission, serverinfos.gamemode);
                serverinfos.numPlayers = serverinfos.num_players;
                serverinfos.maxPlayers = serverinfos.max_players;
                serverinfos.gamemode = '';  //reset gamemode beacause in zandronum its a different meaning. so the UI doesnt show chocolate gamemodes

                // console.log(serverinfos);
                
                socket.close();
                resolve(serverinfos);
            }
            else {
                socket.close();
                resolve( { } );
            }
            
        });

        socket.send(request, 0, request.length, PORT, HOST, (err) => {
        if (err) {
            console.error("Fehler beim Senden:", err);
            socket.close();
        } else {
            // console.log(`\nAnfrage an ${MASTER_SERVER}:${MASTER_PORT} gesendet.`);
        }
        });

        socket.on("error", (err) => {
            console.error("Fehler:", err);
            socket.close();
        });

    });
}


// Hilfsfunktion zum Lesen von null-terminierten ASCII-Strings aus DataView buffer
function readString(buffer, offset) {
    if (buffer.readUInt8(offset) === 0) {
        return '';
    }

    let i = offset;
    while (buffer.readUInt8(i++) != 0); i--;
    
    let str = buffer.toString('ascii', offset, i);
    offset += str.length + 1;
    return str;
}


async function run() {
    const HOST = '70.34.242.185';
    const PORT = 2342;
    let s = await getServerInfos(HOST, PORT);

    console.log(JSON.stringify(s, null, 4));
}

// run();

module.exports = {getServerInfos}