https://github.com/user-attachments/assets/c2193557-f8db-46e8-b58a-d662979d2e33

# Smart College Library Management System

## Project Objective
This project upgrades a base Redis-only library lab into a realistic smart college library platform. It demonstrates how multiple databases can be used for different responsibilities in a production-style academic system.

## Features
- Modern college library dashboard with sidebar and cards
- Catalog search and browsing by title, author, category, and book ID
- Borrow and return workflows
- Reservation queue with Redis Lists and first-come-first-served logic
- Due-date status tracking with green/yellow/red states
- QR-ready book lookup interface
- Neo4j-powered simple recommendations
- Cassandra-based borrowing history
- Librarian dashboard for adding books and students
- Redis lab section preserving the original lab operations

## Technology Stack
- Node.js
- Express.js
- HTML, CSS, JavaScript
- Redis
- MongoDB
- Apache Cassandra
- Neo4j

## Architecture
The system is split by database role:

- Redis: fast state, active issues, reservation queues, cached lab operations
- MongoDB: persistent book and student documents
- Cassandra: high-volume borrowing and return history records
- Neo4j: graph relationships and recommendation logic

## Role of Each Database
### Redis
Redis is used for live operational data and queue workflows. It is excellent for quick retrieval and list-based waiting queues. The original Redis operations remain intact:

- RPUSH LIBRARY_BOOKS
- LINSERT LIBRARY_BOOKS BEFORE
- LRANGE LIBRARY_BOOKS
- LREM LIBRARY_BOOKS
- LMOVE LIBRARY_BOOKS ISSUED_BOOKS

### MongoDB
MongoDB stores the main persistent document records for books, students, and authors. This is a natural choice because library records are document-based and easy to query by title, category, or book ID.

### Cassandra
Cassandra stores time-series borrowing history and events like BORROW, RETURN, RENEW, and OVERDUE. It is designed for large write throughput and wide distribution.

### Neo4j
Neo4j stores graph relationships such as Student -[:BORROWED]-> Book and Book -[:BELONGS_TO]-> Category. This supports graph-based recommendations.

## Why Four Databases?
- Redis is the fastest operational layer for active state, queueing, and cache-like reads.
- MongoDB is the durable document store for catalog and student metadata.
- Cassandra is optimized for append-heavy history and event tracking.
- Neo4j is optimized for relationship-driven discovery and recommendations.

## Installation Steps
1. Clone the project.
2. Install backend dependencies:
   npm install
3. Copy .env.example to .env and update your local credentials.
4. Start Redis locally.
5. Start MongoDB, Cassandra, and Neo4j.
6. Start the backend with:
   node backend/server.js
7. Open the frontend in a browser from the frontend folder, or use a local static server.

## Environment Variables
Create a .env file from .env.example. Example variables:

PORT=3000
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/library_management
CASSANDRA_CONTACT_POINTS=127.0.0.1
CASSANDRA_KEYSPACE=library_keyspace
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=change_this_password

Never commit secrets into the repository.

## How to Start Redis
On Docker, Redis can be started with:

docker run --name redis-library -p 6379:6379 -d redis

## How to Start Backend
From the project root:

node backend/server.js

## How to Start Frontend
Open the file in the frontend folder in a browser, or serve the folder using a simple web server:

cd frontend
python -m http.server 8080

Then open http://localhost:8080.

## API Documentation
### Books
- GET /api/books
- GET /api/books/:id
- POST /api/books
- PUT /api/books/:id
- DELETE /api/books/:id

### Students
- GET /api/students/:id
- POST /api/students

### Borrowing
- POST /api/borrow
- POST /api/borrow/return

### Reservations
- POST /api/reservations
- GET /api/reservations/:bookId

### History and Recommendations
- GET /api/history/:studentId
- GET /api/recommendations/:studentId
- GET /api/dashboard

### Original Redis Lab Endpoints
- POST /create
- POST /addBooks
- POST /insertAI
- GET /books
- DELETE /remove
- POST /issue
- GET /issued

## Redis Commands Used
- RPUSH
- LINSERT
- LRANGE
- LREM
- LMOVE
- LPOP
- LPUSH/RPUSH for queueing

## MongoDB Collections
- books
- students
- authors

## Cassandra Tables
- borrowing_history

## Neo4j Relationships
- Student -[:BORROWED]-> Book
- Student -[:INTERESTED_IN]-> Category
- Book -[:WRITTEN_BY]-> Author
- Book -[:BELONGS_TO]-> Category
- Book -[:SIMILAR_TO]-> Book

## Future Improvements
- Real QR code generation and scanning integration
- More precise due-date calculations and overdue logic
- Admin authentication and roles
- Fine-grained analytics dashboard
- Search indexing and advanced recommendation scoring

## Viva / Concept Notes
### Why Redis?
Redis is used because it is fast and supports list-based operations that are ideal for live library issues and waiting queues.

### Why MongoDB?
MongoDB stores catalog and student documents because the data is naturally represented as documents rather than rigid relational rows.

### Why Cassandra?
Cassandra is chosen for high-volume borrowing and return history because it excels at append-heavy, time-series event data.

### Why Neo4j?
Neo4j is an ideal graph database for connections like students borrowing books and books being related by category or author.

### Why Node.js?
Node.js is chosen because the project is lightweight, fast, and well suited for REST APIs and real-time operations.

### Why Express?
Express keeps the API simple and clean for building routes, controllers, and modular backend services.

### What is RPUSH?
RPUSH adds values to the right end of a Redis list.

### What is LINSERT?
LINSERT inserts a value before or after a specified pivot in a Redis list.

### What is LRANGE?
LRANGE reads a range of elements from a Redis list.

### What is LREM?
LREM removes a specified count of matching values from a Redis list.

### What is LMOVE?
LMOVE moves an element from one Redis list to another, either from the left or right side.

### Why Redis Lists for Reservation Queues?
Redis lists are ideal for first-come-first-served waiting queues because they maintain ordering and support atomic queue operations.

### Why MongoDB for books/students?
Because the data is stored as documents with flexible fields and frequent catalog queries.

### Why Cassandra for history?
Because event history is append-heavy and naturally suited for wide-column storage.

### Why Neo4j for recommendations?
Because recommendations come from relationships and graph patterns, not just simple metadata matches.
