const dgram = require("dgram");

const SERVER_QUERY_1 = 0xAD011001;
const SERVER_QUERY_2 = 0xAD011002;

  const firstrequest = Buffer.alloc(4);
  firstrequest.writeUInt32LE(SERVER_QUERY_1, 0);   // long (32-bit)

async function getServerInfos1(HOST, PORT, requestPacket = firstrequest) {
    return new Promise(async (resolve) => {
        let socket = dgram.createSocket("udp4");
        let serverinfos = {};
        let timeout = setTimeout(() => {
            socket.close();
            resolve( {} );
        }, 500); // 2 Sekunden Timeout

        socket.on("message", (msg, rinfo) => {
             clearTimeout(timeout);

           // console.log(`\nAntwort erhalten von ${rinfo.address}:${rinfo.port} (${msg.length} Bytes)`);           

            let header = msg.readUint32LE(0); //Header
            let offset = 4;
            
            if (header == 0xAD032001) 
            {
                // console.log('Server Response == 0xAD032001 ok')
                let version = msg.readUint32LE(offset); //Header
                offset += 4;
                let protocolversion = msg.readUint32LE(offset); //Header
                offset += 4;
                let token = msg.readUint32LE(offset); //Header
                offset += 4;

                // console.log(header, version, protocolversion, token);

                const secondrequest = Buffer.alloc(16);
                secondrequest.writeUInt32LE(SERVER_QUERY_2, 0); // Long Int 13 for Server Query Packet
                secondrequest.writeUInt32LE(version, 4); // Long Int 13 for Server Query Packet
                secondrequest.writeUInt32LE(protocolversion, 8); // Long Int 13 for Server Query Packet
                secondrequest.writeUInt32LE(token, 12); // Long Int 13 for Server Query Packet
                
                socket.close();
                resolve(secondrequest);
            }
            if (header == 0xAD032002) {
                // console.log('Server 2nd Response == 0xAD032002 OLD VERSION ok');
                
                socket.close();
                resolve(serverinfos);
            }
            if (header == 0xAD032003) {
                // console.log('Server 2nd Response == 0xAD032003 ok');
                
                let version = msg.readUint32LE(offset); //Header
                offset += 4;
                let protocolversion = msg.readUint32LE(offset); //Header
                offset += 4;
                let token = msg.readUint32LE(offset); //Header
                offset += 4;
                let realprotocolversion = msg.readUint32LE(offset); //Header
                offset += 4;
                let serverbuiltrevision = readString(msg, offset);
                offset += serverbuiltrevision.length +1;

                // console.log(serverbuiltrevision);

                let cvarcount = msg.readUInt8(offset);
                offset += 1;

                let cvars = [];
                for (let i = 0; i < cvarcount; i++) {
                    let cvarname = readString(msg, offset);
                    offset += cvarname.length +1;
                    let cvartype = msg.readUInt8(offset);
                    offset += 1;
                    let cvarvalue = -1;
                    if (cvartype == 1) // bool
                        {
                            cvarvalue = msg.readUInt8(offset) != 0;
                            // offset += 1;
                            // crazy! bool offset +=1 weglassen hat die nächste cvar mit fehlendem anfangsbuchstaben gefixt
                        }
                    if (cvartype == 2) 
                        {
                            cvarvalue = msg.readUInt8(offset);
                            offset += 1;
                        }
                    if (cvartype == 3) 
                        {
                            cvarvalue = msg.readUInt16LE(offset);
                            offset += 2;
                        }
                    if (cvartype == 4) 
                        {
                            cvarvalue = msg.readUInt32LE(offset);
                            offset += 4;
                        }
                    if (cvartype == 5 || cvartype == 6) 
                        {
                            cvarvalue = readString(msg, offset);
                            offset += cvarvalue.length +1;
                        }

                    // console.log('cvar: ', cvarname, cvarvalue);
                    cvars.push({name: cvarname, value: cvarvalue})
                }
                // console.log(cvars);
                serverinfos.cvars = cvars;
                
                let p = readHexString(msg, offset);
                let passwordmd5 = Buffer.from(p).toString("hex");                             
                offset += p.length +1;
                // console.log('password hash: ', passwordmd5);
                serverinfos.password = passwordmd5;

                let map = readString(msg, offset);
                offset += map.length +1;
                // console.log(map);
                serverinfos.map = map;

                if (cvars.findIndex(e=>e.name == 'sv_timelimit') != -1)
                {
                    let timeleft = msg.readUInt16LE(offset);
                    offset += 2;
                    // console.log('timeleft: ', timeleft);
                    serverinfos.timeleft = timeleft;
                }

                let teams = [];
                // odamex/common/c_cvarlist.cpp found gametypes
                // only gametypes team deathmatch and CTF have the teams Bytes send back...
                // 0 = Cooperative\n"
                // 1 = Deathmatch\n"
                // 2 = Team Deathmatch\n"
                // 3 = Capture The Flag\n"
                // 4 = Horde\n",
                let gt = cvars.findIndex(e=>e.name == 'sv_gametype');
                if (gt != -1 && (cvars[gt].value == 2 || cvars[gt].value == 3) )
                {
                    let teamcount = msg.readUInt8(offset);
                    offset += 1;
                    // console.log('team count ', teamcount);
                    
                    for (let i = 0; i < teamcount; i++) {
                        let teamname = readString(msg, offset);
                        offset += teamname.length +1;
                        let teamcolor = msg.readUInt32LE(offset);
                        offset += 4;
                        let teamscore = msg.readUInt16LE(offset);
                        offset += 2;
                        // console.log('team: ', teamname, 'color', teamcolor, 'score: ', teamscore);
                        teams.push({teamname, teamcolor, teamscore})
                    }
                    serverinfos.teams = teams;
                }
                

                let patchcount = msg.readUInt8(offset);
                offset += 1;
                // console.log('patchcount:', patchcount);
                let patches = [];
                for (let i = 0; i < patchcount; i++) {
                    let patchname = readString(msg, offset);
                    offset += patchname.length +1;
                    // console.log('patchname: ', patchname);
                    patches.push(patchname);
                }
                serverinfos.patches = patches;


                let wadcount = msg.readUInt8(offset);
                offset += 1;
                // console.log('wadcount:', wadcount);
                let wads = [];
                for (let i = 0; i < wadcount; i++) {
                    let wadname = readString(msg, offset);
                    offset += wadname.length +1;
                    let b = readHexString(msg, offset);
                    // console.log(b.length);
                    //hash in odamex is MD5
                    let hash = Buffer.from(b).toString("hex");                             
                    offset += b.length +1;
                    // console.log('wads: ', wadname, 'hash: ', wadmd5);
                    wads.push({name: wadname, hash})
                }
                serverinfos.wads = wads;

                let playercount = msg.readUInt8(offset);
                offset += 1;
                // console.log('playercount: ', playercount);
                serverinfos.playercount = playercount;

                socket.close();
                resolve(serverinfos);
            } else
            {
                resolve( { } );
            }
                
        });

            // Sende den Buffer (Paket)
            // requestPacket wird angenommen, dass es ein Uint8Array ist (Web API)
        if (requestPacket)
        {
            socket.send(requestPacket, 0, requestPacket.length, PORT, HOST, (err) => {
            if (err) {
                console.error("Fehler beim Senden:", err);
                socket.close();
            } else {
                // console.log(`\nAnfrage an ${MASTER_SERVER}:${MASTER_PORT} gesendet.`);
            }
            });
        }

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


function readHexString(buffer, offset) {
    //Size = N (Unsigned 8bit Integer), read 0 - N 
    let n = buffer.readUInt8(offset);
    // console.log(n);
    
    offset += 1;
    if (n === 0) return '';

    const b = buffer.slice(offset, offset +n); 
    // const buffer = new Uint8Array(b);
    return b;
}

// odamex/common/c_cvarlist.cpp found gametypes
// only gametypes team deathmatch and CTF have the teams Bytes send back...
// 0 = Cooperative\n"
// 1 = Deathmatch\n"
// 2 = Team Deathmatch\n"
// 3 = Capture The Flag\n"
// 4 = Horde\n",
const gametype = [
"Cooperative",
"Deathmatch",
"Team Deathmatch",
"Capture The Flag",
"Horde"
]

async function getServerInfos(HOST, PORT) {
  
    let secondrequestpacket = await getServerInfos1(HOST, PORT);
    // console.log(newrequestpacket);
    let s;
    // wichtige abfrage, manchmal kommt eine leere antwort vom server, 
    // also checke ob newrequestpackage nicht leer sondern ein Uint8Array ist.
    if (secondrequestpacket instanceof Uint8Array)
    {
        s = await getServerInfos1(HOST, PORT, secondrequestpacket);
        if (s.cvars != undefined)
        {
            // console.log(s);
            
            //prepare for ui infos like zandronum
            //ALWAYS use ? to prevent error if .value cant be accessed!
            s.name = s.cvars.find(e=>e.name == 'sv_hostname')?.value;
            //odamex has only one list of all wads. 1. is odamex.wad, 2. is always the iwad, 3. and greater all pwads
            s.iwad = s.wads[1]?.name;
            s.pwads = [];
            for (let i = 2; i < s.wads.length; i++) {
                s.pwads.push(s.wads[i])
            }
            s.numPlayers = s.playercount;
            s.maxPlayers = s.cvars.find(e=>e.name == 'sv_maxplayers')?.value;

            let gt = s.cvars.find(e=>e.name == 'sv_gametype');
            if (gt != undefined)
                s.gamemode = gametype[gt.value];
            else
                s.gamemode = 'coop';        //if no sv_gametype is set it seems to be COOP game

            s.forcePassword = s.password != '';
        }
    }
    return s;
}


async function run() {
    // const HOST = '94.23.249.185';
    // const PORT = 10678;
    // const HOST = '104.128.58.31';
    // const PORT = 10667;  
    // const HOST = '134.209.174.239';
    // const PORT = 10670;    
    let s = await getServerInfos(HOST, PORT);
    console.log(JSON.stringify(s, null, 4));
}    

// run();

module.exports = {getServerInfos}