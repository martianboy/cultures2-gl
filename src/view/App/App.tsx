import React, { useState } from "react";
import "./App.css";
import { load_fs, CulturesFS } from "../../cultures/fs";

import { Game } from "../Game/Game";

function cancel(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
}

function App() {
  const [fs, setFS] = useState<CulturesFS>();

  async function load_object_file(file: File) {
    const fs = await load_fs(file);
    setFS(fs);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    let files = e.dataTransfer.files;

    if (!files[0].name.endsWith(".lib")) {
      console.error("Unknown file type.");
      return;
    }

    load_object_file(files[0]);
  }

  let canvas = null;

  if (fs) {
    canvas = <Game fs={fs} />;
  }

  return (
    <div
      className="App"
      onDragOver={cancel}
      onDragEnter={cancel}
      onDrop={e => onDrop(e)}
    >
      <header className="App-header"></header>
      {canvas}
    </div>
  );
}

export default App;
