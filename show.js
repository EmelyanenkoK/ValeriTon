last_time = null;

function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = reject;

    reader.readAsArrayBuffer(file);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function show_browser_not_supported(reason) {
  panel1 = `
   <div id="central_text">
     <h1>Unfortunately we do not support your browser yet. Try Chrome or Firefox.</h1>` +
'    <h3> Issue:' + reason + '</h3>' +
`   </div>
`;
  document.getElementById("screen").innerHTML = panel1;
}

function show_creation() {
  if(!checkBigInt())
    return show_browser_not_supported("BigInt is not supported");
  panel1 = `
   <div id="central_text">
     <h1>This is TON wallet with cryptography on client</h1>
     <h3>That means that all private keys are stored only in your browser. You may save this page and open it from the disk. It only needs server to send messages to TON network.</h3>
     <div > <button class="blue" onclick="silent_creation();">Just create wallet</button> <button class="green" onclick="creation_with_explanation();">Create wallet and describe steps</button> </dib>
   </div>
`;
  document.getElementById("create_wallet_button").classList.add("active");
  document.getElementById("send_wallet_button").classList.remove("active");
  document.getElementById("screen").innerHTML = panel1;
}

function update_status(new_status, update_time = true) {
  document.getElementById("current_action").innerHTML = "Now: " + new_status;
  tm = "";
  if (update_time) {
    msec = Date.now() - last_time;
    if (msec < 100) {
      tm = " " + msec.toString() + "ms";
    } else {
      tm = " " + ((Date.now() - last_time) / 1000).toString() + "sec";
    }
  }
  document.getElementById("log").innerHTML +=
    "<br>" + "<span>" + new_status + tm + "</span>";
  last_time = Date.now();
}

function poke_waiting_status() {
  if(!document.getElementById("current_action").innerHTML)
    return;
  st = document.getElementById("current_action").innerHTML;
  dots = 0;
  for(var i=0; i< st.length; i++){
    if(st[st.length-1-i]=="."){
      dots++;
    } else {
      break;
    }
  }
  if(dots>5) {
    document.getElementById("current_action").innerHTML = st.slice(0, st.length-5);
  } else {
    if(st[st.length-1]!=".") document.getElementById("current_action").innerHTML +=" ";
    document.getElementById("current_action").innerHTML += ".";
  }
    
}

async function silent_creation() {
  panel1 = `
   <h2 id='global_action'>Creating wallet</h2>  
   <h3 id='current_action'></h3>
   <h3 id='additional_placeholder'> </h3>
   <div id='files'></div>
   <div id='log'>
     <span>Starting...</span>
   </div>
`;
  document.getElementById("screen").innerHTML = panel1;
  last_time = Date.now();
  update_status("generating private key", false);
  keyPair = nacl.sign.keyPair();
  priv_key_b64 = bytesToBase64(keyPair.secretKey.slice(0, 32));
  document.getElementById("files").innerHTML =
    '<a href="data:application/octet-stream;charset=utf-16le;base64,' +
    priv_key_b64 +
    '" download="wallet.pk">wallet.pk</a>';
  update_status("keyPair generated", true);
  update_status("building contract code", false);
  contract_data = await wallet_creation_generate_external_message(keyPair);
  contract_address = contract_data[0];
  contract_boc = contract_data[1];
  wc = 0;
  address = contract_address;
  address_b64 = bytesToBase64(
    concat_ui8a(hexToBuffer(address), new Uint8Array([0, 0, 0, wc]))
  );
  document.getElementById("files").innerHTML +=
    '<a href="data:application/octet-stream;charset=utf-16le;base64,' +
    address_b64 +
    '" download="wallet.addr">wallet.addr</a>';
  update_status("contract address: " + contract_address, true);
  update_status("contract code built", true);
  adr_form = await give_non_bouncable(wc + ":" + contract_address);
  update_status(
    "Please request some grams for your address " +
      adr_form +
      " in bot @test_ton_bot"
  );
  explorer_address = 'https://tonwatcher.com/index.html?account='+wc + ":" + contract_address
  document.getElementById("additional_placeholder").innerHTML = "Check address on <a href='"+explorer_address+"' target='_blank'>TonWatcher.com</a> or <a href='http://test.ton.org/testnet' target='_blank'>official explorer</a>";

  i = 0;
  have_money = false;
  while (!have_money) {
    await sleep(2000);
    account = await getaccount(wc + ":" + contract_address);
    if ("meta" in account && "balance" in account["meta"]) have_money = true;
    i++;
    poke_waiting_status();
  }
  update_status("Got money", true);
  document.getElementById("additional_placeholder").innerHTML="";
  update_status("send initialisation bag of cell");
  await sendboc(hexToBuffer(contract_boc));
  update_status("bag of cell is sent");

  document.getElementById("global_action").innerHTML="Wallet was created";
  document.getElementById("current_action").innerHTML =
    "Wait a few seconds and check account " +
    wc +
    ":" +
    contract_address +
    " on <a href='"+explorer_address+"'  target='_blank'>tonwatcher.com</a>";
}

keyPair = null;
contract_data = null;
contract_address = null;
contract_boc = null;
wc = null;
async function show_step(step_num) {
  steps = [
    [
      "Private key generation",
      "First we generate private key, you may download it below",
      true
    ],
    [
      "Building contract code",
      "Unlike ethereum or btc private or public key doesn't determine contract address. Instead address depends on code and initial data of contract. Download file with address below",
      true
    ],
    [
      "Requesting money",
      "Like in EOS and unlike ethereum or btc, addresses are not ready to be a wallet by default. Instead you need initialise address with wallet code and to make this operation you need to pay a fee. Please request some money for your address in bot @test_ton_bot",
      true
    ],
    [
      "Contract initialisation",
      "Now we uploading code for wallet contract to TON blockchain",
      true
    ],
    [
      "Waiting for initialisation",
      "TON validators process our message and it should be included in next blocks (a few seconds)",
      true
    ],
    [
      "Congratulations!",
      "You have initalised wallet. Now try to send grams.",
      true
    ]
  ];
  document.getElementById("current_action").innerHTML = steps[step_num][0];
  document.getElementById("explanation").innerHTML = steps[step_num][1];
  document.getElementById("next_step").onclick = function() {
    show_step(step_num + 1);
  };
  if (step_num == 0) {
    keyPair = nacl.sign.keyPair();
    priv_key_b64 = bytesToBase64(keyPair.secretKey.slice(0, 32));
    document.getElementById("files").innerHTML =
      '<a href="data:application/octet-stream;charset=utf-16le;base64,' +
      priv_key_b64 +
      '" download="wallet.pk">wallet.pk</a>';
  }
  if (step_num == 1) {
    contract_data = await wallet_creation_generate_external_message(keyPair);
    contract_address = contract_data[0];
    contract_boc = contract_data[1];
    wc = 0;
    address = contract_address;
    address_b64 = bytesToBase64(
      concat_ui8a(hexToBuffer(address), new Uint8Array([0, 0, 0, wc]))
    );
    document.getElementById("files").innerHTML +=
      '<a href="data:application/octet-stream;charset=utf-16le;base64,' +
      address_b64 +
      '" download="wallet.addr">wallet.addr</a>';
  }
  if (step_num == 2) {
    adr_form = await give_non_bouncable(wc + ":" + contract_address);
    document.getElementById("explanation").innerHTML =
      "Like in EOS and unlike ethereum or btc, addresses are not ready to be a wallet by default. Instead you need initialise address with wallet code and to make this operation you need to pay a fee. Please request some money for your address " +
      adr_form +
      " in bot @test_ton_bot. As soon as money come you will be able to continue";
    document.getElementById("next_step").style.display = "none";
    explorer_address = 'https://tonwatcher.com/index.html?account='+wc + ":" + contract_address;
    document.getElementById("additional_placeholder").innerHTML = "Check address on <a href='"+explorer_address+"' target='_blank'>TonWatcher.com</a> or <a href='http://test.ton.org/testnet' target='_blank'>official explorer</a>";

    i = 0;
    have_money = false;
    while (!have_money) {
      await sleep(2000);
      account = await getaccount(wc + ":" + contract_address);
      if ("meta" in account && "balance" in account["meta"]) have_money = true;
      i++;
      poke_waiting_status();
    }
    document.getElementById("explanation").innerHTML = "We get grams";
    document.getElementById("next_step").style.display = "";
  }
  if (step_num == 3) {
    await sendboc(hexToBuffer(contract_boc));
  }
  if (step_num == 4) {
    document.getElementById("next_step").style.display = "none";
    have_seq_no = false;
    while (!have_seq_no) {
      await sleep(1000);
      account = await getaccount(wc + ":" + contract_address);
      if ("meta" in account && "seq_no" in account["meta"]) have_seq_no = true;
      i++;
      poke_waiting_status();
    }
    document.getElementById("next_step").style.display = "";
  }
  if (step_num == 5) {
    document.getElementById("next_step").onclick = function() {
      show_sending();
    };
    explorer_address = 'https://tonwatcher.com/index.html?account='+wc + ":" + contract_address
    document.getElementById("additional_placeholder").innerHTML = "Check address on <a href='"+explorer_address+"' target='_blank'>TonWatcher.com</a> or <a href='http://test.ton.org/testnet' target='_blank'>official explorer</a>";

    document.getElementById("next_step").innerHTML = "Send grams";
    document.getElementById("next_step").classList.remove("green");
    document.getElementById("next_step").classList.add("blue");
  }
}

function creation_with_explanation() {
  panel1 = `
   <h1 id='current_action'>Creating wallet</h1>  
   <h2 id='explanation'></h2>
   <h3 id='additional_placeholder'> </h3>
   <div id='files'></div>
   <button id="next_step" class='green' onclick='show_step(0);'>Next step</button>
`;
  document.getElementById("screen").innerHTML = panel1;
  show_step(0);
}

//================================Sending======================

function show_sending() {
  if(!checkBigInt())
    return show_browser_not_supported("BigInt is not supported");
  panel1 = `
   <div id="central_text">
     <h1>Send grams</h1>
     <h3>Insert account address in any format. Note if address is given in hex format it should contain chain index.</h3>
     <h3>Your private key will not be uploaded somewhere and will sit only inside browser.</h3>
     <form id="send_form">
       Private key: <input type="file" id="private_key_file"><br>
       Your <strong>wallet.addr</strong> (optional if standard wallet is used): <input type="file" id="address_key_file"><br>
       Address: <input type="text" placeholder="Address"  id="address" size="50" minLength="48"><br>
       Amount: <input type="number" step="0.000000001"  id="amount" min="1e-9"><br>
       Optional comment: <input type="text" id="transfer_comment" maxLength="32" size="50"><br>
       <input type="submit" value="Send" onclick="send()" class="button">
     </form>
   </div>
`;
  document.getElementById("create_wallet_button").classList.remove("active");
  document.getElementById("send_wallet_button").classList.add("active");
  document.getElementById("screen").innerHTML = panel1;

  document
    .getElementById("send_form")
    .addEventListener("submit", function(event) {
      event.preventDefault();
    });
}

function show_error(error) {
  if (!document.getElementById("central_text")) {
    show_sending();
  }
  document.getElementById("central_text").innerHTML =
    "<span class='error'>Error: " +
    error +
    "</span><br>" +
    document.getElementById("central_text").innerHTML;
}

async function send() {
  private_key_files = document.getElementById("private_key_file").files;
  addr_key_files = document.getElementById("address_key_file").files;
  address = document.getElementById("address").value;
  amount = document.getElementById("amount").value;
  var transfer_comment = document.getElementById("transfer_comment").value;
  addr = false;
  if (!private_key_files.length) {
    return show_error("Private key file is required");
  }
  private_key = await readFileAsync(private_key_files[0]);
  private_key = new Uint8Array(private_key);
  if (private_key.length != 32)
    return show_error("Unknown format of private key");
  if (addr_key_files.length) {
    addr = await readFileAsync(addr_key_files[0]);
    addr = new Uint8Array(addr);
    console.log(addr);
    if (addr.length != 36)
      return show_error("Unknown format of account address");
  }
  keyPair = nacl.sign.keyPair.fromSeed(private_key);
  panel1 = `
   <h2>Creating wallet</h2>  
   <h3 id='current_action'></h3>
   <div id='files'></div>
   <div id='log'>
     <span>Starting...</span>
   </div>
`;
  document.getElementById("screen").innerHTML = panel1;
  last_time = Date.now();
  if (!addr) {
    update_status("Calculating address", false);
    a = await wallet_creation_generate_external_message(keyPair);
    console.log(a, "Should be address");
    hex_addr = a[0];
    wc = "0";
    update_status("Address found " + wc + ":" + hex_addr);
  } else {
    hex_addr = bufferToHex2(addr.slice(0, 32));
    wc = 0;
    if (bufferToHex2(addr.slice(32, 36)) != "00000000")
      return show_error(
        "As for now, service works only with basechain (chainindex 0). Sorry for inconvenience"
      );
  }
  update_status("Detecting seq_no");
  account = await getaccount(wc + ":" + hex_addr);
  seq_no = parseInt(account["meta"]["seq_no"]);
  update_status("Seq_no detected: " + seq_no, false);
  update_status("Generating bag of cells");
  boc = await wallet_send_generate_external_message(
    keyPair,
    address,
    amount,
    seq_no,
    transfer_comment
  );
  update_status("Bag of cells generated", false);
  update_status("Sending bag of cells");
  await sendboc(hexToBuffer(boc));
  console.log(boc);
  update_status("Bag of cells sent");
  document.getElementById("files").innerHTML =
    '<button id="next_step" class="green" onclick="show_sending()">Send again</button>';
}

