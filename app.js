const env = require('dotenv').config();
const path = require('path');
const { Pool, Client } = require('pg');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // store sessions in db
const jsforce = require('jsforce');
const hbs = require('hbs');

// initialise db (for sessions)
var dbProperties = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// initiate Express
const app = express();
app.set('view engine', 'hbs');
app.enable('trust proxy');
app.use(session({
  store: new pgSession({
    pool: new Pool(dbProperties)
  }),
  secret: process.env.COOKIE_SECRET, 
  resave: false,
  cookie:{ maxAge: 5 * 24 * 60 * 60 * 1000 }, // 5 days
  saveUninitialized: true
}));

// variables we need
var oauth2; // jsforce OAuth object
var initalLoad = true;

function isSetup() {
  return (process.env.CONSUMER_KEY != null) && (process.env.CONSUMER_SECRET != null);
}

function oauthCallbackUrl(req) {
  return req.protocol + '://' + req.get('host') + '/oauth/callback';
}

function execute(request, response) {
  console.log('Execute...');
  
  if(initalLoad) {
    response.send('Running execute function...');
    initalLoad=false;
  }

  // instantiate connection (with accessToken)
  const sfClient = new jsforce.Connection({
    oauth2 : {oauth2},
    accessToken: request.session.accessToken,
    instanceUrl: request.session.instanceUrl
  });

  // initiate connection to DB
  const dbClient = new Client(dbProperties);

  // connect to DB
  dbClient.connect()
    //.then(() => console.log('DB connected'))
    .catch(err => console.error('connection error', err.stack));
  
  // query DB for records to inject into Salesforce
  let contactIdList;
  //let batchSize = process.env.BATCH_SIZE;
  dbClient.query("SELECT contact_id FROM contacts WHERE status = 'pending' LIMIT ($1);",[process.env.BATCH_SIZE])
    .then(res => {
      // map contact_id column value to an array
      contactIdList = res.rows.map(a => a.contact_id);
      console.log('Queried contact ids: '+contactIdList);
    })
    .catch(error => console.error('Error in select query: '+error))
    .then(() => {
      // check for results, if no rows were returned, exit process
      if(contactIdList.length==0) { 
        console.log('No records were found to be processed.');
        return;
      }
      // create array of (platform event) objects to be sent to Salesforce
      let sobjectArray = [];
      for (let contactId of contactIdList) {
        sobjectArray.push({
          Process_Name__c: 'ContactServices.ReCalculatePrimaryPointsAndRollUp', 
          Parameter__c: `{"contactIds":["${contactId}"],"targetContactPointObjects":["Address__c","Email__c","Phone__c"]}`
        })
      }
      // submit objects into Salesforce
      sfClient.sobject("Contact_Point_Event__e").create(sobjectArray, function(err, rets) {
        if (err) { return console.error('Error when calling Salesforce to create records: '+err); }
        console.log('Created records in Salesforce: '+rets.length);
      });
    })
    .catch(error => console.error('Error in creation of Sobjects in Salesforce: '+error))
    .then(() => {
      // update records
      dbClient.query('UPDATE contacts SET status=($1) WHERE contact_id = ANY($2);', ['sent',contactIdList])
        .then(res => {
          console.log('Updated contact ids: '+res.rowCount);
          // end connection
          dbClient.end((err, res) => {
            if(err) { 
              console.error('Error in update query: '+err) 
            }
          })          
        })
        .catch(err => console.error('Error in update query: '+err));
    })
}// function

hbs.registerHelper('get', function(field) {
  return this.get(field);
});

app.get('/', function(request, response) {
  // check enviornment parameter are there
  if (!isSetup()) {
    response.redirect('/setup');
  }

  // re-direct to OAuth login if not done so
  if (!request.session.accessToken) {
    //console.log('no access token');
    response.redirect('/oauth/login');
  } else {
    // immediate run
    execute(request, response)
    // invoke processing logic (in a loop) thereafter
    setInterval(function(){ execute(request, response)}, process.env.BACKOFF_TIME);
  }
});

// show setup page if the environment is not configured correctly
app.get('/setup', function(req, res) {
  if (isSetup()) {
    res.redirect('/');
  }
  else {
    var isLocal = (req.hostname.indexOf('localhost') == 0);
    var herokuApp = null;
    if (req.hostname.indexOf('.herokuapp.com') > 0) {
      herokuApp = req.hostname.replace(".herokuapp.com", "");
    }
    res.render('setup', { isLocal: isLocal, oauthCallbackUrl: oauthCallbackUrl(req), herokuApp: herokuApp});
  }
});

// Get authorization url and redirect to it.
app.get('/oauth/login', function(req, res) {
  oauth2 = new jsforce.OAuth2({
    loginUrl : process.env.SFDC_LOGIN_URL || 'https://test.salesforce.com', // can be omitted, needs to be changed to connect to sandbox or prerelease env.
    clientId : process.env.CONSUMER_KEY,
    clientSecret : process.env.CONSUMER_SECRET,
    redirectUri : oauthCallbackUrl(req)
  });
  res.redirect(oauth2.getAuthorizationUrl({ scope : 'api refresh_token' }));
});

// Pass received authorization code and get access token
app.get('/oauth/callback', function(req, res) {
  let conn = new jsforce.Connection({ oauth2 : oauth2 });
  let code = req.query.code;
  conn.authorize(code, function(err, userInfo) {
    if (err) { return console.error('Error occured in the oauth callback: ' + err); }
    // Now you can get the access token, refresh token, and instance URL information.
    
    console.log('Access Token: ' + conn.accessToken);
    /*
    console.log('Instance URL: ' + conn.instanceUrl);
    console.log('refreshToken: ' + conn.refreshToken);
    console.log('User ID: ' + userInfo.id);
    console.log('Org ID: ' + userInfo.organizationId);
    */
    req.session.accessToken = conn.accessToken;
    req.session.instanceUrl = conn.instanceUrl;
    req.session.refreshToken = conn.refreshToken;
    
    // re-direct back to main page
    res.redirect('/');
  });
});

app.listen(process.env.PORT || 5000);
