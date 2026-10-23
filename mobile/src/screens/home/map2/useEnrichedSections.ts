import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { fetchLevels } from '../../../services/bootCache';
import { levelStars } from '../../../utils/stars';
import type { RecommendedNext, SurahLevel } from '../../../types/api';
import { stageToNodeStatus, trustedLevels, type NodeStatus } from '../map/mapModel';
import { sortedLevels } from '../map/useMapData';
import { MAP2_SECTIONS, type Map2NodeData, type Map2Section } from './map2Model';

// Same enrichment rules as MapScreen.tsx (enrichedSections, firstActiveNode,
// the full-levels backfill), kept separate so the current map stays untouched
// until map2 replaces it. The non-negotiable rule carried over: a node is only
// ever shown completed / starred from real backend data, never guessed.
export function useEnrichedSections(
  fullLevels: Record<number, SurahLevel[]>,
  firstLevel: Record<number, SurahLevel>,
  setFullLevels: Dispatch<SetStateAction<Record<number, SurahLevel[]>>>,
  recommended: RecommendedNext | null,
  // Surahs on screen right now, comma-joined. Backfill only fetches these.
  visibleSurahs: string,
) {
  const cacheRef = useRef(new Map<Map2Section, { rawFull: unknown; first: unknown; out: Map2Section }>());
  const sections = useMemo(() => {
    const prev = cacheRef.current;
    const next: typeof prev = new Map();
    const result = MAP2_SECTIONS.map(section => {
      const rawFull = fullLevels[section.surahNum];
      const first = firstLevel[section.surahNum];
      const hit = prev.get(section);
      if (hit && hit.rawFull === rawFull && hit.first === first) { next.set(section, hit); return hit.out; }
      const full = trustedLevels(section.surahNum, rawFull);
      const out: Map2Section = {
        ...section,
        nodes: section.nodes.map((node): Map2NodeData => {
          const group = full?.[node.surahLevelIdx];
          if (group) {
            return { ...node, id: group.lesson_group_id, status: stageToNodeStatus(group.status), stars: levelStars(group), startAyah: group.start_ayah, endAyah: group.end_ayah, isSpecial: group.is_special, resolved: true };
          }
          if (node.surahLevelIdx === 0 && first) {
            return { ...node, id: first.lesson_group_id, status: stageToNodeStatus(first.status), stars: levelStars(first), startAyah: first.start_ayah, endAyah: first.end_ayah, isSpecial: first.is_special, resolved: true };
          }
          if (node.surahLevelIdx === 0) return { ...node, status: 'pending' as NodeStatus, resolved: false };
          if (first?.status === 'completed') return { ...node, status: 'available' as NodeStatus, stars: 0, resolved: false };
          return { ...node, resolved: false };
        }),
      };
      next.set(section, { rawFull, first, out });
      return out;
    });
    cacheRef.current = next;
    return result;
  }, [fullLevels, firstLevel]);

  const nodesBySlot = useMemo(() => {
    const out: { section: Map2Section; node: Map2NodeData }[] = [];
    for (const section of sections) for (const node of section.nodes) out[node.slot] = { section, node };
    return out;
  }, [sections]);

  // The backend's own "start here" answer, by id; before that surah's real
  // ids land, the first startable node of the recommended surah.
  const activeSlot = useMemo(() => {
    if (!recommended) return null;
    const section = sections.find(sec => sec.surahNum === recommended.surah_number);
    if (!section) return null;
    const byId = section.nodes.find(n => n.id === recommended.lesson_group_id);
    if (byId) return byId.slot;
    const pick =
      section.nodes.find(n => n.status === 'current' || n.status === 'available' || n.status === 'pending')
      ?? section.nodes.find(n => n.status !== 'completed')
      ?? section.nodes[0];
    return pick.slot;
  }, [sections, recommended]);

  // Real levels for the recommended surah and every on-screen surah whose
  // first level reads completed, replacing the 'available' placeholder.
  const recommendedSurah = recommended?.surah_number ?? null;
  const onScreen = visibleSurahs ? visibleSurahs.split(',').map(Number) : [];
  const needFull = [recommendedSurah, ...onScreen]
    .filter((n, i, arr): n is number => n != null && arr.indexOf(n) === i)
    .filter(n => !fullLevels[n] && (n === recommendedSurah || firstLevel[n]?.status === 'completed'))
    .join(',');
  useEffect(() => {
    if (!needFull) return;
    let cancelled = false;
    (async () => {
      for (const surahNum of needFull.split(',').map(Number)) {
        try {
          const levels = await fetchLevels(surahNum);
          if (cancelled) return;
          setFullLevels(prev => ({ ...prev, [surahNum]: sortedLevels(levels) }));
        } catch (e) {
          console.warn(`[Map2] full-levels backfill failed for surah ${surahNum}:`, e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [needFull, setFullLevels]);

  return { sections, nodesBySlot, activeSlot };
}
