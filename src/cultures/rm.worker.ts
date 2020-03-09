import { pcx_read } from './pcx';

async function call_pcx_read(ev: MessageEvent) {
  const blob: Blob = ev.data.blob;
  const mask: Blob | undefined = ev.data.mask;
  const result = await pcx_read(blob, mask);

  // debugger;
  postMessage({
    width: result.width,
    height: result.height,
    data: result.data
    // @ts-ignore
  }, [result.data.buffer]);
}

onmessage = function(ev: MessageEvent) {
  switch (ev.data.method) {
    case 'pcx_read':
      call_pcx_read(ev);
      break;
  }
}
