const speedTest = require('speedtest-net');
const SambaClient = require('samba-client');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
let fs = require('fs')
let CronJob = require('cron').CronJob;
let express = require('express');
let app = express();
let ping = require('ping');
let config = {
  //serverId: 38096, //RECOMENDED: don't let speedtest choose the server for you :)
  acceptLicense: true,
  acceptGdpr: true
};

app.get('/doTests', function (req, res) {
  console.log("Received command to do Tests");
  doTests();
  res.end("Tests Launched");
})

let client = new SambaClient({
  address: '\\\\IPADDRESS\\config',
  username: 'homeassistantusername',
  password: 'homeassistantpassword'
});

async function doTests() {
  try {
    let speedResult = await speedTest(config);
    ping.promise.probe('8.8.8.8', {
      min_reply: '10'
    })
      .then(async function (res) {
        speedResult.pingGoogleMin = res.min;
        speedResult.pingGoogleMax = res.max;
        speedResult.pingGoogleAvg = res.avg;
        fs.writeFileSync('speedtest.json', JSON.stringify(speedResult));
        await client.sendFile('speedtest.json', 'www/speedtest.json');
        fs.unlinkSync('speedtest.json');
        const cmd = 'wget ' + speedResult.result.url + ".png" + ' -O speedtest.png';
        const { stdout, stderr } = await exec(cmd, { shell: true });
        if (stderr) {
          console.error(`error: ${stderr}`);
        }
        console.log(`${stdout}`);
        await client.sendFile('speedtest.png', 'www/images/speedtest.png');
        fs.unlinkSync('speedtest.png');

      });
  } catch (err) {
    console.log(err.message);
  }
}

let job = new CronJob('0 0 */1 * * *', function () {
  (async () => {
    try {
      let speedResult = await speedTest(config);
      ping.promise.probe('8.8.8.8', {
        min_reply: '10'
      })
        .then(async function (res) {
          speedResult.pingGoogleMin = res.min;
          speedResult.pingGoogleMax = res.max;
          speedResult.pingGoogleAvg = res.avg;
          fs.writeFileSync('speedtest.json', JSON.stringify(speedResult));
          await client.sendFile('speedtest.json', 'www/speedtest.json');
          fs.unlinkSync('speedtest.json');
          const cmd = 'wget ' + speedResult.result.url + ".png" + ' -O speedtest.png';
          const { stdout, stderr } = await exec(cmd, { shell: true });
          if (stderr) {
            console.error(`error: ${stderr}`);
          }
          console.log(`${stdout}`);
          await client.sendFile('speedtest.png', 'www/images/speedtest.png');
          fs.unlinkSync('speedtest.png');
        });
    } catch (err) {
      console.log(err.message);
    }
  })();
}, null, true, 'Europe/Rome');
job.start();

let server = app.listen(8000, '0.0.0.0', function () {
  console.log("SpeedTest app listening")
})

