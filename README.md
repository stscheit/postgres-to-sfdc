Postgres-to-SFDC record publisher (Node.js)
----------------------------------------

Quick-and-dirty (quite rough) implemenation of a helper tool to read records from a Postgres database and publish/create records in Salesforce.
This project is meant to be deployed to Heroku to run headless, that is without any meaningful UI.
[![Deploy on Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy) 

This application has everything for connecting to Postgres (pg) and SFDC (jsforce):
* Runs (i.e. nodemon app.js) as Express app under [http://localhost:5000](http://localhost:5000) - without any meaningful UI.
* Reads data from a table in Postgres (based on .env config parameters)
* Publishes a platform event into Salesforce (you'll need a Connected App)
* Updates records in Postgres
* Implemenation loops (without any further evaluations) endlessly, so it needs to be monitored.
