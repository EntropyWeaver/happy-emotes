import { createPlayback } from './playback.js';

const messages = [
  ['pixel_ghost', 'todo bajo control', 'purple'],
  ['nullpointer', '¿eso se está moviendo?', 'green'],
  ['hob_enjoyer', 'nice run ✨', 'amber'],
  ['glifo_fantasma', 'acabo de llegar', 'purple'],
  ['byte_curioso', '¿alguien más ve el hilo?', 'green'],
  ['pixel_ghost', 'sigo el recuadro azul', 'amber'],
  ['hob_enjoyer', 'la araña va por arriba 🕷', 'purple'],
  ['nullpointer', '¿y con otra fuente?', 'green'],
  ['byte_curioso', 'esa marca tiene vida propia', 'amber'],
  ['glifo_fantasma', 'probando el recorte', 'purple'],
  ['pixel_ghost', 'otro mensaje más', 'green'],
  ['hob_enjoyer', 'la caja sigue en su sitio', 'amber'],
];
const INITIAL_ROWS = 3;
const MAX_LATER_ROWS = 12;

function messageRow([user, text, color]) {
  const row = document.createElement('div');
  row.className = 'chat-message';
  const author = document.createElement('span');
  author.className = `chat-user ${color}`;
  author.textContent = user;
  const body = document.createElement('span');
  body.textContent = text;
  row.append(author, body);
  return row;
}

export function initMovingChat({ onMove }) {
  const $ = id => document.getElementById(id);
  const views = ['a', 'b'].map(id => ({
    stream: $(`chat-stream-${id}`),
    before: $(`chat-before-${id}`),
    after: $(`chat-after-${id}`),
  }));
  const speed = $('chat-speed');
  const toggle = $('chat-toggle');
  let received = 0;
  let sentAt = 0;
  let before = messages.slice(0, INITIAL_ROWS);
  const after = [];

  function placeSpecimen() {
    after.length = 0;
    for (const view of views) {
      view.before.replaceChildren(...before.map(messageRow));
      view.after.replaceChildren();
    }
    onMove();
  }

  function setReceived(count) {
    received = count;
    if (count === 0) {
      sentAt = 0;
      before = messages.slice(0, INITIAL_ROWS);
      placeSpecimen();
      return;
    }
    const message = messages[(INITIAL_ROWS + count - 1) % messages.length];
    after.push(message);
    if (after.length > MAX_LATER_ROWS) after.shift();
    for (const view of views) {
      view.after.append(messageRow(message));
      if (view.after.childElementCount > MAX_LATER_ROWS) view.after.firstElementChild.remove();
    }
    onMove();
  }

  function updateControls() {
    toggle.textContent = clock.playing ? 'Pausar chat' : 'Iniciar chat';
    const later = received - sentAt;
    const label = later === 1 ? '1 mensaje posterior' : `${later} mensajes posteriores`;
    $('chat-status').textContent = `${clock.playing ? 'En marcha' : 'En pausa'} · ${label}`;
  }

  const clock = createPlayback({
    getCount: () => received,
    setCount: setReceived,
    getDelay: () => Number(speed.value),
    maximum: Infinity,
    onChange: updateControls,
  });

  toggle.addEventListener('click', () => clock.playing ? clock.pause() : clock.play());
  $('chat-step').addEventListener('click', () => clock.step());
  speed.addEventListener('change', () => clock.changeSpeed());
  $('chat-send').addEventListener('click', () => {
    before = [...before, ...after].slice(-INITIAL_ROWS);
    sentAt = received;
    placeSpecimen();
    updateControls();
    $('chat-announcement').textContent = 'Espécimen enviado al final de las dos vistas.';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && clock.playing) clock.pause();
  });
  window.addEventListener('pagehide', () => clock.pause());

  placeSpecimen();
  return {
    reset() {
      speed.value = '1500';
      clock.rewind();
      $('chat-announcement').textContent = '';
    },
    position() {
      for (const { stream, after } of views) {
        stream.style.top = `-${after.offsetHeight}px`;
      }
    },
  };
}
