export const shareLink = () => ({
  copied: false,

  async copy(this: {
    copied: boolean;
    $refs: Record<string, HTMLInputElement>;
  }) {
    const input = this.$refs.url;
    if (input === undefined) return;

    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      input.setSelectionRange(0, input.value.length);
    }

    this.copied = true;
    window.setTimeout(() => {
      this.copied = false;
    }, 1600);
  },
});
