DROP TABLE IF EXISTS "favorite_book_list";

DROP TABLE IF EXISTS "favorites_list";

DROP TABLE IF EXISTS "books";

DROP TABLE IF EXISTS "user_Info";

-- DROP DATABASE "paperTrail";

-- CREATE DATABASE "paperTrail";

-- psql -d paperTrail -f paperTrail.sql

CREATE TABLE "favorite_book_list"(
    "id" SERIAL NOT NULL,
    "bookID" BIGINT NOT NULL,
    "listID" BIGINT NOT NULL
);
ALTER TABLE
    "favorite_book_list" ADD PRIMARY KEY("id");
CREATE TABLE "books"(
    "bookID" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "author" VARCHAR(255) NOT NULL,
    "publisher" VARCHAR(255) NOT NULL,
    "contributor" VARCHAR(255) NOT NULL,
    "book_image" TEXT NOT NULL,
    "amazon_link" TEXT NOT NULL,
    "apple_books_link" TEXT NOT NULL,
    "barnes_and_noble_link" TEXT NOT NULL
);
ALTER TABLE
    "books" ADD PRIMARY KEY("bookID");
CREATE TABLE "favorites_list"(
    "listID" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "favorites_list" ADD PRIMARY KEY("listID");
CREATE TABLE "user_Info"(
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "discription" VARCHAR(255),
    "url_img" TEXT NOT NULL
);
ALTER TABLE
    "user_Info" ADD PRIMARY KEY("email");
ALTER TABLE
    "favorites_list" ADD CONSTRAINT "favorites_list_email_foreign" FOREIGN KEY("email") REFERENCES "user_Info"("email");
ALTER TABLE
    "favorite_book_list" ADD CONSTRAINT "favorite_book_list_listid_foreign" FOREIGN KEY("listID") REFERENCES "favorites_list"("listID");
ALTER TABLE
    "favorite_book_list" ADD CONSTRAINT "favorite_book_list_bookid_foreign" FOREIGN KEY("bookID") REFERENCES "books"("bookID");