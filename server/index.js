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

// 1. הרשמה (עם לוגים מפורטים וזיהוי משתמש קיים)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, plan } = req.body;
  
  console.log(`[Register Attempt] Email: ${email}`);

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      console.log(`⚠️ [Register Warning] User already exists in Postgres: ${email}`);
      return res.status(400).json({ 
        error: 'משתמש עם מייל זה כבר קיים במערכת',
        userExists: true 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const selectedPlan = plan || 'free';
    const userName = fullName || email.split('@')[0];

    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, plan) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, plan',
      [email, hashedPassword, userName, selectedPlan]
    );

    console.log(`✅ [Register Success] User created: ${email} (ID: ${newUser.rows[0].id})`);

    const token = jwt.sign({ userId: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error('❌ [Register Error]:', err);
    res.status(500).json({ error: 'שגיאת שרת בהרשמה' });
  }
});// 1. הרשמה
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, plan } = req.body;
  
  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'משתמש עם מייל זה כבר קיים במערכת',
        userExists: true 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const selectedPlan = plan || 'free';
    const userName = fullName || email.split('@')[0];

    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, plan) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, plan',
      [email, hashedPassword, userName, selectedPlan]
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
      user: { id: user.id, email: user.email, full_name: user.full_name, plan: user.plan },
    });
  } catch (err) {
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

// עדכון פרופיל משתמש (שם מלא / מסלול)
app.post('/api/user/update-profile', async (req, res) => {
  const { userId, fullName, plan } = req.body;
  try {
    const updatedUser = await pool.query(
      'UPDATE users SET full_name = $1, plan = $2 WHERE id = $3 RETURNING id, email, full_name, plan',
      [fullName, plan, userId]
    );
    res.json({ user: updatedUser.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון הפרופיל' });
  }
});

// שמירת מסמך חדש / טיוטה לעריכה עתידית
app.post('/api/documents/save', async (req, res) => {
  const { userId, title, elementsJson } = req.body;
  try {
    // בדיקת מנוי והגבלת שמירות
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

// שליפת המסמכים השמורים של משתמש
app.get('/api/documents/user/:userId', async (req, res) => {
  try {
    const docs = await pool.query(
      'SELECT * FROM saved_documents WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.params.userId]
    );
    res.json({ documents: docs.rows });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה שטעינת הקבצים' });
  }
});


// בדיקת ועדכון מכסת עריכות לפני הורדה
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
        return res.json({ allowed: true, plan: 'free', remainingEdits: 2 - user.edits_count });
      } else {
        return res.status(403).json({ 
          error: 'הגעת למכסת 3 העריכות החינמיות לחודש זה!',
          limitReached: true 
        });
      }
    }
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});



app.listen(5000, () => {
  console.log('🚀 DocFlow Server runs on http://localhost:5000');
});
