'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('pg');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();
const app = express();
const port = process.env.PORT ;
const API_KEY = process.env.API_KEY ;
const client = new Client(process.env.DATABASE);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/adduser', addUserHandler);
app.get('/getuser', getUserHandler);
app.put('/updateuser/:email', updateUserHandler);
app.get('/addbooks', addbooksHandeler);
app.get('/getbooks', getbooksHandeler);
app.use(handleServerError);
app.get('*', handlePageNotFoundError);



function getbooksHandeler(req, res) {
  let sql = ` SELECT * FROM books;`
  client.query(sql).then((result) => {
    res.status(201).json(result.rows);
  }).catch()

}
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
// Function to add a book to the database
function addbooksHandeler(req, res) {
  //add apikeys to array
  let url = [`https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${API_KEY}`, `https://api.nytimes.com/svc/books/v3/lists/current/e-book-fiction.json?api-key=${API_KEY}`]
  for (let i = 0; i < 2; i++) {
    axios.get(url[i])
      .then((result) => {
        // console.log(result.data.results.books);
        // let listbooks = result.data.results.books.map((results) => {
        //   return console.log("kkkkkkk",results.buy_links[1].url)
        // })
        let listbooks = result.data.results.books.map((results) => {
          return new ReformatData(results.title, results.description, results.author, results.publisher, results.contributor, results.book_image, results.buy_links[1].url, results.buy_links[2].url, results.buy_links[3].url)
        })
        // console.log(listbooks);
        const promises = [];

        listbooks.forEach(book => {
          const { title, description, author, publisher, contributor, book_image, amazon_link, apple_books_link, barnes_and_noble_link } = book;

          // Check if the book already exists in the database
          const checkIfExistsQuery = 'SELECT * FROM books WHERE title = $1 AND author = $2';
          const checkIfExistsValues = [title, author];

          promises.push(
            client.query(checkIfExistsQuery, checkIfExistsValues)
              .then(result => {
                if (result.rowCount > 0) {
                  // Book already exists in database, return 409 status code and the message
                  return res.status(409).json({ message: 'Book already exists in database' });
                } else {
                  // Book does not exist in database, insert it
                  const insertBookQuery = 'INSERT INTO books (title, description, author, publisher, contributor, book_image, amazon_link, apple_books_link, barnes_and_noble_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *';
                  const insertBookValues = [title, description, author, publisher, contributor, book_image, amazon_link, apple_books_link, barnes_and_noble_link];

                  return client.query(insertBookQuery, insertBookValues)
                    .then(result => {
                      // Book successfully inserted, return inserted row
                      if (!res.headersSent) { // check if headers have already been sent
                        res.status(201).json(result.rows);
                      }
                      return Promise.resolve();
                    })
                    .catch(error => {
                      console.error(error);
                      return Promise.reject(error);
                    });
                }
              })
              .catch(error => {
                console.error(error);
                return Promise.reject(error);
              })
          );
        });

        Promise.all(promises)
          .then(() => {
            // All books processed successfully
            if (!res.headersSent) { // check if headers have already been sent
              res.status(200)
            }
          })
          .catch(error => {
            // Error occurred while processing books, return 500 status code
            console.error(error);
            if (!res.headersSent) { // check if headers have already been sent
              res.sendStatus(500);
            }
          });

      })
      .catch((error) => {
        // handleServerError(error, req, res)
      })



  }


}
// Schedule the addbooksHandeler function to run every 7 days
cron.schedule('0 0 * * 0', () => {
  console.log('Running addbooksHandeler function');

  // Call the addbooksHandeler function
  const req = {};
  const res = {
    sendStatus: function (code) {
      console.log(`Response status code: ${code}`);
    },
    status: function (code) {
      return this;
    },
    json: function (data) {
      console.log(data);
    }
  };
  addbooksHandeler(req, res);
});



// Schedule the addbooksHandeler function to run every 7 days
cron.schedule('0 0 * * 0', () => {
  console.log('Running addbooksHandeler function');

  // Call the addbooksHandeler function
  const req = {};
  const res = {
    sendStatus: function (code) {
      console.log(`Response status code: ${code}`);
    },
    status: function (code) {
      return this;
    },
    json: function (data) {
      console.log(data);
    }
  };
  addbooksHandeler(req, res);
});


function ReformatData(title, description, author, publisher, contributor, book_image, amazon_link, apple_books_link, barnes_and_noble_link) {
  this.title = title;
  this.description = description;
  this.author = author
  this.publisher = publisher;
  this.contributor = contributor;
  this.book_image = book_image;
  this.amazon_link = amazon_link;
  this.apple_books_link = apple_books_link;
  this.barnes_and_noble_link = barnes_and_noble_link;

}
function handlePageNotFoundError(req, res) {
  res.status(404).send("Sorry, the requested page could not be found");
}
function handleServerError(err, req, res, next) {
  res.status(500).json({ status: 500, responseText: "Sorry, something went wrong" });
}
function Reformat2(id, title, release_date, poster_path, overview) {
  this.id = id;
  this.title = title;
  this.release_date = release_date
  this.poster_path = poster_path;
  this.overview = overview;
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