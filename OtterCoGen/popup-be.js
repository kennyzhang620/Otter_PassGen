function sendPacket(url, type, data_main, asyncV = false, callback = null, failure = null, TIMEOUT = 3000) {
    var txtFile = new XMLHttpRequest();
    txtFile.open(type, url, asyncV);

    txtFile.setRequestHeader("Accept", "application/json");
    txtFile.setRequestHeader("Content-Type", "application/json");
    txtFile.timeout = TIMEOUT;
    txtFile.onload = function (e) {
        if (txtFile.readyState === 4) {
            if (txtFile.status === 200) {
                var csvData = txtFile.responseText;
                // console.log(csvData, "<<<<");
                //   console.log(csvData)

                if (callback != null) {
                    callback(csvData)
                }

            }
            else {
                //    console.log("--->>>", txtFile.statusText);
                if (failure != null) {
                    failure(txtFile.statusText)
                }
            }
        }
    };

    txtFile.ontimeout = function (e) {
        console.error("Connection timed out. Please refresh the page and try again.");

        if (failure != null) {
            failure(txtFile.statusText)
        }
    }

    txtFile.onerror = function (e) {
        console.error("An error has occurred. Please refresh the page and try again.");
        console.error(txtFile.statusText);

        if (failure != null) {
            failure(txtFile.statusText)
        }
    };

    txtFile.send(JSON.stringify(data_main));
}

async function sendTo() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    console.log(tab.url);

    const b1 = tab.url ? tab.url.split('/')[2] : document.getElementById("base").value.split('/')[2]
    const data = { "num": document.getElementById("n1").checked, "symbols": document.getElementById("s1").checked, "address": document.getElementById("addr").value, "base": Sha256.hash(b1), "salt": Sha256.hash(document.getElementById("salt").value), "hash": Sha256.hash(Math.floor(Date.now() / (1000 * 3)).toString()) };

    console.log(data)

    document.getElementById("FQDN").innerHTML = b1

    sendPacket("http://127.0.0.1:4865/", "POST", data, true, function (res) {
        document.getElementById("solution").value = res
        sol.type = "password"

        if (res.length > 43) {
            document.getElementById("solution").value = "INVALID ADDRESS";
            sol.type = "text"
        }
    }, function () {
        document.getElementById("solution").value = "GENERATOR NOT FOUND";
        sol.type = "text"
    }, 1000)
}

var link = document.getElementById('salt');
// onClick's logic below:
link.addEventListener('keypress', async function () {
    sendTo();
});

link.addEventListener('mouseenter', async function () {
    link.type = "text"
});

link.addEventListener('mouseleave', async function () {
    link.type = "password"
});

document.getElementById("n1").addEventListener('click', async function () {
    sendTo();
});

document.getElementById("s1").addEventListener('click', async function () {
    sendTo();
});

var sol = document.getElementById('solution');
var sol2 = document.getElementById('sol2');
var sol3 = document.getElementById('sol3');
// onClick's logic below:
sol.addEventListener('click', async function () {
    navigator.clipboard.writeText(sol.value);
    sendPacket("http://127.0.0.1:4865/res-d", "GET", null, true, null, null, 1000)
});

sol2.addEventListener('click', async function () {
    navigator.clipboard.writeText(sol.value);
    sendPacket("http://127.0.0.1:4865/res-d", "GET", null, true, null, null, 1000)
});

document.addEventListener('visibilitychange', function res() {
    sendPacket("http://127.0.0.1:4865/res-d", "GET", null, true, null, null, 1000)
}, false);

var dataN = null;
var cbS = null;

var to = 0;

sol3.addEventListener('click', async function () {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    console.log(tab.url);

    const b1 = tab.url ? tab.url.split('/')[2] : document.getElementById("base").value.split('/')[2]
    const data = { "num": document.getElementById("n1").checked, "symbols": document.getElementById("s1").checked, "address": document.getElementById("addr").value, "base": Sha256.hash(b1), "salt": Sha256.hash(document.getElementById("salt").value), "hash": Sha256.hash(Math.floor(Date.now() / (1000 * 3)).toString()) };

    document.getElementById("FQDN").innerHTML = b1
    sendPacket("http://127.0.0.1:4865/pre-a", "POST", data, true, function (res) {

        if (res == "SUCCESS") {
            dataN = window.open('http://localhost:4865/auth', "_blank", 'popup')
            cbS = setInterval(function a() {

                if (to > 30) {
                    clearInterval(cbS)
                    to = 0;
                }

                sendPacket("http://127.0.0.1:4865/res-p", "GET", null, true, function results(res) {
                    if (res != "undefined") {
                        sol.value = res
                        link.value = Sha256.hash(res);
                        clearInterval(cbS)
                    }

                }, null, 1000)

                to++;
            }, 1000)
        }
    }, function () {}, 1000)
    

});

sol.addEventListener('mouseenter', async function () {
    sol.type = "text"
});

sol.addEventListener('mouseleave', async function () {
    sol.type = "password"
});
