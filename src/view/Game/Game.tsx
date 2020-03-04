import React, { useCallback } from "react";
import { CulturesFS } from "../../cultures/fs";

import "./Game.css";
import { createGame } from "../../game";

export const Game: React.FC<{
  fs: CulturesFS;
}> = ({ fs }) => {
  const canvasRef = useCallback((canvas: HTMLCanvasElement) => {
    if (canvas !== null) {
      createGame(fs, canvas);
    }
  }, [fs]);

  return <canvas ref={canvasRef}></canvas>;
};
