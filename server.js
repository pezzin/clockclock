const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Stato centrale unico: e' questo che in futuro, con l'ESP32, diventera'
// il "comando" che il microcontrollore traduce in angoli dei servo.
let state = {
  mode: 'live',      // 'live' | 'custom' | 'wave' | 'park'
  customDigits: '',   // usato solo quando mode === 'custom'
  rows: 3,            // dimensioni della griglia di orologi
  cols: 8,
  handDuration: 0.6    // secondi per il movimento delle lancette
};

app.get('/', (req, res) => res.redirect('/admin'));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/display', (req, res) => res.sendFile(path.join(__dirname, 'public', 'display.html')));

io.on('connection', (socket) => {
  // ogni nuovo client (admin o display) riceve subito lo stato corrente
  socket.emit('state', state);

  // solo l'admin invia questo evento
  socket.on('setState', (newState) => {
    state = { ...state, ...newState };
    io.emit('state', state); // ridistribuisce a TUTTI i client connessi (tutti i display)
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Admin:   http://localhost:${PORT}/admin`);
  console.log(`Display: http://localhost:${PORT}/display`);
});
