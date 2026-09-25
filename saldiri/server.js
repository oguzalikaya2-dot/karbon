const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// --- KALICI VERİTABANI KONUMU ---
// Railway üzerindeki '/data' klasörü varsa orayı, yoksa mevcut dizini kullanır.
const dataDir = fs.existsSync('/data') ? '/data' : './';
const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'osint-system-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Anasayfa (Herkes görüntüleyebilir)
app.get('/', (req, res) => {
    db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            console.error(err);
            rows = [];
        }
        res.render('index', { posts: rows, user: req.session.user });
    });
});

// Admin Girişi
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'administe45' && password === 'administe45') {
        req.session.user = { username: 'administe45' };
    }
    res.redirect('/');
});

// Çıkış Yap
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Fotoğraf Yükleme (Sadece Admin)
app.post('/add-post', upload.single('image'), (req, res) => {
    if (!req.session.user || req.session.user.username !== 'administe45') {
        return res.status(403).send("Yetkisiz Erişim! Sadece admin paylaşım yapabilir.");
    }
    const { title, description } = req.body;
    const imageBuffer = req.file ? req.file.buffer.toString('base64') : null;
    const mimeType = req.file ? req.file.mimetype : null;
    const imageStr = imageBuffer ? `data:${mimeType};base64,${imageBuffer}` : null;

    db.run(`INSERT INTO posts (title, description, image) VALUES (?, ?, ?)`, 
        [title, description, imageStr], 
        (err) => {
            if (err) console.error(err);
            res.redirect('/');
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`OSINT SYSTEM ${PORT} portunda çalışıyor.`);
});