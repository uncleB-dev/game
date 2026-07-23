export function rad(degree: number): number {
  return (Math.PI * degree) / 180;
}

function getRegexValue(regex: RegExp, str: string): string {
  const result = regex.exec(str);
  return result ? result[1] : '';
}

export interface ParsedName {
  name: string;
  weight: number;
  count: number;
}

/**
 * "이름/가중치*개수" 형식의 문자열을 파싱한다.
 * 예: "수박/3*2" -> { name: '수박', weight: 3, count: 2 }
 */
export function parseName(nameStr: string): ParsedName | null {
  const weightRegex = /\/(\d+)/;
  const countRegex = /\*(\d+)/;
  const name = getRegexValue(/^\s*([^/*]+)?/, nameStr).trim();
  if (!name) return null;

  const weight = weightRegex.test(nameStr) ? Number.parseInt(getRegexValue(weightRegex, nameStr), 10) : 1;
  const count = countRegex.test(nameStr) ? Number.parseInt(getRegexValue(countRegex, nameStr), 10) : 1;

  return {
    name,
    weight: Number.isNaN(weight) ? 1 : weight,
    count: Number.isNaN(count) || count < 1 ? 1 : count,
  };
}

export function shuffle<T>(originalArray: readonly T[]): T[] {
  const array = originalArray.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** ctx 변환행렬을 보존한 채 콜백을 실행한다. */
export function transformGuard(ctx: CanvasRenderingContext2D, callback: () => void): void {
  const transform = ctx.getTransform();
  const alpha = ctx.globalAlpha;
  try {
    callback();
  } finally {
    ctx.setTransform(transform);
    ctx.globalAlpha = alpha;
  }
}

export const lenSq = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
