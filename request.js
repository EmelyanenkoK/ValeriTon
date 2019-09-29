    jsrpc = function(method, params) {


        $.ajax({
            url : "https://toncenter.com/api/test/v1",
            type : 'POST',
            data : {
                "jsonrpc" : "2.0",
                "method" : method,
                "id" : "1",
                "params": params
            },
            dataType : "json",
            success : function(result) {
                console.log(result)
                }
            });
    };

jsrpc('time',[]);



function request(method, params, callback) {
  var xrq = new XMLHttpRequest();
  xrq.onreadystatechange = function() { 
    if (xrq.readyState==4 && xrq.status==200) {
      callback(JSON.parse(xrq.responseText)['result']);
    }
    else { 
      if (xrq.readyState==0 && xrq.status==4){
           console.log('error')
      }
   }
        
  }
  api = "https://toncenter.com/api/test/v1";
  xrq.open("POST", api, true);
  var request = {"id":1, "jsonrpc": "2.0", "method":method,"params":params};
  xrq.setRequestHeader("content-type","application/json");
  xrq.send(JSON.stringify(request)); 
}

f = function(x) {console.log(x);}
request('time',[], f);
