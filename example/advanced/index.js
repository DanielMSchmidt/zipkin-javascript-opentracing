const path = require('path');
const childProc = require('child_process');

childProc.fork(path.join(__dirname, 'client.js'));
childProc.fork(path.join(__dirname, 'server.js'));
