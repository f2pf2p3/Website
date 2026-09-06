const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Sample Route
app.get('/', (req, res) => {
  res.send('Hello from your Express server!');
});

// Start Server
app.listen(PORT, () => {
    console.log('Frontend server running at: http://localhost:' + PORT);
});