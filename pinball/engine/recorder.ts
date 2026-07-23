const RECORDING_FPS = 30;

/** 캔버스 화면을 webm 파일로 녹화한다. */
export class VideoRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {}

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  start(): void {
    if (this.isRecording) return;
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('이 브라우저는 화면 녹화를 지원하지 않습니다');
    }

    this.chunks = [];
    const stream = this.canvas.captureStream(RECORDING_FPS);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    });
    recorder.addEventListener('stop', () => {
      this.save();
    });

    recorder.start();
    this.recorder = recorder;
  }

  stop(): void {
    if (!this.isRecording) return;
    this.recorder?.stop();
    this.recorder = null;
  }

  private save(): void {
    if (this.chunks.length === 0) return;

    const blob = new Blob(this.chunks, { type: 'video/webm' });
    this.chunks = [];

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `marble-roulette-${Date.now()}.webm`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
