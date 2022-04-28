// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


// date functions 
let responseObject = {};

// if api url is blank returns current date/time
app.get('/api', function (req, res) {
  responseObject['unix'] = new Date().getTime();
  responseObject['utc'] = new Date().toUTCString()
  res.json(responseObject);
})

app.get("/api/:date?", function (req, res) {
  //note that this input{date} is a string
  let {date} = req.params
  if (date.includes('-')|| date.includes(' ')) {
    responseObject['unix'] = new Date(date).getTime();
    responseObject['utc'] = new Date(date).toUTCString()
  } else {
        date = parseInt(date)
        
        responseObject['unix'] = new Date(date).getTime();
        responseObject['utc'] = new Date(date).toUTCString()
        } 
  
  if (!responseObject['unix'] || !responseObject['utc']) {
    res.json({error : "Invalid Date"} );
  }
  
  res.json(responseObject);
});


// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
