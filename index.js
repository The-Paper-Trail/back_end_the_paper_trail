'use strict';
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const {Client} = require('pg');

const client = new Client(process.env.DATABASE);

const app = express();

app.use(cors());
const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

client.connect().then(()=>{
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  })
}).catch()