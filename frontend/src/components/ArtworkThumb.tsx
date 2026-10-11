import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { Artwork, computeDots } from "../drawing";
import { DotsLayer, StrokesLayer } from "./ArtworkLayers";

export function ArtworkThumb({ art, size }: { art: Artwork; size: number }) {
  const grid = useMemo(() => (art.grid ? computeDots(art.grid) : null), [art.grid]);
  return (
    <View style={{ width: size, height: size, backgroundColor: art.background }}>
      <Svg width={size} height={size} viewBox={`0 0 ${art.width} ${art.height}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={art.width} height={art.height} fill={art.background} />
        <StrokesLayer strokes={art.strokes} background={art.background} />
        {grid && <DotsLayer dots={grid.dots} spacing={grid.spacing} background={art.background} />}
      </Svg>
    </View>
  );
}
