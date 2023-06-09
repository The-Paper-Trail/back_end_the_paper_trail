'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('pg');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();
const app = express();
const port = process.env.PORT;
const API_KEY = process.env.API_KEY;
const client = new Client(process.env.DATABASE);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/getUsers', getUsersHandler);
app.get('/addBooks', addbooksHandeler);
app.get('/getBooks', getbooksHandeler);
app.get("/favoritesLists", favoritesListsHandler)
app.post('/getUser', getUserHandler);
app.post("/showFavoriteLists", showFavoritesListsHandler)
app.post('/addUser', addUserHandler);
app.post('/addFavoritesLists', addFavoritesListsHandler);
app.put('/updateUser/:email', updateUserHandler);
app.delete('/removeFromFavorit', deleteFromFavorit)
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
  let { discription, url_img } = req.body;
  let sql = `UPDATE "user_Info" SET discription = $1, url_img = $2 WHERE email = $3 RETURNING *;`;
  let imgURL = `https://image.freepik.com/free-vector/man-reading-book-with-big-books-around-white-background-colorful-isometric_18591-62675.jpg`
  let values = [discription, url_img==""?imgURL:url_img, email];

  client.query(sql, values).then(result => {
    if (result.rows.length === 0) {
      res.status(200).send("Email not found");
    } else {
      res.send(result.rows);
    }
  }).catch((err) => {
    console.error(err);
    res.status(500).send("Error");
  })
}

function getUsersHandler(req, res) {
  let sql = `SELECT * FROM "user_Info";`;
  client.query(sql).then(result => {
    res.json(result.rows);
  })
    .catch((err) => {
      res.status(500).send("Error");
    })
}

function getUserHandler(req, res) {
  let userInfo = req.body;
  let sql = `SELECT * FROM "user_Info" WHERE email=$1  AND "password" = $2;`;
  let values = [userInfo.email, userInfo.password]
  client.query(sql, values).then((result) => {
    if (result.rowCount > 0) {
      let sql = `SELECT * FROM "user_Info" WHERE email=$1  AND "password" = $2;`;
      client.query(sql, values)
        .then(
          res.status(202).send(result.rows)
        )
        .catch((error) => {
          res.json(error);
        });
    } else {
      res.status(200).json({ message: 'check email or password' });
    }
  })
    .catch((error) => {
      res.json(error);
    });
}

function addUserHandler(req, res) {
  let userInfo = req.body;
  let sqlcheck = `SELECT "email" FROM "user_Info" WHERE email = $1;`;
  let value = [userInfo.email];
  client.query(sqlcheck, value).then((result) => {
    if (result.rowCount > 0) {
      res.status(200).json({ message: "email is already exist" })
    } else {
      let sql = `INSERT INTO "user_Info" (email, username, password, discription, url_img) VALUES($1,$2,$3,$4,$5);`;
      let email = userInfo.email;
      let imgURL = `https://image.freepik.com/free-vector/man-reading-book-with-big-books-around-white-background-colorful-isometric_18591-62675.jpg`
      let values = [email, userInfo.username, userInfo.password, userInfo.discription==null?"there is no description":userInfo.discription, userInfo.url_img == null ? imgURL : userInfo.url_img];
      client.query(sql, values).then(() => {
        let sql1 = `INSERT INTO favorites_list (email) VALUES ($1);`;
        let value = [email]
        client.query(sql1, value).then(
          res.status(201).json({ message: "is add" })
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
  })

}
// Function to add a book to the database
function addbooksHandeler(req, res) {
  //add apikeys to array
  let url = [`https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${API_KEY}`, `https://api.nytimes.com/svc/books/v3/lists/current/e-book-fiction.json?api-key=${API_KEY}`]
  for (let i = 0; i < 2; i++) {
    axios.get(url[i])
      .then((result) => {
        let listbooks = result.data.results.books.map((results) => {
          return new ReformatData(results.title, results.description, results.author, results.publisher, results.contributor, results.book_image, results.buy_links[0].url, results.buy_links[1].url, results.buy_links[2].url)
        })
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
                  return res.status(200).json({ message: 'Book already exists in database' });
                } else {
                  // Book does not exist in database, insert it
                  const insertBookQuery = 'INSERT INTO books (title, description, author, publisher, contributor, book_image, amazon_link, apple_books_link, barnes_and_noble_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *';
                  const insertBookValues = [title, description, author, publisher, contributor, book_image, amazon_link, apple_books_link, barnes_and_noble_link];

                  return client.query(insertBookQuery, insertBookValues)
                    .then(result => {
                      // Book successfully inserted, return inserted row
                      if (!res.headersSent) { // check if headers have already been sent
                        res.status(200).json({ message: 'Book has been added to the database' });
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

function favoritesListsHandler(req, res) {
  let sql = `SELECT * FROM "favorites_list";`;
  client.query(sql).then(result => {
    res.send(result.rows);
  }
  ).catch(error => {
    console.log(error);
    res.send(error.detail);
  });
}

function addFavoritesListsHandler(req, res) {
  let { email, bookID } = req.body;
  let sql = `SELECT "listID" FROM "favorites_list" WHERE email = $1;`;
  let value = [email];
  let sqlResult;
  client.query(sql, value).then(result => {
    sqlResult = result.rows[0].listID;
    const checkIfExistsQuery = 'SELECT * FROM "favorite_book_list" WHERE "bookID" = $1 AND "listID" = $2';
    const checkIfExistsValues = [bookID, sqlResult];
    client.query(checkIfExistsQuery, checkIfExistsValues)
      .then((result) => {
        if (result.rowCount > 0) {
          res.status(200).json({ message: 'already in the list' });
        } else {
          let sql1 = `INSERT INTO "favorite_book_list" ("bookID", "listID") VALUES($1,$2);`;
          let values = [bookID, sqlResult];
          client.query(sql1, values).then((results) => {
            res.json({ message: 'the book has been added' });
          }).catch((error) => {
            res.json(error);
          })
        }
      })
      .catch(error => {
        console.error(error);
        Promise.reject(error);
      })
  }).catch(error => {
    console.log(error);
  });
}

function showFavoritesListsHandler(req, res) {
  let listInfo = req.body;
  let sqlcheck = `SELECT "listID" FROM "favorites_list" WHERE  "email" = $1;`;
  let values = [listInfo.email];
  client.query(sqlcheck, values).then((result) => {
    if (result.rowCount > 0) {
      let sqlGetBookID = `SELECT "bookID" FROM "favorite_book_list" WHERE  "listID" = $1  ;`;
      let value = [result.rows[0].listID];
      client.query(sqlGetBookID, value).then((results) => {
        let sqlgetBooks = `SELECT * FROM "books" WHERE "bookID" IN (${results.rows.map((element, index) => `$${index + 1}`)});`;
        let values = results.rows.map((element) => { return element.bookID });
        client.query(sqlgetBooks, values).then((result) => {
          if (result.rowCount > 0) {
            res.json(result.rows);
          }
        }).catch((error) => {
          res.status(200).json({ message: 'this user didnt have books in the list' });
        });
      }
      ).catch((error) => {
        res.json(error);
      });
    } else {
      res.status(200).json({ message: "email dosen's not exist" });
    }
  }).catch((error) => {
    res.json(error);
  });
}

function deleteFromFavorit(req, res) {
  let listInfo = req.body;
  let sqlCheckEmail = `SELECT "listID" FROM "favorites_list" WHERE  "email" = $1;`;
  let value = [listInfo.email];
  client.query(sqlCheckEmail, value)
    .then((result) => {
      if (result.rowCount > 0) {
      let sqlcheck = `SELECT * FROM "favorite_book_list" WHERE "bookID"=$1  AND "listID" = $2;`;
      let values = [listInfo.bookID, result.rows[0].listID];
      client.query(sqlcheck, values).then((result) => {
        if (result.rowCount > 0) {
          let sql = `DELETE FROM "favorite_book_list" WHERE "bookID"=$1  AND "listID" = $2;`;
          client.query(sql, values)
            .then(
              res.json({ message: 'the book has been deleted' })
            )
            .catch((error) => {
              res.json(error);
            });
        } else {
          res.status(200).json({ message: 'is not exist' });
        }
      })
        .catch((error) => {
          res.json(error);
        });
      }
      else{
        res.status(200).json({ message: "email dosen's not exist" });
      }
    })
    .catch(error => {
      res.json(error);
    })
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

client.connect().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  })
})
  .catch(() => {
    console.log("the sql server isn't running")
  })