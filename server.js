// require
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const appRouter = require('./route/endpoints');

// setup
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(appRouter);

app.get('/', (_req, res, next) => {
    res.sendFile(__dirname + '/views/index.html');
});

// listen
app.listen(port, function() {
  console.log(`Listening at: http://localhost:${port}`);
});
