# Berberi - Sistem Rezervimi Online

Uebfaqe moderne për berber me rezervim terminesh online, 100% në gjuhën shqipe dhe e optimizuar për përdorim në telefon (mobile-first).

## Karakteristikat Kryesore

- **Mobile-First**: 99% e optimizuar për telefona celularë
- **Javor**: Kalendar që shfaq vetëm javën aktuale (Hënë-Shtunë)
- **25 Minuta**: Slot-e rezervimi nga ora 09:00 deri 20:00 çdo 25 minuta
- **Pa Regjistrim**: Rezervim i thjeshtë me vetëm emër dhe mbiemër
- **Kod Rezervimi**: Menaxhim rezervimi me kod unik (pa email)
- **Auto-Cleanup**: Fshirja automatike e rezervimeve të vjetra çdo javë të re

## Teknologjitë e Përdorura

- **Backend**: Node.js + Express
- **Database**: SQLite (persistent)
- **Frontend**: HTML5, CSS3 (Mobile-First), Vanilla JavaScript
- **Security**: bcryptjs, helmet, rate limiting

## Instalimi

1. Klono repository-n:
```bash
git clone <repo-url>
cd TeBerberi
```

2. Instalo dependencies:
```bash
npm install
```

3. Inicializo databazën:
```bash
npm run initdb
```

4. Nis serverin:
```bash
npm start
# ose për development:
npm run dev
```

5. Hap në browser: `http://localhost:3000`

## Struktura e Projektit

```
TeBerberi/
├── server.js           # Server kryesor
├── package.json       # Dependencies dhe scripts
├── database/          # SQLite database dhe modelet
├── routes/            # API routes
├── public/            # Frontend files (HTML, CSS, JS)
├── scripts/           # Utility scripts
└── tests/             # Unit tests
```

## API Endpoints

- `GET /` - Faqja kryesore
- `GET /rezervime` - Faqja e rezervimeve
- `GET /api/java` - Kalendari javëor me slot-e
- `POST /api/rezervo` - Krijon rezervim të ri
- `POST /api/kodi/gjej` - Gjen rezervim me kod
- `POST /api/kodi/anulo` - Anulon rezervim
- `POST /api/kodi/ndrysho` - Ndryshon rezervim
- `POST /api/admin/hyrje` - Admin login
- `GET /api/admin/rezervimet` - Lista e rezervimeve (admin)

## Rregullat e Biznesit

1. **Orari i Punës**: 09:00-20:00, Hënë-Shtunë
2. **Slot-e**: 25 minuta secili
3. **Java Aktuale**: Vetëm rezervime për javën aktuale
4. **Auto-Cleanup**: Çdo të Hënë fshihen rezervimet e javës së kaluar
5. **Pa Email**: Sistema funksionon pa email/registrim
6. **Kod Rezervimi**: 6 karaktere (p.sh. A7F3K9) për menaxhim

## Testimi

```bash
npm test
```

## Deployment

Projekti është i gatshëm për deployment në çdo platformë që suporton Node.js dhe SQLite.

---

**Gjuha**: 100% Shqip  
**Target**: Mobile Users  
**Focus**: Rezervime të thjeshta dhe të shpejta