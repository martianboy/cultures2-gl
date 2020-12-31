import React, { useCallback } from "react";
import { CulturesFS } from "../../cultures/fs";

import "./Game.css";
import { createGame } from "../../game";

export const Game: React.FC<{
  libFs: CulturesFS;
  userMap?: CulturesFS;
}> = ({ libFs: fs, userMap }) => {
  const canvasRef = useCallback((canvas: HTMLCanvasElement) => {
    if (canvas !== null) {
      createGame(fs, canvas, userMap);
    }
  }, [fs, userMap]);

  return <canvas ref={canvasRef}></canvas>;
};
