export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/** Inline script — run before paint to avoid a flash of the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
