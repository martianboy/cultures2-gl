import { read_file } from '../utils/file_reader';
import { SequentialDataView } from '../utils/dataview';

export interface FSHeader {
  version: number;
  num_dirs: number;
  num_files: number;
}

export interface DirInfo {
  path: string;
  depth: number;
}

export interface FileInfo {
  path: string;
  offset: number;
  length: number;
}

export class CulturesFS {
  datafile: File;
  files: Map<string, FileInfo>;

  constructor(datafile: File, files: FileInfo[]) {
    this.datafile = datafile;

    /** @type {Map<string, import('./fs').FileInfo>} */
    this.files = new Map();
    for (let fi of files) {
      this.files.set(fi.path, fi);
    }
  }

  /**
   * @returns {IterableIterator<import('./fs').FileInfo>}
   */
  ls() {
    return this.files.values();
  }

  open(path: string) {
    const fi = this.files.get(path.toLowerCase());
    if (!fi) throw new Error(`File not found: ${path}`);

    return this.datafile.slice(fi.offset, fi.offset + fi.length);
  }
}

function getHeader(view: SequentialDataView): FSHeader {
  view.seek(0);

  return {
    version: view.getUint32(),
    num_dirs: view.getUint32(),
    num_files: view.getUint32(),
  };
}

function getDirs(n: number, view: SequentialDataView): DirInfo[] {
  /** @type {import('./fs').DirInfo[]} */
  let dirs = [];

  for (let i = 0; i < n; i++) {
    dirs.push({
      path: view.getString(),
      depth: view.getUint32()
    });
  }

  return dirs;
}

function getFiles(n: number, view: SequentialDataView): FileInfo[] {
  /** @type {import('./fs').FileInfo[]} */
  let files = [];

  for (let i = 0; i < n; i++) {
    files.push({
      path: view.getString(),
      offset: view.getUint32(),
      length: view.getUint32()
    });
  }

  return files;
}

export async function load_fs(datafile: File): Promise<CulturesFS> {
  const buffer = await read_file(datafile.slice(0, 200 * 1024));
  const view = new SequentialDataView(buffer);

  const header = getHeader(view);
  const dirs = getDirs(header.num_dirs, view);
  const files = getFiles(header.num_files, view);

  return new CulturesFS(datafile, files);
}