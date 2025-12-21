const dgram = require("dgram");
const huffman = require("./huffman").create();


function readFloat() {
    let v = readBuffer.readFloatLE(readOffset);
    readOffset += 4;
    return v;
}

function readString(buffer, offset) {
    if (buffer.readUInt8(offset) == 0) {
        return '';
    }

    let i = offset;
    while (buffer.readUInt8(i++) != 0); i--;
    let str = buffer.toString('ascii', offset, i);
    offset += str.length + 1;
    return str;
}


const SERVER_LAUNCHER_CHALLENGE = 5660023;    //für Anfragepaket eines individuellen Servers mit bekannter IP:PORT Adresse

const SERVER_LAUNCHER_IGNORING = 5660024;
const SERVER_LAUNCHER_BANNED = 5660025;


// normal Server Flags
const SQF_NAME	        = 0x00000001    //The name of the server
const SQF_MAXPLAYERS    =	0x00000020	  //Maximum amount of players who can join the game (the rest must spectate)
const SQF_PWADS	        = 0x00000040	  //PWADs loaded by the server
const SQF_GAMETYPE      = 0x00000080;
const SQF_IWAD          = 0x00000200    //IWAD used by the server
const SQF_FORCEPASSWORD = 0x00000400;
const SQF_FORCEJOINPASSWORD = 0x00000800; //Server requires a password to join
const SQF_NUMPLAYERS    = 0x00080000    //Current number of players on the server
const SQF_EXTENDED_INFO	= 0x80000000	  //Additional server information, has to be set that extended info fields are sent. (like country code)
//extended server flags
const SQF2_PWAD_HASHES  = 0x00000001;
const SQF2_COUNTRY	    = 0x00000002	  //The server's ISO 3166-1 alpha-3 country code.

const FLAGS = (SQF_NAME | SQF_MAXPLAYERS | SQF_PWADS | SQF_GAMETYPE | SQF_IWAD | SQF_FORCEPASSWORD | SQF_FORCEJOINPASSWORD | SQF_NUMPLAYERS | SQF_EXTENDED_INFO);
const FLAGS2 = (SQF2_PWAD_HASHES | SQF2_COUNTRY);



//---- Anfragepaket für Server Info Flags (Little Endian + 0xFF Präfix)
function createRequestperServerInfo() {
  const requestb = Buffer.alloc(17);
  // request.writeUInt8(0xFF, 0);                        // Präfix, falls Anfrage nicht Huffman kodiert wird
  let offset = 0;
  offset = requestb.writeInt32LE(199, 0);           // long (32-bit)
  offset = requestb.writeInt32LE(FLAGS, offset);    // long (32-bit)
  offset = requestb.writeInt32LE(0, offset);        // Time, long (32-bit)
  offset = requestb.writeInt32LE(FLAGS2, offset);   // Flags2, long (32-bit)
  offset = requestb.writeInt8(0, offset);           // segmented == 2?, long (32-bit)

  return requestb;
}
//--------------------------------------



function waitForGameServerAnswer(IP, PORT) {
  return new Promise((resolve) => {
    let socket2 = dgram.createSocket("udp4");

    let timeout = setTimeout(() => {
      if (socket2.listenerCount('message')) socket2.close();
      resolve( [] );
    }, 500);   

    socket2.on("message", (msg, rinfo) => {

      // console.log(`Antwort von ${rinfo.address}:${rinfo.port} (${msg.length} Bytes)`);
      let data = huffman.decode(msg);   

      clearTimeout(timeout);
      socket2.close();

      resolve( handlePacketServerFlags(data, rinfo) );
    });

    const request = huffman.encode(createRequestperServerInfo());               // Huffman kodieren der Anfrage
    socket2.send(request, 0, request.length, PORT, IP, (err) => {
      if (err) {
        console.error("Fehler beim Senden:", err);
        socket.close();
      } else {
        // console.log(`Anfrage an ${IP}:${PORT} gesendet.`);
      }
    });

    socket2.on("error", (err) => {
      console.error("Fehler:", err);
      resolve( [] );
    });
  });
}



function handlePacketServerFlags(buffer, rinfo) {

    const response = buffer.readUInt32LE(0);

    switch (response) {
        case SERVER_LAUNCHER_CHALLENGE: {
            return parseResponseServerFlags(buffer);
            break;
        }
        case SERVER_LAUNCHER_BANNED: {
            console.log('banned from server');
            break;
        }
        case SERVER_LAUNCHER_IGNORING: {
            console.log('ignored from server: ', rinfo.address);
            break;
        }
    }
}

function parseResponseServerFlags(buffer) {
    let offset = 4;
    let answer = {};
    const time = buffer.readUInt32LE(offset);
    offset += 4;
    const version = readString(buffer, offset);
    offset += version.length +1;

    let flags = 0;
    let flags2 = 0;
    // console.log('Zandronum ' + version + ' Server');
    answer.version = version;

    flags = buffer.readUInt32LE(offset);  // read the first standard flags
    offset += 4; 

    if (flags & SQF_NAME) {
        let name = readString(buffer, offset);
        offset += name.length +1;
        // console.log('Name: %s', name);
        answer.name = name;
    }

    if (flags & SQF_MAXPLAYERS) {
        let maxPlayers = buffer.readUInt8(offset);
        offset +=1;
        // console.log('Max players: %d', maxPlayers);
        answer.maxPlayers = maxPlayers;
    }

    if (flags & SQF_PWADS) {
      let numWads = buffer.readUInt8(offset);
      offset +=1;
      let list = [];
      for (let i = 0; i < numWads; i++) {
          let name = readString(buffer, offset);
          offset += name.length +1;
          list.push({name, hash: 0});
      }
      // console.log('%d PWAD names: %s', numWads, list.join(', '));
      answer.pwads = list;
    }
    const gamemodenames = [
      "COOPERATIVE", "SURVIVAL", "INVASION", "DEATHMATCH", "TEAMPLAY", "DUEL", "TERMINATOR",
      "LASTMANSTANDING", "TEAMLMS", "POSSESSION", "TEAMPOSSESSION", "TEAMGAME", "CTF",
      "ONEFLAGCTF", "SKULLTAG", "DOMINATION"
    ]
    if (flags & SQF_GAMETYPE) {
        let gamemode = buffer.readUInt8(offset);
        offset +=1;
        // let instagib = buffer.readUInt8(offset) != 0;
        offset +=1;
        // let buckshot = buffer.readUInt8(offset) != 0;
        offset +=1;
        if (gamemode >= 0 && gamemode <= gamemodenames.length-1)
          answer.gamemode = gamemodenames[gamemode];
    }

    if (flags & SQF_IWAD) {
        let iwad = readString(buffer, offset);
        offset += iwad.length +1;
        // console.log('IWAD: %s', iwad);
        answer.iwad = iwad;
    }

    if (flags & SQF_FORCEPASSWORD) {
        let forcePassword = buffer.readUInt8(offset) != 0;
        offset +=1;
        // console.log('Join password enforced: %s', forcePassword);
        answer.forcePassword = forcePassword;
    }
    if (flags & SQF_FORCEJOINPASSWORD) {
        let forcePassword = buffer.readUInt8(offset) != 0;
        offset +=1;
        // console.log('Join password enforced: %s', forcePassword);
        answer.forceJoinPassword = forcePassword;
    }

    if (flags & SQF_NUMPLAYERS) {
        numPlayers = buffer.readUInt8(offset);
        offset +=1;
        // console.log("%d players", numPlayers);
        answer.numPlayers = numPlayers;
    }

    //very important to readLong() again to get flag2 here for extended info
    if (flags & SQF_EXTENDED_INFO) {
        // console.log("Extended info");
        flags2 = buffer.readUInt32LE(offset);
        offset += 4;
    }
    
    // read all extended flags here

    if (flags2 & SQF2_PWAD_HASHES) {
        let numHashes = buffer.readUInt8(offset);
        offset +=1;

        for (let i = 0; i < numHashes; i++) {
            let hash = readString(buffer, offset);
            offset += hash.length +1;
            if (i < answer.pwads.length) {
                answer.pwads[i].hash = hash;
            }
        }
    }

    if (flags2 & SQF2_COUNTRY) {
        let code = String.fromCharCode(buffer.readUInt8(offset)) + 
                  String.fromCharCode(buffer.readUInt8(offset+1)) + 
                  String.fromCharCode(buffer.readUInt8(offset+2));
        offset += 3;

        if (code == 'XIP') 
          { 
            // console.log('Use IP Geolocation, no ISO 3166-1 alpha-3 country code'); 
          }
        else if (code == 'XUN') 
          { 
            // log('Unknown country'); 
          }
        else {
            // iso 3166-1 country code can be used here
            // console.log(code);
            
        }
        answer.country = code;
    }
    return answer;
}

async function getServerInfos(ip, port) {
    let info = await waitForGameServerAnswer(ip, port);
    // console.log(info);
    return info;
}


// getServerInfos('109.204.187.108', 10666)



module.exports = {getServerInfos}