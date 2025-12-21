const {getServerListFromMaster} = require("./getServerlistZandronum.js");
const {getServerInfos} = require("./getServerInfosZandronum.js");

let servers = [];
let serversfinished = [];
let sum = 0;
let refreshing = 0;

//serversfinished is for external use and only holds the fully finished servers list.
// if we use servers then the external program only gets the actual queried servers
function getServers() {
    //return actual servers beeing refreshed
    return servers;
}


async function refreshServers() {
    if (refreshing) return; // do not refresh if its already queriing all servers
    servers = await getServerListFromMaster();
    if (servers.length == 0) return;    //was an error when getting masterserver then [] is send back
    refreshing = 1;
    sum = 0;
    // 50 parallel emits
    let emits = 50;
    if (servers.length < emits) {
        emits = servers.length;
    }
    let i = Math.floor(servers.length/emits);
    // console.log('servers max ', servers.length, ' ', i, ' ', i*emits, ' rest ', servers.length - i*emits);
    
    //emit all 50 at once 
    for (let a = 0; a < emits; a++) {
        myEmitter.emit('send', servers.slice(i*a, i*a+i));
        // console.log(i*a, i*a +i);
        
    }
    // emit the rest servers that dont fit into the for loop
    myEmitter.emit('send', servers.slice(i*(emits), servers.length));
    // console.log(i*emits, servers.length);

}


const EventEmitter = require('node:events');

const myEmitter = new EventEmitter();

myEmitter.on('send', async (data) => {
    // sum += data.length;
    for (let i=0; i < data.length; i++) {
        // console.log(`\nHole Infos von Server ${data[i].ip}:${data[i].port}...`);
        const info = await getServerInfos(data[i].ip, data[i].port);
        //because data is the servers variable object, we can use data.info to effect the original servers var also.
        data[i].info = info;
        sum +=1;
        // if (i == data.length-1) sum += i+1;
        // console.log('sum: ', sum,  ' von: ', servers.length);

        if (sum == servers.length) {
            let withanswer = servers.filter(e=>e.info?.name != undefined);
            console.log('\nfinished refreshing servers total:', servers.length, ' with answer: ', withanswer.length);
            // serversfinished = servers;
            servers.push({finished : 1});       //tag the last array entry with object finished: 1 so the UI knows refreshing is finished
            console.log(servers[servers.length-1]);
            
            //after all servers are refreshed allow after 5 secs refresh again
            setTimeout(() => {
                refreshing = 0;
            }, 20000);
            
        }
    }
//   console.log(JSON.stringify(data, null, 4));
});

module.exports = {getServers, refreshServers}