import { describe, expect, it } from 'vitest';
import { newPropId, PROPS_STORAGE_KEY, readProps, removeProp, saveProp, writeProps } from '../propStore';
import { savedProp } from './renderFixtures';

/** In-memory Storage with optional failure modes. */
function fakeStorage({ throwOnGet = false, throwOnSet = false } = {}) {
  const data = new Map<string, string>();
  return {
    data,
    getItem(k: string) {
      if (throwOnGet) throw new Error('SecurityError');
      return data.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      if (throwOnSet) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
  };
}

describe('propStore — device-only prop lines', () => {
  it('save then read returns the prop under the versioned key', () => {
    const s = fakeStorage();
    expect(saveProp(savedProp(), s)).toBe(true);
    expect(readProps(s)).toEqual([savedProp()]);
    expect(JSON.parse(s.data.get(PROPS_STORAGE_KEY) ?? '{}')).toMatchObject({ v: 1 });
    expect(PROPS_STORAGE_KEY).toBe('pare:leans-props:v1');
  });
  it('save with an existing id updates in place (edit line)', () => {
    const s = fakeStorage();
    saveProp(savedProp(), s);
    saveProp(savedProp({ id: 'p2' }), s);
    saveProp(savedProp({ line: 90.5 }), s);
    expect(readProps(s).map((p) => [p.id, p.line])).toEqual([['p1', 90.5], ['p2', 85.5]]);
  });
  it('read: empty storage → []', () => {
    expect(readProps(fakeStorage())).toEqual([]);
    expect(readProps(null)).toEqual([]);
  });
  it('remove drops only that id', () => {
    const s = fakeStorage();
    saveProp(savedProp(), s);
    saveProp(savedProp({ id: 'p2' }), s);
    expect(removeProp('p1', s)).toBe(true);
    expect(readProps(s).map((p) => p.id)).toEqual(['p2']);
  });
  it('corrupt JSON → [] (no crash)', () => {
    const s = fakeStorage();
    s.data.set(PROPS_STORAGE_KEY, '{not json');
    expect(readProps(s)).toEqual([]);
  });
  it('corrupt JSON: wrong version or malformed rows are dropped', () => {
    const s = fakeStorage();
    s.data.set(PROPS_STORAGE_KEY, JSON.stringify({ v: 2, props: [savedProp()] }));
    expect(readProps(s)).toEqual([]);
    s.data.set(PROPS_STORAGE_KEY, JSON.stringify({ v: 1, props: [savedProp(), { id: 'x' }, null, savedProp({ id: 'p3', stat: 'nope' as never })] }));
    expect(readProps(s).map((p) => p.id)).toEqual(['p1']);
  });
  it('storage throws on read → []; on write → false', () => {
    expect(readProps(fakeStorage({ throwOnGet: true }))).toEqual([]);
    expect(saveProp(savedProp(), fakeStorage({ throwOnSet: true }))).toBe(false);
    expect(writeProps([], null)).toBe(false);
  });
  it('ids are unique', () => {
    expect(new Set(Array.from({ length: 50 }, newPropId)).size).toBe(50);
  });
});
