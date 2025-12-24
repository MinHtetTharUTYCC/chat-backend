const { Client } = require('pg');

const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'chat_app_db',
});

console.log('Attempting to connect...');

client
    .connect()
    .then(() => {
        console.log('✓ Connected successfully!');
        return client.query('SELECT version()');
    })
    .then((result: any) => {
        console.log('PostgreSQL version:', result.rows[0].version);
        client.end();
    })
    .catch((err: any) => {
        console.error('✗ Connection error:', err.message);
        console.error('Error code:', err.code);
    });
