const { driver } = require('../config/neo4j');

async function withSession(operation) {
  if (!driver) {
    throw new Error('Neo4j is not connected. Start Neo4j and configure NEO4J_URI/USERNAME/PASSWORD.');
  }
  const session = driver.session();
  try {
    return await operation(session);
  } finally {
    await session.close();
  }
}

async function ensureGraphConstraints() {
  return withSession(async (session) => {
    await session.run('CREATE CONSTRAINT student_id IF NOT EXISTS FOR (s:Student) REQUIRE s.studentId IS UNIQUE;');
    await session.run('CREATE CONSTRAINT book_id IF NOT EXISTS FOR (b:Book) REQUIRE b.bookId IS UNIQUE;');
    await session.run('CREATE CONSTRAINT author_id IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE;');
    return true;
  });
}

async function upsertStudent(studentId, name, department) {
  return withSession(async (session) => {
    await session.run(
      `MERGE (s:Student {studentId: $studentId}) SET s.name = $name, s.department = $department`,
      { studentId, name, department }
    );
    return { studentId, name, department };
  });
}

async function upsertBook(bookId, title, category) {
  return withSession(async (session) => {
    await session.run(
      `MERGE (b:Book {bookId: $bookId}) SET b.title = $title, b.category = $category`,
      { bookId, title, category }
    );
    return { bookId, title, category };
  });
}

async function linkAuthorToBook(bookId, authorName) {
  return withSession(async (session) => {
    await session.run(
      `MERGE (a:Author {name: $authorName}) WITH a MATCH (b:Book {bookId: $bookId}) MERGE (b)-[:WRITTEN_BY]->(a)`,
      { authorName, bookId }
    );
  });
}

async function linkBookToCategory(bookId, category) {
  return withSession(async (session) => {
    await session.run(
      `MATCH (b:Book {bookId: $bookId}) MERGE (c:Category {name: $category}) MERGE (b)-[:BELONGS_TO]->(c)`,
      { bookId, category }
    );
  });
}

async function borrowRelationship(studentId, bookId) {
  return withSession(async (session) => {
    await session.run(
      `MATCH (s:Student {studentId: $studentId}), (b:Book {bookId: $bookId}) MERGE (s)-[:BORROWED]->(b)`,
      { studentId, bookId }
    );
  });
}

async function returnRelationship(studentId, bookId) {
  return withSession(async (session) => {
    await session.run(
      `MATCH (s:Student {studentId: $studentId})-[r:BORROWED]->(b:Book {bookId: $bookId}) DELETE r`,
      { studentId, bookId }
    );
  });
}

async function seedGraphForDemo() {
  return withSession(async (session) => {
    const studentId = 'STU-1001';
    const books = [
      { bookId: 'B001', title: 'Clean Code', category: 'Software Engineering', author: 'Robert C. Martin' },
      { bookId: 'B002', title: 'Design Patterns', category: 'Software Engineering', author: 'Erich Gamma' },
      { bookId: 'B003', title: 'Database System Concepts', category: 'Databases', author: 'Abraham Silberschatz' },
    ];

    await session.run(
      `MERGE (s:Student {studentId: $studentId}) SET s.name = 'Aanya Sharma', s.department = 'Computer Science'`,
      { studentId }
    );

    for (const book of books) {
      await session.run(
        `MERGE (b:Book {bookId: $bookId}) SET b.title = $title, b.category = $category MERGE (c:Category {name: $category}) MERGE (b)-[:BELONGS_TO]->(c) MERGE (a:Author {name: $author}) MERGE (b)-[:WRITTEN_BY]->(a)`,
        book
      );
    }

    await session.run(
      `MATCH (s:Student {studentId: $studentId}), (b1:Book {bookId: 'B001'}), (b2:Book {bookId: 'B002'}) MERGE (s)-[:BORROWED]->(b1) MERGE (s)-[:BORROWED]->(b2) MERGE (s)-[:INTERESTED_IN]->(:Category {name: 'Software Engineering'}) MERGE (b1)-[:SIMILAR_TO]->(b2) MERGE (b2)-[:SIMILAR_TO]->(b1)`,
      { studentId }
    );

    return true;
  });
}

async function getRecommendations(studentId) {
  return withSession(async (session) => {
    const result = await session.run(
      `MATCH (s:Student {studentId: $studentId})-[:BORROWED]->(b:Book)
       OPTIONAL MATCH (b)-[:SIMILAR_TO]->(recommended:Book)
       OPTIONAL MATCH (b)-[:BELONGS_TO]->(:Category)<-[:BELONGS_TO]-(recommended)
       OPTIONAL MATCH (b)-[:WRITTEN_BY]->(:Author)<-[:WRITTEN_BY]-(recommended)
       WHERE recommended IS NOT NULL AND recommended.bookId <> b.bookId
       RETURN DISTINCT recommended.bookId as bookId, recommended.title as title, recommended.category as category, count(DISTINCT b) as score
       ORDER BY score DESC, recommended.title ASC LIMIT 5;`,
      { studentId }
    );
    return result.records.map((record) => ({
      bookId: record.get('bookId'),
      title: record.get('title'),
      category: record.get('category'),
      score: record.get('score').toNumber ? record.get('score').toNumber() : record.get('score'),
    }));
  });
}

module.exports = {
  ensureGraphConstraints,
  seedGraphForDemo,
  upsertStudent,
  upsertBook,
  linkAuthorToBook,
  linkBookToCategory,
  borrowRelationship,
  returnRelationship,
  getRecommendations,
};
