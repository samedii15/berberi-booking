const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const moment = require('moment-timezone');

// Set default timezone to Europe/Tirane (Albania)
moment.tz.setDefault('Europe/Tirane');

// Use PostgreSQL if DATABASE_URL is set, otherwise SQLite
const database = process.env.DATABASE_URL 
  ? require('./database/db-pg')
  : require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'berberi-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Rate limiting për rezervime dhe kode
const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 500, // maksimum 500 përpjekje për 15 minuta
  message: { error: 'Shumë kërkesa. Provo përsëri pas 15 minutash.' }
});

const codeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minuta
  max: 200, // maksimum 200 përpjekje për 10 minuta
  message: { error: 'Shumë përpjekje për kod. Provo përsëri pas 10 minutash.' }
});

// Konfiguro moment.js për shqip
moment.locale('sq', {
  months: ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'],
  monthsShort: ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'],
  weekdays: ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'],
  weekdaysShort: ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'],
  weekdaysMin: ['D', 'H', 'M', 'M', 'E', 'P', 'S'],
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY HH:mm',
    LLLL: 'dddd, D MMMM YYYY HH:mm'
  },
  calendar: {
    sameDay: '[Sot në] LT',
    nextDay: '[Nesër në] LT',
    nextWeek: 'dddd [në] LT',
    lastDay: '[Dje në] LT',
    lastWeek: '[E] dddd [e kaluar në] LT',
    sameElse: 'L'
  },
  relativeTime: {
    future: 'në %s',
    past: '%s më parë',
    s: 'disa sekonda',
    ss: '%d sekonda',
    m: 'një minutë',
    mm: '%d minuta',
    h: 'një orë',
    hh: '%d orë',
    d: 'një ditë',
    dd: '%d ditë',
    M: 'një muaj',
    MM: '%d muaj',
    y: 'një vit',
    yy: '%d vite'
  },
  dayOfMonthOrdinalParse: /\d{1,2}\./,
  ordinal: '%d.',
  week: {
    dow: 1, // E Hëna është dita e parë e javës
    doy: 4
  }
});

// Import route handlers
const weeklyRoutes = require('./routes/weekly');
const bookingRoutes = require('./routes/booking');
const codeRoutes = require('./routes/codes');
const adminRoutes = require('./routes/admin');
const cleanupService = require('./services/cleanup');

// Initialize database then start cleanup service
async function initializeServer() {
  try {
    await database.init();
    console.log('✅ Databaza u inicializua me sukses');
    
    // Nis cleanup service pas inicializimit të databazës
    cleanupService.startWeeklyCleanup();
  } catch (error) {
    console.error('❌ Gabim gjatë inicializimit të databazës:', error);
    process.exit(1);
  }
}

// Initialize on startup
initializeServer();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/rezervime', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rezervime.html'));
});

app.get('/kodi', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kodi.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint with version info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.2.0-slot-filter-fixed',
    time: moment().format('YYYY-MM-DD HH:mm:ss'),
    features: ['auto-refresh', 'fast-cleanup', 'correct-slot-filtering']
  });
});

// API Routes
app.use('/api', weeklyRoutes);
app.use('/api', reservationLimiter, bookingRoutes);
app.use('/api/kodi', codeLimiter, codeRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Faqja nuk u gjet.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ka ndodhur një gabim i brendshëm.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveri po punon në portin ${PORT}`);
  console.log(`📱 Hap faqen: http://localhost:${PORT}`);
});