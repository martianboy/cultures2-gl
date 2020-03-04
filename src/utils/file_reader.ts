export function read_file(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const reader = new FileReader();

    reader.readAsArrayBuffer(blob);
    reader.addEventListener("abort", rej);
    reader.addEventListener("error", rej);
    reader.addEventListener("loadend", () =>
      res(reader.result as ArrayBuffer)
    );
  });
}
