// server.js
// where your node app starts

// database_uri = ""

require('dotenv').config();
// init project
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
var port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
const shortid = require('shortid');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + '/views/timestamp.html');
});

app.get("/requestHeaderParser", function (req, res) {
  res.sendFile(__dirname + '/views/requestHeaderParser.html');
});

app.get("/urlShortener", function (req, res) {
  res.sendFile(__dirname + '/views/urlShortener.html');
});

// first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// Header Request
app.get("/api/whoami", function (req, res) {
  res.json({
    // "values" : req.headers,
    "ipaddress" : req.ip, 
    "language" : req.headers["accept-language"],
    "software" : req.headers['user-agent']
  });
});

// URL SHORTENING SERVICE

// Build a schema and model to store saved URLS
// const ShortUrl = mongoose.model('ShortUrl', new Schema({
//   shortUrl: String,
//   original_url: String,
//   suffix: String
// }));
// create application/json parser
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
var jsonParser = bodyParser.json()

app.post("/api/shorturl", function (req, res) {
  console.log(process.env.SECRET_KEY);
  console.log(database_uri);
  let client_requested_url = req.body.url
  let suffix = shortid.generate()
  console.log(suffix, " <= this will be our suffix")

  // let newURL = new ShortUrl({
  //   shortUrl: __dirname + "/api/shorturl/" + suffix,
  //   original_url: client_requested_url,
  //   suffix: suffix
  // })

  res.json({
    "short url": 'here we need a shortened URL',
    "original_URL": client_requested_url
  });
});


// Date Functions 
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
