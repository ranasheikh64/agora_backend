require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const tokenRoutes = require('./src/routes/token');
const messageRoutes = require('./src/routes/messages');



const app = express();
const server = http.createServer(app);

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/messages', messageRoutes);

// health check
app.get('/', (req, res) => res.send({ ok: true, ts: Date.now() }));

// start server after DB connection
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });
