require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB } = require('./src/db');

const medicationsRouter = require('./src/routes/medications');
const authRouter = require('./src/routes/auth');
const googleAuthRouter = require('./src/routes/googleAuth');

const { startReminderScheduler } = require('./src/services/reminderScheduler');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logo', express.static(path.join(__dirname, 'logo')));


app.use('/api/medications', medicationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/google', googleAuthRouter);


app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`MedAdhere server running on http://localhost:${PORT}`);
      startReminderScheduler();
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
