/**
 * 가벼운 Web Audio 효과음 — 음원 파일 없이 오실레이터로 합성한다.
 * (구 SpeedTouch(game.unclebstudio.com/speedtouch)의 AudioSynth 를 이식)
 *
 * AudioContext 는 브라우저 자동재생 정책상 사용자 제스처 이후에만 살아나므로
 * 첫 호출 시점에 지연 생성하고, suspended 상태면 resume 을 시도한다.
 */

type Ctx = AudioContext | null;

export class Sfx {
  private ctx: Ctx = null;
  private enabled = true;

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  /** 사용자 제스처 안에서 호출해 오디오 컨텍스트를 깨운다. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }

  private ensure(): Ctx {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    type: OscillatorType = "sine",
    duration = 0.1,
    vol = 0.35,
  ) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** 터치 팝 — 연타할수록 음이 올라가 콤보감을 준다. */
  pop(step: number) {
    const pitch = 1 + (step % 20) * 0.05;
    this.tone(520 * pitch, "triangle", 0.06, 0.22);
  }

  /** READY / SET 신호음 */
  cue(high = false) {
    this.tone(high ? 660 : 440, "sine", 0.18, 0.3);
  }

  /** GO! 출발음 */
  start() {
    this.tone(880, "square", 0.28, 0.34);
  }

  /** 종료 휘슬 (하강 2음) */
  end() {
    this.tone(660, "sine", 0.16, 0.3);
    window.setTimeout(() => this.tone(392, "sine", 0.4, 0.3), 160);
  }
}
