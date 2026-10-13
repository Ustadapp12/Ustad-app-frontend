import React, { useState } from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import Svg, { Defs, Path, Pattern, Image as SvgImage, Rect } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../../../theme/colors';
import { SVG_BG_TILE_H, BIRDS_SRC, CLOUD_SRC, GRASS_SRC, BRICK_SRC, SKY_SRC, MOUNTAINS_SRC, MOUNTAINS_ASPECT, MOUNTAINS_PAD_FRACTION, type MapModel } from '../mapModel';
import { Pathway } from './Pathway';

// Everything painted behind the map content: sky gradient and photo, clouds,
// mountain, the tiled grass + brick road, and birds. Depends only on the map
// model (screen size + chapter), so React.memo keeps it from re-rendering on
// every node pulse, card open or scroll-driven state change in MapScreen.
interface Props { M: MapModel; mapInstanceId: string }

function MapBackground({ M, mapInstanceId }: Props) {
  const { MAP_W, MAP_H, sc, DECORATIONS, SKY_BOUNDARY_Y, GRASS_EDGE_D, SKY_CLOUDS, SKY_BIRDS, pathDForYRange } = M;
  // Grass decode-failure retry counters, keyed by tileIdx. Lives here, not
  // in MapScreen, so a retry re-renders only the background. Plain <Image>
  // (unlike react-native-svg's Image) has a real onError — on a
  // memory-constrained device the decode can fail outright rather than just
  // race a cache-miss, and it does not retry itself. Bumping the counter
  // changes that tile's Image `key`, forcing a fresh mount/decode attempt
  // after a short delay instead of leaving it permanently blank.
  const [grassRetry, setGrassRetry] = useState<Record<number, number>>({});

  const skyPct = Math.min(95, (SKY_BOUNDARY_Y / MAP_H) * 100);

  // Mountain: the art's straight base sits exactly on the grass line and the
  // solid skirt below it (see MOUNTAINS_BASE_PAD_PX) goes under the grass,
  // ~11dp of overlap, so the two always meet. Natural aspect, so it's the
  // same proportion of the screen width on every phone.
  const MOUNTAIN_H = Math.round(MAP_W * MOUNTAINS_ASPECT);
  const MOUNTAIN_BOTTOM_Y = SKY_BOUNDARY_Y + Math.round(MOUNTAIN_H * MOUNTAINS_PAD_FRACTION);

  const svgBgTileCount = Math.max(1, Math.ceil(MAP_H / SVG_BG_TILE_H));

  return (
    <>
      {/* Sky-to-ground backdrop. Plain (react-native-linear-gradient), not
          an SVG Rect+LinearGradient — it used to live inside each tile's
          <Svg>, drawn first there so the sky/mountain images (below, in
          document order within that same Svg) painted over it. Once the
          images moved out to plain RN Images so they'd render only once
          instead of once per tile, they had to move BEFORE this in the
          tree to still sit on top of it — but an svg Rect can only stack
          against *other elements inside its own <Svg>*, not against a
          plain Image sibling positioned before that Svg. Moving the
          gradient out here too — as the bottommost layer, before
          anything else — sidesteps that entirely. */}
      <LinearGradient
        colors={['#4FB3E8', '#8ED2F0', colors.mapBg, colors.mapBg]}
        locations={[0, skyPct / 100, Math.min(0.98, skyPct / 100 + 0.03), 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H }}
      />

      {/* Real sky photo — fills the sky band; the jagged grass edge in the
          Svg tiles below overlaps its bottom edge so the seam isn't a
          hard line. Plain Image, not SvgImage — it only ever needs to
          appear once at the true top of the map, not once per tile, and
          plain Image doesn't carry the remount bug per-tile SvgImages
          had. Must render BEFORE the Svg tiles below (earlier siblings
          sit underneath), so their grass/road painting still overlaps
          and masks this image's bottom edge — after them, this covered
          the grass/road instead of blending under it. */}
      <Image
        source={SKY_SRC}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: SKY_BOUNDARY_Y + sc(24) }}
      />

      {/* Sky clouds sit ON the sky, so they render before the mountain
          and the mountain's peaks cover them, never the other way round. */}
      {SKY_CLOUDS.map((c, i) => (
        <Image key={`skycloud${i}`} source={CLOUD_SRC} resizeMode="contain" style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, opacity: 0.9 }} />
      ))}

      {/* The mountain is deliberately NOT tied to hudHeight. It used to
          start below the HUD and get clipped there, so every time the
          HUD grew (search button 64 -> 96px on 09-22, 2x again on 09-29)
          a flat line sliced more of the range off, which read as the sky
          sitting in front of the mountain. Now it renders at the image's
          own aspect ratio (MOUNTAIN_H), bottom-anchored to the grass,
          whole silhouette always visible. The HUD pills are opaque, so
          peaks behind them are fine. */}
      <Image
        source={MOUNTAINS_SRC}
        resizeMode="stretch"
        style={{
          position: 'absolute', left: 0, top: MOUNTAIN_BOTTOM_Y - MOUNTAIN_H,
          width: MAP_W, height: MOUNTAIN_H,
        }}
      />

      {/* SVG background — tiled vertically. react-native-svg rasterizes
          each <Svg> into a single Android bitmap sized to its own
          width×height, and Canvas has a hard ~100MB-per-bitmap ceiling
          (RecordingCanvas.throwIfCannotDraw). A single MAP_W×MAP_H Svg
          blows past that once the map gets tall enough (it did, at 21
          surahs — "Canvas: trying to draw too large bitmap", crashing
          every open). Splitting into fixed-height tiles, each its own
          <Svg> with a viewBox offset into the same coordinate space,
          keeps every individual bitmap small while every child below
          keeps its original absolute x/y — content outside a tile's
          viewBox is simply clipped, so nothing else here needed to
          change.

          All tiles for the current chapter mount up front — no
          scroll-driven virtualization. That used to matter (tiling alone
          doesn't reduce total memory, and at the old season-based map's
          max size, 21 surahs, MAP_H was ~21800dp: 8 tiles, ~236MB of
          bitmap all at once if fully mounted, at or past the whole app
          heap as a native allocation with no JS exception to catch).
          Now that a chapter is capped at NODES_PER_CHAPTER, MAP_H tops
          out around 2-3 tiles regardless of how many surahs exist — the
          same amount virtualization used to keep resident anyway — so
          mounting them all costs about the same while removing the
          window where a tile scrolled into hadn't mounted yet. */}
      {/* Grass used to be an SVG <Pattern> (see the removed comment this
          replaces) exactly like the road still is below. That mechanism
          rasterizes its child <SvgImage> synchronously into a shader the
          instant a Path needs painting (Brush.java#setupPaint) — if
          grass.jpg isn't ALREADY in Fresco's decoded-bitmap cache at that
          exact moment, nothing gets drawn and the blank result is baked
          into the shader permanently, exposing colors.mapBg (flat green)
          underneath. Every tile mount is a fresh native ImageView with no
          memory of prior cache-warmth, so this raced on every fresh tile,
          worse odds on lower-RAM/slower devices, which is why it showed
          up on a Huawei phone specifically. Plain Image, done below, sidesteps
          this entirely: it decodes grass.jpg once and lets Android's own
          BitmapShader/TileMode.REPEAT do the tiling, the same primitive
          Pattern uses internally, just without the synchronous-bake step
          racing an async decode. This is the same fix already applied to
          SKY_SRC/MOUNTAINS_SRC above ("plain Image doesn't carry the
          remount bug per-tile SvgImages had") — grass was just left on
          the old mechanism at the time because Pattern requires an
          SVG-namespace child, and plain Image isn't one. */}
      {(() => {
        const grassPlainTop = SKY_BOUNDARY_Y + sc(20);
        return Array.from({ length: svgBgTileCount }, (_, i) => i)
          .map(tileIdx => {
            const tileTop = tileIdx * SVG_BG_TILE_H;
            const tileH = Math.min(SVG_BG_TILE_H, MAP_H - tileTop);
            // The sky-grass seam (GRASS_EDGE_D) only ever
            // falls inside tile 0 — it's pinned to SKY_BOUNDARY_Y, near
            // the top of the whole map, not to any per-tile offset.
            // Below grassPlainTop the shape GRASS_EDGE_D traces is
            // already a plain rect (see its own comment), so that's the
            // only sliver that still needs the old Pattern mechanism —
            // and the plain Image below fully covers it regardless, so
            // even a repeat of the old bug here is invisible.
            const grassImgTop = tileIdx === 0 ? grassPlainTop : tileTop;
            const grassImgH = tileTop + tileH - grassImgTop;
            // Tile 0's seam Svg: from the sky line to a few dp under the
            // top of the plain grass Image (which paints over the overlap).
            const seamH = Math.min(grassPlainTop + sc(8), tileTop + tileH) - SKY_BOUNDARY_Y;
            return (
              <React.Fragment key={`bgtile-${tileIdx}`}>
                {/* Cropped to the seam strip only (SKY_BOUNDARY_Y down to a
                    little past grassPlainTop). It used to span the whole
                    3000dp tile, and react-native-svg backs every <Svg> with a
                    bitmap of its full size: about 30+MB on a 1080p phone for
                    a strip that is ~20dp tall, the rest being covered by the
                    plain grass Image anyway. userSpaceOnUse keeps the pattern
                    anchored to the same map coordinates, so it looks the same. */}
                {tileIdx === 0 && seamH > 0 && (
                  <Svg
                    width={MAP_W + 2}
                    height={seamH}
                    viewBox={`0 ${SKY_BOUNDARY_Y} ${MAP_W + 2} ${seamH}`}
                    // "none": with the default "meet", a sub-pixel width
                    // mismatch shrinks this very tall tile and centers it,
                    // pushing the grass edge ~2dp below SKY_BOUNDARY_Y and
                    // opening a sky line under the mountain. 2dp wider than
                    // the canvas (which clips it) because the Svg bitmap
                    // rounds its width down, leaving a 2px strip at the
                    // right edge.
                    preserveAspectRatio="none"
                    style={[StyleSheet.absoluteFill, { top: SKY_BOUNDARY_Y, height: seamH, width: MAP_W + 2, overflow: 'hidden' }]}
                  >
                    <Defs>
                      <Pattern id={`grassPattern-${mapInstanceId}-${tileIdx}`} patternUnits="userSpaceOnUse" width={sc(140)} height={sc(140)}>
                        <SvgImage href={GRASS_SRC} x={0} y={0} width={sc(140)} height={sc(140)} preserveAspectRatio="xMidYMid slice" />
                      </Pattern>
                    </Defs>
                    <Path d={GRASS_EDGE_D} fill={`url(#grassPattern-${mapInstanceId}-${tileIdx})`} />
                  </Svg>
                )}

                {/* iOS-only branch: Image's resizeMode="repeat" tiles
                    GRASS_SRC at its raw 640x640px size in POINTS,
                    ignoring density scaling entirely (a documented RN/
                    iOS quirk — Android's own Image implementation does
                    NOT have this problem, see the plain-Image branch
                    below). On a 3x-density iPhone that's a ~640pt tile
                    against a ~390-430pt-wide screen — one repeat
                    spanning more than the whole visible width, reported
                    2026-09-03 as "the grass looks way too big on iOS."
                    Pattern (already used above for tile 0's jagged sky
                    seam) lets the tile size be set explicitly in scaled
                    points instead, same sc(140) every other grass
                    reference on this screen uses, so it matches
                    Android's actual on-screen tile size instead of
                    whatever iOS's repeat happens to render. Safe to use
                    here specifically because the synchronous-bake-vs-
                    async-decode race that made Pattern unusable for
                    grass on Android (see the big comment above — Fresco,
                    Brush.java#setupPaint) is an Android/Fresco-specific
                    mechanism; iOS's SVG renderer doesn't share it. */}
                {grassImgH > 0 && Platform.OS === 'ios' && (
                  <Svg
                    width={MAP_W}
                    height={grassImgH}
                    style={{ position: 'absolute', left: 0, top: grassImgTop }}
                  >
                    <Defs>
                      <Pattern id={`grassPatternIOS-${mapInstanceId}-${tileIdx}`} patternUnits="userSpaceOnUse" width={sc(140)} height={sc(140)}>
                        <SvgImage href={GRASS_SRC} x={0} y={0} width={sc(140)} height={sc(140)} preserveAspectRatio="xMidYMid slice" />
                      </Pattern>
                    </Defs>
                    <Rect x={0} y={0} width={MAP_W} height={grassImgH} fill={`url(#grassPatternIOS-${mapInstanceId}-${tileIdx})`} />
                  </Svg>
                )}
                {grassImgH > 0 && Platform.OS !== 'ios' && (
                  <Image
                    key={`grass-${tileIdx}-${grassRetry[tileIdx] ?? 0}`}
                    source={GRASS_SRC}
                    resizeMode="repeat"
                    style={{ position: 'absolute', left: 0, top: grassImgTop, width: MAP_W, height: grassImgH }}
                    onError={() => {
                      // Capped at 4 retries — on a device this starved
                      // for memory, retrying forever would just keep
                      // competing for the same scarce memory instead of
                      // letting it recover. Give up onto the flat
                      // colors.mapBg fallback rather than hammering it.
                      if ((grassRetry[tileIdx] ?? 0) >= 4) return;
                      // Give the device a moment (GC, whatever else is
                      // competing for memory) rather than retrying
                      // instantly into the same failure.
                      setTimeout(() => {
                        setGrassRetry(prev => ({ ...prev, [tileIdx]: (prev[tileIdx] ?? 0) + 1 }));
                      }, 800);
                    }}
                  />
                )}

                {/* Road — brick-textured, carved-in look. Still Pattern-based
                    (a curved stroke isn't a shape a plain Image can fill),
                    so it keeps the same id-scoping guard as before: Defs
                    ids scoped per tile AND per mount (mapInstanceId) since
                    react-native-svg mis-resolves url(#id) references
                    (patterns silently stop painting, falling back to a
                    flat fill) when the same id exists more than once at
                    once, and tileIdx alone isn't enough — it always
                    restarts at 0, so a remount recreates ids identical to
                    the previous mount's. Sliced to this tile's own
                    y-range (pathDForYRange) rather than handing every
                    tile the whole road — passing the full path to every
                    tile was the actual cost, not the tiling itself. */}
                <Svg
                  width={MAP_W}
                  height={tileH}
                  viewBox={`0 ${tileTop} ${MAP_W} ${tileH}`}
                  style={[StyleSheet.absoluteFill, { top: tileTop, height: tileH, overflow: 'hidden' }]}
                >
                  <Defs>
                    <Pattern id={`brickPattern-${mapInstanceId}-${tileIdx}`} patternUnits="userSpaceOnUse" width={sc(46)} height={sc(46)}>
                      <SvgImage href={BRICK_SRC} x={0} y={0} width={sc(46)} height={sc(46)} preserveAspectRatio="xMidYMid slice" />
                    </Pattern>
                  </Defs>
                  <Pathway d={pathDForYRange(tileTop, tileTop + tileH)} sc={sc} patternId={`brickPattern-${mapInstanceId}-${tileIdx}`} />
                </Svg>
              </React.Fragment>
            );
          });
      })()}
      {/* Birds flying across the sky photo itself */}
      {SKY_BIRDS.map((b, i) => (
        <Image
          key={`skybird${i}`}
          source={BIRDS_SRC}
          resizeMode="contain"
          style={{
            position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.w / 2,
            opacity: 0.85, transform: [{ scaleX: b.flip ? -1 : 1 }],
          }}
        />
      ))}

      {/* Birds — zone-checked like every other decoration */}
      {DECORATIONS.birds.map((b, i) => (
        <Image
          key={`bird${i}`}
          source={BIRDS_SRC}
          style={{ position: 'absolute', left: b.x, top: b.y, width: sc(96), height: sc(48), opacity: 1.0 }}
          resizeMode="contain"
        />
      ))}
    </>
  );
}

export default React.memo(MapBackground);
