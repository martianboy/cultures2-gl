interface DraggableProps {
  onDrag?(e: { dx: number, dy: number }): void;
  onDragEnd?(): void;
}

interface DraggableState extends DraggableProps {
  dispose(): void;

  isDragging: boolean;
  origin: { x: number; y: number; };
  translation: { dx: number; dy: number; };
}

const draggables = new WeakMap<HTMLElement, DraggableState>();

function getState(ev: MouseEvent) {
  if (!ev.target) return;
  return draggables.get(ev.target as unknown as HTMLElement);
}
function mousedownHandler(ev: MouseEvent) {
  const state = getState(ev);
  if (!state) return;

  // if (ev.button !== 1) return;

  ev.preventDefault();

  state.isDragging = true;
  state.origin = {x: ev.movementX, y: ev.movementY};

  let el = ev.target as unknown as HTMLElement;
  if (el.requestPointerLock) {
    el.requestPointerLock();
  };

  startDragging(ev.target as unknown as HTMLElement);
}

function handleMouseMove(ev: MouseEvent) {
  const state = getState(ev);
  if (!state) return;

  const dx = -ev.movementX;
  const dy = -ev.movementY;

  state.translation = { dx, dy };
  if (state.onDrag) state.onDrag({ dx, dy });
}

function handleMouseUp(ev: MouseEvent) {
  const state = getState(ev);
  if (!state) return;

  state.isDragging = false;
  stopDragging(ev.target as unknown as HTMLElement);

  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function startDragging(el: HTMLElement) {
  el.addEventListener('mousemove', handleMouseMove);
  el.addEventListener('mouseup', handleMouseUp);
}

function stopDragging(el: HTMLElement) {
  const state = draggables.get(el);
  if (!state) return;

  el.removeEventListener('mousemove', handleMouseMove);
  el.removeEventListener('mouseup', handleMouseUp);

  state.translation = { dx: 0, dy: 0 };
  if (state.onDragEnd) state.onDragEnd();
}

export function draggable(el: HTMLElement, options: DraggableProps) {
  const existing_draggable = draggables.get(el);
  if (existing_draggable) return existing_draggable.dispose;

  const dispose = () => {
    el.removeEventListener("mousedown", mousedownHandler);
  };

  const new_draggable: DraggableState = {
    isDragging: false,
    origin: { x: 0, y: 0 },
    translation: { dx: 0, dy: 0 },
    dispose,

    ...options
  };

  el.addEventListener("mousedown", mousedownHandler);
  draggables.set(el, new_draggable);
}