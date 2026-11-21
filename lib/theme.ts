/** localStorage key for the light/dark choice ("dark" or "light"). No choice yet means: follow the device. */
export const THEME_KEY = "smbhub.theme";

/** Runs before first paint (inline in <head>) so a dark-mode visitor never sees a white flash. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
