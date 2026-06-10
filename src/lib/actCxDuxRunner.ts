/** Registro del motor Act. Cx. en layout (SyncStatusIndicator) para iniciar/reanudar pasos. */
let runner: (() => Promise<void>) | null = null;

export function registerActCxDuxRunner(fn: (() => Promise<void>) | null): void {
  runner = fn;
}

export function triggerActCxDuxRunner(): void {
  void runner?.();
}
