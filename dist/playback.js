// A single pending tick: delayed/background frames never add a burst of marks.
export function createPlayback({ getCount, setCount, getDelay, maximum, onChange,
  schedule = setTimeout, cancel = clearTimeout }) {
  let playing = false;
  let timer = null;
  let generation = 0;

  function clearTick() {
    generation++;
    if (timer !== null) cancel(timer);
    timer = null;
  }
  function queueTick() {
    const current = generation;
    timer = schedule(() => {
      if (!playing || current !== generation) return;
      timer = null;
      setCount(Math.min(maximum, getCount() + 1));
      if (getCount() >= maximum) playing = false;
      onChange();
      if (playing) queueTick();
    }, getDelay());
  }
  return {
    get playing() { return playing; },
    play() {
      if (playing) return;
      if (getCount() >= maximum) setCount(0);
      playing = true;
      onChange();
      queueTick();
    },
    pause() {
      clearTick();
      playing = false;
      onChange();
    },
    step() {
      clearTick();
      playing = false;
      if (getCount() < maximum) setCount(getCount() + 1);
      onChange();
    },
    rewind() {
      clearTick();
      playing = false;
      setCount(0);
      onChange();
    },
    changeSpeed() {
      clearTick();
      if (playing) queueTick();
    },
  };
}
