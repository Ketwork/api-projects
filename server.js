// server.js

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
const { response } = require('express');
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

app.get("/exercise-tracker", function (req, res) {
  res.sendFile(__dirname + '/views/exercise-tracker.html');
});

// first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// Request Header Parser Microservice
app.get("/api/whoami", function (req, res) {
  res.json({
    // "values" : req.headers,
    "ipaddress" : req.ip, 
    "language" : req.headers["accept-language"],
    "software" : req.headers['user-agent']
  });
});


// <--- URL Shortener Microservice --->

/* Create URL Model */
let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: { type: Number },
});

let Url = mongoose.model("Url", urlSchema);

// URL entered will be assigned a short URL and stored in database
app.post('/api/shorturl', bodyParser.urlencoded({ extended: false }) , (request, response) => {
    let inputUrl = request.body['url']

    // regular expression to match valid URLs
    let urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi);
    
    // if URL doesn't match regex send error response and return here to stop rest of function
    if (!inputUrl.match(urlRegex)) {
      response.json({error: "invalid url"});
      return
    }
  
    responseObject["original_url"] = inputUrl;

    let inputShort = 1;
  
    //Find the highest short value and sets new short value one higher
    Url.findOne({})
      .sort({short: 'desc'})
        .exec((error, result) => {
          if(!error && result != undefined){
            inputShort = result.short + 1
          }
          if (!error) {
            Url.findOneAndUpdate(
                // if original url exists it will be kept and short url is updated
                {original: inputUrl},
                {original: inputUrl, short: inputShort},
                // if it doesn't exist it will be created (upsert: true)
                {new: true, upsert: true },
                (error, savedUrl)=> {
                  if(!error){
                    responseObject['short_url'] = savedUrl.short
                    response.json(responseObject)
                  }
                }
            )
          }
        
      });
  });

// when short URL is entered on the end of the URL route it will redirect to stored address.
app.get("/api/shorturl/:input", (request, response) => {
  let input = request.params.input
  
  Url.findOne({short:input}, (error, result) => {
    if (!error && result != undefined) {
      response.redirect(result.original)
    } else {
      response.json('URL not found')
    }
  })
})
// <--- /URL Shortener Microservice END --->


// <--- Exercise Tracker --->

let exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
});

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

// models
let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)

app.post('/api/users', bodyParser.urlencoded({ extended: false }) , (request, response) => {
  // mongoose generates id for us
  let newUser = new User({username: request.body.username})
  // save to database
  newUser.save((error, savedUser) => {
    if(!error){
      let responseObject = {}
      responseObject['username'] = savedUser.username
      responseObject['_id'] = savedUser.id
      response.json(responseObject)
    }
  })
})

// Show All Users
app.get("/api/users", (req, res) => {

  User.find({}, (error, arrayOfUsers) => {
    if(!error) {
      res.json(arrayOfUsers)
    }
  });
});

// Add Exercises
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (request, response) => {

  let newSession = new Session({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  })

  // if no date is input 
  if(newSession.date == "") {
    newSession.date = new Date().toISOString().substring(0,10) // creates date only without the time
  }

  User.findByIdAndUpdate(
    // params takes the date in the url
    request.params._id,
    {$push : {log: newSession}},
    {new: true},  
    (error, updatedUser) => {
      let responseObject = {}
      responseObject['_id'] = updatedUser.id
      responseObject['username'] = updatedUser.username
      responseObject['description'] = newSession.description
      responseObject['duration'] = newSession.duration
      responseObject['date'] = new Date(newSession.date).toDateString()
      response.json(responseObject)
    }
  )
})

// Retrieve Exercise Log
app.get("/api/users/:_id/logs", (request, response) => {
  User.findById(request.params._id, (error, userLog) => {
    if(!error) {
      // console.log(userLog)
      let responseObject = userLog

      // filter down results with dates 
      if(request.query.from || request.query.to){

        // set default dates
        let fromDate = new Date(0)
        let toDate = new Date()

        // if there is a from date in url
        if(request.query.from){
          fromDate = new Date(request.query.from)
        }

        // if there is a to date in url
        if(request.query.to){
          toDate = new Date(request.query.to)
        }

        // convert to unix time stamps
        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          // returns true if fromDate is before toDate
          return sessionDate >= fromDate && sessionDate <= toDate
        })
        console.log(typeof fromDate)
      }
      // filter down results to how many logs specified in the url (e.g. ?limit=2)
      if(request.query.limit){
        responseObject.log = responseObject.log.slice(0, request.query.limit)
      }

      responseObject = responseObject.toJSON() // this makes the responseObject modifiable so that count can be added. 
      responseObject['count'] = userLog.log.length
      response.json(responseObject);
    }
  })
})


// <--- /Exercise Tracker END --->

// <--- Date Functions ---> 
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
// <--- /Date functions END --->


// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
