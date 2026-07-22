// Reading a chosen local file as text — the one place the UI touches File I/O.
//
// Used by the Import screen (Choose Markdown file) and the restore file picker.
// Reading a user-selected file is local and side-effect-free; the text is handed
// to the caller, which decides what to do with it. The input is reset afterward so
// choosing the same file twice fires `change` again.

/**
 * Read the first file selected on `input` as UTF-8 text and pass it to `onText`.
 * Silently does nothing when no file is chosen. Resets the input value so the same
 * file can be re-selected.
 */
export async function readTextFile(
  input: HTMLInputElement,
  onText: (text: string) => void,
): Promise<void> {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    onText(text);
  } catch {
    // A read failure leaves the caller's state untouched; the picker can retry.
  }
}
