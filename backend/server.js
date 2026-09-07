const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({
    path: '../.env'
});

const app = express();

const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());


// ============================================================
// SERVE WEBSITE
// ============================================================

// Serve index.html, style.css, script.js
// from the backend folder.
app.use(express.static(__dirname));


// ============================================================
// MAIN PAGE
// ============================================================

// Open backend/index.html when visiting:
//
// https://your-backend.onrender.com/
app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'index.html')
    );

});