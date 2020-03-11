import { triangulate_map } from './tessellate';

async function call_triangulate_map(ev: MessageEvent) {
  const { width, height, elevation } = ev.data;
  const data = triangulate_map(width, height, elevation);

  postMessage({
    data: data.buffer
    // @ts-ignore
  }, [data.buffer]);
}

onmessage = function(ev: MessageEvent) {
  switch (ev.data.method) {
    case 'triangulate_map':
      call_triangulate_map(ev);
      break;
  }
}
