service_name = "ValeriTon";
function request_promise(method, params) {
  api_url = "https://toncenter.com/api/test/v1";
  var request = { id: 1, jsonrpc: "2.0", method: method, params: params };

  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", api_url, true);

    xhr.onload = function() {
      if (this.status == 200) {
        r = JSON.parse(this.responseText);
        if ("error" in r) {
          reject(r["error"]);
        }
        resolve(r["result"]);
      } else {
        var error = new Error(this.statusText);
        error.code = this.status;
        reject(error);
      }
    };

    xhr.onerror = function() {
      reject(new Error("Network Error"));
    };
    xhr.setRequestHeader("content-type", "application/json");
    xhr.send(JSON.stringify(request));
  });
}

function request(method, params, callback, error_callback = false) {
  var xrq = new XMLHttpRequest();
  xrq.onreadystatechange = function() {
    if (xrq.readyState == 4 && xrq.status == 200) {
      r = JSON.parse(xrq.responseText);
      if ("error" in r) {
        error_callback();
      }
      callback(r["result"]);
    } else {
      if (xrq.readyState == 0 && xrq.status == 4) {
        console.log("error");
      } else {
        if (xrq.status == 400 && error_callback) {
          error_callback();
        }
      }
    }
  };
  api = "https://toncenter.com/api/test/v1";
  xrq.open("POST", api, true);
  var request = { id: 1, jsonrpc: "2.0", method: method, params: params };
  xrq.setRequestHeader("content-type", "application/json");
  xrq.send(JSON.stringify(request));
}

const base64abc = (() => {
  let abc = [],
    A = "A".charCodeAt(0),
    a = "a".charCodeAt(0),
    n = "0".charCodeAt(0);
  for (let i = 0; i < 26; ++i) {
    abc.push(String.fromCharCode(A + i));
  }
  for (let i = 0; i < 26; ++i) {
    abc.push(String.fromCharCode(a + i));
  }
  for (let i = 0; i < 10; ++i) {
    abc.push(String.fromCharCode(n + i));
  }
  abc.push("+");
  abc.push("/");
  return abc;
})();

function bytesToBase64(bytes) {
  let result = "",
    i,
    l = bytes.length;
  for (i = 2; i < l; i += 3) {
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[((bytes[i - 1] & 0x0f) << 2) | (bytes[i] >> 6)];
    result += base64abc[bytes[i] & 0x3f];
  }
  if (i === l + 1) {
    // 1 octet missing
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[(bytes[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === l) {
    // 2 octets missing
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[(bytes[i - 1] & 0x0f) << 2];
    result += "=";
  }
  return result;
}

function sendboc(ui8arr) {
  return request_promise("sendboc", [bytesToBase64(ui8arr)]);
}
function give_non_bouncable(address) {
  return request_promise("getaccountforms", [address]).then(address_forms => {
    return address_forms["non-bounceable"]["b64"];
  });
}

function parse_addr(address) {
  return request_promise("getaccountforms", [address]).then(address_forms => {
    var bounce = true; //default regime
    if (address_forms["given_type"].search("non_bounceable") >= 0) {
      bounce = false;
    }
    var wc = address_forms["raw_form"].split(":")[0];
    var hex_addr = address_forms["raw_form"].split(":")[1];
    return [wc, hex_addr, bounce];
  });
}

function getaccount(address) {
  return request_promise("getaccount", [address]);
}

function checkBigInt() {
  return true;
}
