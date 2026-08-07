const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");

const app = express();
app.use(cors());
app.use(express.json());

const client = createClient({
    url: "redis://localhost:6379"
});

client.on("error", (err) => console.log(err));

async function connectRedis() {
    await client.connect();
    console.log("✅ Connected to Redis");
}
connectRedis();


// Create Library
app.post("/create", async (req, res) => {

    await client.del("LIBRARY_BOOKS");
    await client.del("ISSUED_BOOKS");

    res.send("Library Created");

});


// Add Books
app.post("/addBooks", async (req, res) => {

    await client.rPush("LIBRARY_BOOKS", "Clean Code");
    await client.rPush("LIBRARY_BOOKS", "Introduction to Algorithms");
    await client.rPush("LIBRARY_BOOKS", "Database System Concepts");
    await client.rPush("LIBRARY_BOOKS", "Operating System Concepts");
    await client.rPush("LIBRARY_BOOKS", "Computer Networks");

    res.send("Books Added");

});


// Insert AI Book
app.post("/insertAI", async (req, res) => {

    await client.lInsert(
        "LIBRARY_BOOKS",
        "BEFORE",
        "Database System Concepts",
        "Artificial Intelligence: A Modern Approach"
    );

    res.send("Book Inserted");

});


// View Books
app.get("/books", async (req, res) => {

    const books = await client.lRange("LIBRARY_BOOKS", 0, -1);

    res.json(books);

});


// Remove Book
app.delete("/remove", async (req, res) => {

    await client.lRem(
        "LIBRARY_BOOKS",
        1,
        "Computer Networks"
    );

    res.send("Book Removed");

});


// Issue Clean Code
app.post("/issue", async (req, res) => {

    await client.lMove(
        "LIBRARY_BOOKS",
        "ISSUED_BOOKS",
        "LEFT",
        "LEFT"
    );

    res.send("Book Issued");

});


// View Issued Books
app.get("/issued", async (req, res) => {

    const books = await client.lRange("ISSUED_BOOKS", 0, -1);

    res.json(books);

});

app.listen(3000, () => {

    console.log("Server running on port 3000");

});