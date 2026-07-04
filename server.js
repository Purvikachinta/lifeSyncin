const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Server } = require('socket.io');

const db = require('./db');
const { acceptDispatch } = require('./sockets/dispatchEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('io', io);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: 'lifesync-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 },
  })
);

// Make session data available in all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Routes
app.use('/', require('./routes/main'));
app.use('/', require('./routes/donor'));
app.use('/', require('./routes/hospital'));
app.use('/', require('./routes/bank'));

// 404
app.use((req, res) => {
  res.status(404).render('404');
});

// --- Socket.io wiring ---
io.on('connection', (socket) => {
  // Donor joins their private room so the dispatch engine can target them
  socket.on('donor:join', (donorId) => {
    if (donorId) {
      socket.join(`donor:${donorId}`);
      socket.data.donorId = donorId;
    }
  });

  // Bank joins its room for booking notifications
  socket.on('bank:join', (bankId) => {
    if (bankId) socket.join(`bank:${bankId}`);
  });

  // Donor accepts an emergency ping
  socket.on('dispatch:accept', ({ postId, donorId }) => {
    const result = acceptDispatch(io, { postId, donorId });
    socket.emit('dispatch:acceptResult', result);
  });

  socket.on('disconnect', () => {
    // no-op; rooms are cleaned up automatically
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`LifeSync running on http://localhost:${PORT}`);
});
