import { onLanguageChange, setMessage, t } from './i18n.js';
import { createPlayback } from './playback.js';

const messages = [
  ['pixel_ghost', () => t("everything under control", "todo bajo control"), 'purple'],
  ['nullpointer', () => t("is that moving?", "¿eso se está moviendo?"), 'green'],
  ['hob_enjoyer', () => 'nice run ✨', 'amber'],
  ['glifo_fantasma', () => t("just got here", "acabo de llegar"), 'purple'],
  ['byte_curioso', () => t("anyone else see the thread?", "¿alguien más ve el hilo?"), 'green'],
  ['pixel_ghost', () => t("following the blue box", "sigo el recuadro azul"), 'amber'],
  ['hob_enjoyer', () => t("the spider is climbing 🕷", "la araña va por arriba 🕷"), 'purple'],
  ['nullpointer', () => t("what about another font?", "¿y con otra fuente?"), 'green'],
  ['byte_curioso', () => t("that mark has a life of its own", "esa marca tiene vida propia"), 'amber'],
  ['glifo_fantasma', () => t("testing clipping", "probando el recorte"), 'purple'],
  ['pixel_ghost', () => t("one more message", "otro mensaje más"), 'green'],
  ['hob_enjoyer', () => t("the box is still there", "la caja sigue en su sitio"), 'amber'],
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
  body.textContent = text();
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
    toggle.textContent = clock.playing ? t("Pause chat", "Pausar chat") : t("Start chat", "Iniciar chat");
    const later = received - sentAt;
    const label = later === 1 ? t("1 newer message", "1 mensaje posterior") : t(`${later} newer messages`, `${later} mensajes posteriores`);
    $('chat-status').textContent = `${clock.playing ? t("Running", "En marcha") : t("Paused", "En pausa")} · ${label}`;
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
    setMessage($('chat-announcement'), () => t("Specimen sent to the end of both chats.", "Espécimen enviado al final de las dos vistas."));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && clock.playing) clock.pause();
  });
  window.addEventListener('pagehide', () => clock.pause());

  placeSpecimen();
  onLanguageChange(() => {
    for (const view of views) {
      view.before.replaceChildren(...before.map(messageRow));
      view.after.replaceChildren(...after.map(messageRow));
    }
    updateControls();
    onMove();
  });
  return {
    reset() {
      speed.value = '1500';
      clock.rewind();
      setMessage($('chat-announcement'), '');
    },
    position() {
      for (const { stream, after } of views) {
        stream.style.top = `-${after.offsetHeight}px`;
      }
    },
  };
}
