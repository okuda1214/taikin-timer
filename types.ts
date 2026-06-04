@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

@layer utilities {
  /* Dynamic glowing effects or custom utilities */
  .glow-shadow {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
  }
}
