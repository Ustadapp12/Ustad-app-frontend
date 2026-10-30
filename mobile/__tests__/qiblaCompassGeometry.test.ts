import { compassGeometry } from '../src/screens/pray/QiblaCompass';

type Pt = [number, number];

// Rotating shapes in dial coordinates (origin = dial centre, y down), as
// QiblaCompass lays them out before any rotation.
function rotatingPoints(size: number, bearing: number): Pt[] {
  const g = compassGeometry(size);
  const needle: Pt[] = [
    [0, -g.needleLength], [-g.needleHalfWidth, 0], [g.needleHalfWidth, 0], [0, g.needleLength],
  ];
  const ticks: Pt[] = [];
  for (const deg of [0, 90, 180, 270]) {
    const top = -size / 2 + g.tickInset;
    const w = g.tickWidth / 2;
    for (const p of [[-w, top], [w, top], [-w, top + g.tickLength], [w, top + g.tickLength]] as Pt[]) {
      ticks.push(rotate(p, deg));
    }
  }
  return [...ticks, ...needle.map(p => rotate(p, bearing))];
}

function rotate([x, y]: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}

describe('QiblaCompass geometry', () => {
  for (const size of [56, 70, 84, 105]) {
    it(`keeps every rotating part inside the white face at every angle (size ${size})`, () => {
      const inner = size / 2 - compassGeometry(size).ring;
      let worst = 0;
      for (let bearing = 0; bearing < 360; bearing++) {
        for (let heading = 0; heading < 360; heading++) {
          for (const p of rotatingPoints(size, bearing)) {
            const [x, y] = rotate(p, -heading);
            worst = Math.max(worst, Math.hypot(x, y));
          }
        }
      }
      expect(worst).toBeLessThan(inner);
    });
  }

});
