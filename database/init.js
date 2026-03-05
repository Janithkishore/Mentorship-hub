/**
 * Database Initialization Script
 * Creates all tables and inserts default admin + sample data
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, 'mentorship.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

function runSQLFile(filePath) {
    return new Promise((resolve, reject) => {
        const sql = fs.readFileSync(filePath, 'utf8');
        db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function seed() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const queries = [
        `INSERT OR IGNORE INTO users (name, email, password, role, department) 
         VALUES ('Admin', 'admin@college.edu', '${hashedPassword}', 'admin', 'Administration')`,
        `INSERT OR IGNORE INTO feedback_questions (question_text, question_type) VALUES 
         ('How would you rate the mentorship session?', 'rating'),
         ('Was the mentor available when needed?', 'yes-no'),
         ('Additional comments (optional)', 'text')`
    ];

    for (const q of queries) {
        await new Promise((resolve, reject) => {
            db.run(q, (err) => { if (err) reject(err); else resolve(); });
        });
    }

    console.log('Seed data inserted.');
}

async function main() {
    try {
        await runSQLFile(schemaPath);
        console.log('Schema applied.');
        await seed();
        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Initialization failed:', err);
        process.exit(1);
    } finally {
        db.close();
    }
}

main();
