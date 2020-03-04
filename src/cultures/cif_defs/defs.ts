export const GfxLandscape = {
  EditName: 'string',
  EditGroups: 'string[]',
  LogicType: 'number',
  LogicMaximumValency: 'number',
  LogicIsWorkable: 'boolean',
  logicispileableonmap: 'boolean',
  LogicWalkBlockArea: 'number[][]',
  LogicBuildBlockArea: 'number[][]',
  LogicWorkArea: 'number[][]',
  GfxBobLibs: 'bmd',
  GfxPalette: 'string[]',
  GfxFrames: '[number, number[]]',
  GfxStatic: 'boolean',
  GfxLoopAnimation: 'boolean',
  GfxShadingFactor: 'number',
  GfxUserFXMatrix: 'number',
  GfxDynamicBackground: 'boolean',
  gfxdrawvoidever: 'boolean',
  GfxTransition: '[number,string]',
}

export const GfxPattern = {
  EditName: 'string',
  EditGroups: 'string[]',
  LogicType: 'number',
  GfxTexture: 'string',
  GfxCoordsA: 'number[]',
  GfxCoordsB: 'number[]',
}

export const jobgraphics = {
  logictribe: 'number',
  logicjob: 'number',
  gfxbobmanagerbody: 'string',
  gfxpalettebody: 'string',
}

export const jobbasegraphics = {
  logictribe: 'number',
  logicjob: 'number',
  gfxbobmanagerbody: '[number,bmd]',
  gfxbobmanagerhead: '[number,bmd]',
  gfxpalettebasebody: 'string',
  gfxpalettebasehead: 'string',
  gfxpaletterandom: 'string',
}

export const jobchangegraphics = {
  logictribe: 'number',
  logicjob: 'number',
  gfxbobmanagerbody: '[number,bmd]',
  gfxbobmanagerhead: '[number,bmd]',
  gfxpalettebasebody: 'string',
  gfxpalettebasehead: 'string',
  gfxpaletterandom: 'string',
}

export const GfxHouse = {
  EditName: 'string',
  EditGroups: 'string[]',
  LogicMaximumSize: 'number',
  LogicType: '[number,number]',
  LogicTribeType: 'number',
  logichitpoints: '[number,number]',
  LogicConstructionGoods: '[number,number[]]',
  LogicBuildBlockArea: 'number[]',
  LogicDoorPoint: 'number[]',
  LogicWalkBlockArea: '[number,number[]]',
  LogicConstructionWorkArea: '[number,number[]]',
  GfxBobLibs: 'bmd',
  GfxPalette: 'string[]',
  GfxBobId: '[number,number]',
  GfxShadingFactor: 'number',
  GfxBobConstructionLayer: '[number,number[][]]',
  Gfxdoorbobid: '[0,number[]]',
  GfxFlagPoint: '[number,number[]]',
  GfxFirePoint: '[number,number[][]]',
  GfxSmokePoint: '[number,number[][]]',
}