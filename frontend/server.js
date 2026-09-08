const express = require('express');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;

// Serve all frontend files.
app.use(express.static(__dirname));

// Open index.html at /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start frontend server.
app.listen(PORT, () => {
    console.log('========================================');

    console.log('FRONTEND SERVER STARTED');
    
    console.log(`PORT: ${PORT}`);

    console.log('========================================');
});