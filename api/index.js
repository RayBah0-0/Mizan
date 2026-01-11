const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['https://mizan-vite.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Placeholder - backend needs proper setup
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
