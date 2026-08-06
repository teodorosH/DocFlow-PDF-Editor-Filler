

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'local_jwt_secret_123';
const PORT = process.env.PORT || 5000;

// התחברות ל-PostgreSQL המקומי
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'docflow_db',
  password: process.env.DB_PASS,
});

// 1. הרשמה
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, plan } = req.body;
  
  console.log(`[Register Attempt] Email: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: 'חובה להזין מייל וסיסמה' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      console.log(`⚠️ [Register Warning] User already exists: ${email}`);
      return res.status(400).json({ 
        error: 'משתמש עם מייל זה כבר קיים במערכת',
        userExists: true 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const selectedPlan = plan || 'free';
    const userName = fullName || email.split('@')[0];
    const initialPassCredits = selectedPlan === 'micro_pass' ? 10 : 0;

    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, plan, pass_credits, edits_count) 
       VALUES ($1, $2, $3, $4, $5, 0) 
       RETURNING id, email, full_name AS "fullName", plan, pass_credits AS "passCredits", edits_count AS "editsCount"`,
      [email, hashedPassword, userName, selectedPlan, initialPassCredits]
    );

    const user = newUser.rows[0];
    console.log(`✅ [Register Success] User created: ${email} (ID: ${user.id})`);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user });
  } catch (err) {
    console.error('❌ [Register Error]:', err);
    res.status(500).json({ error: 'שגיאת שרת בהרשמה' });
  }
});

// 2. התחברות
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'חובה להזין מייל וסיסמה' });
  }

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
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.full_name, 
        plan: user.plan,
        passCredits: user.pass_credits || 0,
        editsCount: user.edits_count || 0 
      },
    });
  } catch (err) {
    console.error('❌ [Login Error]:', err);
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
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון המסלול' });
  }
});

// 4. עדכון פרופיל משתמש (שם מלא / מסלול)
app.post('/api/user/update-profile', async (req, res) => {
  const { userId, fullName, plan } = req.body;
  try {
    const updatedUser = await pool.query(
      'UPDATE users SET full_name = $1, plan = $2 WHERE id = $3 RETURNING id, email, full_name, plan',
      [fullName, plan, userId]
    );
    res.json({ user: updatedUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון הפרופיל' });
  }
});

// 5. שמירת מסמך חדש / טיוטה לעריכה עתידית
app.post('/api/documents/save', async (req, res) => {
  const { userId, title, elementsJson } = req.body;
  try {
    const userRes = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
    const plan = userRes.rows[0]?.plan || 'free';

    const countRes = await pool.query('SELECT COUNT(*) FROM saved_documents WHERE user_id = $1', [userId]);
    const currentCount = parseInt(countRes.rows[0].count);

    if (plan === 'free') {
      return res.status(403).json({ error: 'שמירת קבצים בענן זמינה למשתמשי Pro ו-Premium בלבד' });
    } else if (plan === 'pro' && currentCount >= 3) {
      return res.status(403).json({ error: 'הגעת למגבלת 3 הקבצים במסלול Pro. שדרג ל-Premium לשמירת עד 8 קבצים!' });
    } else if (plan === 'premium' && currentCount >= 8) {
      return res.status(403).json({ error: 'הגעת למגבלת 8 הקבצים במסלול Premium.' });
    }

    const newDoc = await pool.query(
      'INSERT INTO saved_documents (user_id, title, elements_json) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, JSON.stringify(elementsJson)]
    );

    res.json({ document: newDoc.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת המסמך' });
  }
});

// 6. שליפת המסמכים השמורים של משתמש
app.get('/api/documents/user/:userId', async (req, res) => {
  try {
    const docs = await pool.query(
      'SELECT * FROM saved_documents WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.params.userId]
    );
    res.json({ documents: docs.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת הקבצים' });
  }
});

// 7. בדיקת ועדכון מכסת עריכות לפני הורדה
app.post('/api/user/use-edit-credit', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.json({ allowed: true, isGuest: true }); // אורח
  }

  try {
    const userRes = await pool.query('SELECT plan, edits_count, pass_credits FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });

    // מנוי פרימיום - ללא הגבלה
    if (user.plan === 'premium') {
      return res.json({ allowed: true, plan: 'premium' });
    }

    // בעל חבילת 10 עריכות (Micro Pass)
    if (user.plan === 'micro_pass' || user.pass_credits > 0) {
      if (user.pass_credits > 0) {
        await pool.query('UPDATE users SET pass_credits = pass_credits - 1 WHERE id = $1', [userId]);
        return res.json({ allowed: true, plan: 'micro_pass', remainingCredits: user.pass_credits - 1 });
      } else {
        return res.status(403).json({ error: 'ניצלת את כל 10 העריכות בחבילה שלך. שדרג או רכוש חבילה חדשה!' });
      }
    }

    // משתמש חינמי רשום (עד 3 עריכות בחודש)
    if (user.plan === 'free') {
      if (user.edits_count < 3) {
        await pool.query('UPDATE users SET edits_count = edits_count + 1 WHERE id = $1', [userId]);
        return res.json({ allowed: true, plan: 'free', remainingEdits: 2 - (user.edits_count || 0) });
      } else {
        return res.status(403).json({ 
          error: 'הגעת למכסת 3 העריכות החינמיות לחודש זה!',
          limitReached: true 
        });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`🚀 DocFlow Server runs on http://localhost:${PORT}`);
});