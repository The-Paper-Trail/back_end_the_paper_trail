'use strict';
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { Client } = require('pg');

const client = new Client(process.env.DATABASE);

const app = express();
app.use(cors());
const port = process.env.PORT;
const APIKey = process.env.API_KEY

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/adduser', addUserHandler);
app.get('/getuser', getUserHandler);
app.put('/updateuser/:email', updateUserHandler);


function updateUserHandler(req, res) {
  let email = req.params.email;
  console.log("Email:", email);
  console.log("Body:", req.body);

  let { discription, url_img } = req.body;
  console.log("discription:", discription);
  console.log("URL image:", url_img);

  let sql = `UPDATE "user_Info" SET discription = $1, url_img = $2 WHERE email = $3 RETURNING *;`;
  let values = [discription, url_img, email];

  client.query(sql, values).then(result => {
    console.log("Result:", result.rows);
    if (result.rows.length === 0) {
      res.status(404).send("Email not found");
    } else {
      res.send(result.rows);
    }
  }).catch((err) => {
    console.error(err);
    res.status(500).send("Error");
  })
}




function getUserHandler(req, res) {

  // let sql = `SELECT * FROM user_Info;`
  // client.query(sql)
  //   .then((result) => {
  //     res.json(result.rows)
  //   }

  //   )
  let sql = `SELECT * FROM "user_Info";`;
  client.query(sql).then(result => {
    res.json(result.rows);
  })
    .catch((err) => {
      res.status(500).send("Error");
    })
}

function addUserHandler(req, res) {
  // let { email, username, password, discription, url_img } = req.body;

  // let sql = `INSERT INTO user_Info (email, username, password, discription, url_img)
  //            VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
  // let values = [email, username, password, discription, url_img];

  // client.query(sql, values)
  //   .then((result) => {
  //     console.log("User added successfully:", result.rows[0]);
  //     res.status(201).json(result.rows);
  //   })
  let userInfo = req.body;
  let sql = `INSERT INTO "user_Info" (email, username, password, discription, url_img) VALUES($1,$2,$3,$4,$5);`;
  let email = userInfo.email;
  let values = [email, userInfo.username, userInfo.password, userInfo.discription, userInfo.url_img];
  client.query(sql, values).then(() => {
    let sql1 = `INSERT INTO favorites_list (email) VALUES ($1);`;
    let value = [email]
    client.query(sql1, value).then(
      res.status(201).send("user has been added")
    ).catch(error => {
      console.log(error);
    })
  })
    .catch((err) => {
      // If the error is due to a duplicate email, return a custom response
      if (err.code === "23505") {
        res.status(409).send("User with this email already exists");
      } else {
        res.status(500).send("Error");
      }
    });
}



function user(email, username, password, discription, url_img) {

  this.email = email;
  this.username = username;
  this.password = password;
  this.discription = discription;
  this.url_img = url_img;
}

client.connect().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  })
})
  .catch(() => {
    console.log("oppps")
  })