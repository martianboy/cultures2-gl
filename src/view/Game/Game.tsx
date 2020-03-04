import React, { useCallback } from "react";
import { CulturesFS } from "../../cultures/fs";

import "./Game.css";
import { createGame } from "../../game";

export const Game: React.FC<{
  fs: CulturesFS;
  customMap?: CulturesFS;
}> = ({ fs, customMap }) => {
  const canvasRef = useCallback((canvas: HTMLCanvasElement) => {
    if (canvas !== null) {
      createGame(fs, canvas, customMap);
    }
  }, [fs, customMap]);

  return <canvas ref={canvasRef}></canvas>;
};
