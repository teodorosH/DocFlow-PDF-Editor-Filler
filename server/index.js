const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = 'docflow_super_secret_key_123';

// התחברות ל-PostgreSQL המקומי שלך
const pool = new Pool({
  user: 'postgres',        // שם המשתמש ב-Postgres שלך
  host: 'localhost',
  database: 'docflow_db',
  password: '6060068', // 👈 הכנס סיסמה שלך
  port: 5432,
});

// 1. הרשמה
app.post('/api/auth/register', async (req, res) => {
  const { email, password, plan } = req.body;
  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'משתמש עם מייל זה כבר קיים' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const selectedPlan = plan || 'free';

    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, plan) VALUES ($1, $2, $3) RETURNING id, email, plan',
      [email, hashedPassword, selectedPlan]
    );

    const token = jwt.sign({ userId: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת בהרשמה' });
  }
});

// 2. התחברות
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'מייל או סיסמה שגויים' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'מייל או סיסמה שגויים' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, plan: user.plan },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת בהתחברות' });
  }
});

// 3. עדכון מסלול מנוי
app.post('/api/user/update-plan', async (req, res) => {
  const { userId, plan } = req.body;
  try {
    const updatedUser = await pool.query(
      'UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, email, plan',
      [plan, userId]
    );
    res.json({ user: updatedUser.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון המסלול' });
  }
});

app.listen(5000, () => {
  console.log('🚀 DocFlow Server runs on http://localhost:5000');
});