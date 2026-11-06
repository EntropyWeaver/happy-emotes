// A Range uses the same UTF-16 offsets as Intl.Segmenter. Keep the shaped
// text in one node: wrapping individual graphemes could change ligatures.
const HIGHLIGHT_NAME = 'selected-grapheme';

function textRange(sample, cluster) {
  const node = sample.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE || cluster.end > node.length) return null;
  const range = document.createRange();
  range.setStart(node, cluster.start);
  range.setEnd(node, cluster.end);
  return range;
}

function visibleRects(range, stage, message, overflow) {
  // Range geometry is typographic, not the outline of the painted glyphs.
  // Intersect it with the actual clipping boxes, including the stage itself.
  const clip = overflow === 'visible' ? stage : {
    left: Math.max(stage.left, message.left),
    right: Math.min(stage.right, message.right),
    top: Math.max(stage.top, message.top),
    bottom: Math.min(stage.bottom, message.bottom),
  };
  return Array.from(range.getClientRects(), rect => {
    const left = Math.max(rect.left, clip.left);
    const right = Math.min(rect.left + Math.max(2, rect.width), clip.right);
    const top = Math.max(rect.top, clip.top);
    const bottom = Math.min(rect.bottom, clip.bottom);
    return { left, top, width: right - left, height: bottom - top, caret: rect.width < 1 };
  }).filter(rect => rect.width > 0 && rect.height > 0);
}

export function createGraphemeSelection(onSelect) {
  const nativeHighlight = typeof Highlight === 'function' && Boolean(globalThis.CSS?.highlights);
  const views = ['a', 'b'].map(id => ({
    stage: document.getElementById(`stage-${id}`),
    message: document.getElementById(`message-${id}`),
    sample: document.getElementById(`sample-${id}`),
    layer: document.getElementById(`selection-${id}`),
    status: document.getElementById(`selection-status-${id}`),
  }));
  let analysis;

  for (const view of views) {
    view.stage.addEventListener('click', event => {
      if (!analysis?.clusters?.length || event.detail > 1) return;
      // A drag still selects text for copying; do not turn it into an inspection.
      if (document.getSelection()?.type === 'Range') return;
      if (!view.message.contains(event.target)) return;
      const stage = view.stage.getBoundingClientRect();
      const message = view.message.getBoundingClientRect();
      const overflow = getComputedStyle(view.message).overflow;
      for (const [index, cluster] of analysis.clusters.entries()) {
        const range = textRange(view.sample, cluster);
        if (!range) continue;
        const hit = visibleRects(range, stage, message, overflow).some(rect =>
          event.clientX >= rect.left && event.clientX < rect.left + rect.width &&
          event.clientY >= rect.top && event.clientY < rect.top + rect.height);
        if (hit) {
          onSelect(index);
          break;
        }
      }
    });
  }

  return {
    render(nextAnalysis, selected) {
      analysis = nextAnalysis;
      const cluster = analysis.clusters?.[selected];
      const ranges = [];
      for (const view of views) {
        view.layer.replaceChildren();
        view.status.hidden = true;
        view.sample.classList.toggle('selectable-sample', Boolean(cluster));
        if (!cluster) continue;
        const range = textRange(view.sample, cluster);
        if (!range) continue;
        ranges.push(range);
        const stage = view.stage.getBoundingClientRect();
        const message = view.message.getBoundingClientRect();
        const rects = visibleRects(range, stage, message, getComputedStyle(view.message).overflow);
        for (const rect of rects) {
          const box = document.createElement('div');
          box.className = `selection-outline${rect.caret ? ' selection-caret' : ''}`;
          Object.assign(box.style, {
            left: `${rect.left - stage.left}px`,
            top: `${rect.top - stage.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
          view.layer.append(box);
        }
        view.status.hidden = rects.length > 0;
      }
      if (nativeHighlight) {
        if (ranges.length) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
        else CSS.highlights.delete(HIGHLIGHT_NAME);
      }
    },
  };
}
