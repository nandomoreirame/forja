let suspended = false;

export function suspendUiSaves(): void {
  suspended = true;
}

export function resumeUiSaves(): void {
  suspended = false;
}

export function isUiSaveSuspended(): boolean {
  return suspended;
}
