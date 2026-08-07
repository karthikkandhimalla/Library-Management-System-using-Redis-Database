const BASE_URL = "http://localhost:3000";

async function createLibrary() {
    const res = await fetch(`${BASE_URL}/create`, {
        method: "POST"
    });

    document.getElementById("output").innerHTML = await res.text();
}

async function addBooks() {
    const res = await fetch(`${BASE_URL}/addBooks`, {
        method: "POST"
    });

    document.getElementById("output").innerHTML = await res.text();
}

async function insertAI() {
    const res = await fetch(`${BASE_URL}/insertAI`, {
        method: "POST"
    });

    document.getElementById("output").innerHTML = await res.text();
}

async function showBooks() {

    const res = await fetch(`${BASE_URL}/books`);

    const books = await res.json();

    let html = "<h3>Library Books</h3><ol>";

    books.forEach(book => {
        html += `<li>${book}</li>`;
    });

    html += "</ol>";

    document.getElementById("output").innerHTML = html;
}

async function removeBook() {

    const res = await fetch(`${BASE_URL}/remove`, {
        method: "DELETE"
    });

    document.getElementById("output").innerHTML = await res.text();
}

async function issueBook() {

    const res = await fetch(`${BASE_URL}/issue`, {
        method: "POST"
    });

    document.getElementById("output").innerHTML = await res.text();
}

async function showIssued() {

    const res = await fetch(`${BASE_URL}/issued`);

    const books = await res.json();

    let html = "<h3>Issued Books</h3><ol>";

    books.forEach(book => {
        html += `<li>${book}</li>`;
    });

    html += "</ol>";

    document.getElementById("output").innerHTML = html;
}