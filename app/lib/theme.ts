export type ThemeChoice = 'systeem' | 'licht' | 'donker'

export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'systeem', label: 'Systeem' },
  { value: 'licht', label: 'Licht' },
  { value: 'donker', label: 'Donker' },
]

export const THEME_STORAGE_KEY = 'theme'

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return THEME_CHOICES.some(c => c.value === value)
}

export function isDarkTheme(choice: ThemeChoice, systemPrefersDark: boolean): boolean {
  return choice === 'donker' || (choice === 'systeem' && systemPrefersDark)
}

// Runs in <head> before the page paints, so a dark page doesn't flash white first. It also
// follows the system setting while the choice is "systeem". Plain JS: it can't import anything.
export const THEME_INIT_SCRIPT = `(function () {
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    var choice = null;
    try { choice = localStorage.getItem('${THEME_STORAGE_KEY}'); } catch (e) {}
    var dark = choice === 'donker' || (choice !== 'licht' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
  }
  apply();
  media.addEventListener('change', apply);
})();`
