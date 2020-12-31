import React, { useState } from "react";
import "./App.css";
import { load_fs, CulturesFS } from "../../cultures/fs";

import { Game } from "../Game/Game";

function cancel(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
}

function App() {
  const [fs, setFS] = useState<CulturesFS>();
  const [userMap, setUserMap] = useState<CulturesFS>();

  async function load_object_file(file: File) {
    const fs = await load_fs(file);
    setFS(fs);
  }

  async function load_custom_map(file: File) {
    const fs = await load_fs(file);
    setUserMap(fs);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    let files = e.dataTransfer.files;

    if (files[0].name.endsWith(".lib")) {
      return load_object_file(files[0]);
    }

    if (files[0].name.endsWith(".c2m")) {
      return load_custom_map(files[0]);
    }

    console.error("Unknown file type.");
  }

  let canvas = null;

  if (fs) {
    canvas = <Game libFs={fs} userMap={userMap} />;
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
