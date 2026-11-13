/**
 * SACAB TV – Bilingual Support (Somali / English)
 */
const translations = {
  en: {
    // Nav
    home: "Home",
    search: "Search",
    categories: "Categories",
    myList: "My List",
    profile: "Profile",
    settings: "Settings",
    notifications: "Notifications",
    // Auth
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    fullName: "Full Name",
    phone: "Phone Number",
    forgotPassword: "Forgot Password?",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    signUp: "Sign Up",
    signIn: "Sign In",
    logout: "Log Out",
    // Home
    trending: "Trending Now",
    recentlyAdded: "Recently Added",
    popularAnime: "Popular Anime",
    popularKdrama: "Popular K-Dramas",
    movies: "Movies",
    continueWatching: "Continue Watching",
    topRated: "Top Rated",
    watchNow: "Watch Now",
    moreInfo: "More Info",
    // Player
    play: "Play",
    pause: "Pause",
    nextEpisode: "Next Episode",
    prevEpisode: "Previous Episode",
    // Profile
    editProfile: "Edit Profile",
    changePassword: "Change Password",
    language: "Language",
    watchHistory: "Watch History",
    favorites: "Favorites",
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    searchPlaceholder: "Search movies, anime, dramas...",
    noResults: "No results found",
    addToList: "Add to My List",
    removeFromList: "Remove from My List",
    seasons: "Seasons",
    episodes: "Episodes",
    // Admin
    adminDashboard: "Admin Dashboard",
    users: "Users",
    content: "Content",
    ads: "Advertisements",
    analytics: "Analytics",
    overview: "Overview",
    // Errors
    errorGeneric: "Something went wrong. Please try again.",
    errorLogin: "Invalid email or password.",
    errorNetwork: "Network error. Check your connection."
  },
  so: {
    home: "Hoyga",
    search: "Raadi",
    categories: "Qaybaha",
    myList: "Liiskayga",
    profile: "Profile",
    settings: "Settings",
    notifications: "Ogeysiisyada",
    login: "Gal",
    register: "Isdiiwaangeli",
    email: "Email",
    password: "Furaha sirta",
    confirmPassword: "Xaqiiji furaha",
    fullName: "Magaca buuxa",
    phone: "Lambarka telefoonka",
    forgotPassword: "Ma illowday furaha?",
    noAccount: "Akoon ma lihid?",
    haveAccount: "Akoon ma haysataa?",
    signUp: "Isdiiwaangeli",
    signIn: "Gal",
    logout: "Ka bax",
    trending: "Kuwa ugu caansan",
    recentlyAdded: "Dhawaan la daray",
    popularAnime: "Anime-ka caanka ah",
    popularKdrama: "K-Drama-yada caanka ah",
    movies: "Filimada",
    continueWatching: "Sii daawo",
    topRated: "Kuwa ugu qiimaha badan",
    watchNow: "Hadda daawo",
    moreInfo: "Macluumaad dheeraad",
    play: "Ciyaar",
    pause: "Hakad",
    nextEpisode: "Qaybta xigta",
    prevEpisode: "Qaybta hore",
    editProfile: "Wax ka beddel Profile",
    changePassword: "Beddel furaha",
    language: "Luqadda",
    watchHistory: "Taariikhda daawashada",
    favorites: "Kuwa la jecel yahay",
    loading: "Waa la soo rarayaa...",
    save: "Kaydi",
    cancel: "Jooji",
    delete: "Tirtir",
    searchPlaceholder: "Raadi filim, anime, drama...",
    noResults: "Wax natiijo ah lama helin",
    addToList: "Ku dar Liiskayga",
    removeFromList: "Ka saar Liiskayga",
    seasons: "Xilliyada",
    episodes: "Qaybaha",
    adminDashboard: "Dashboard-ka Admin",
    users: "Isticmaalayaasha",
    content: "Content-ka",
    ads: "Xayaysiisyo",
    analytics: "Tirakoobka",
    overview: "Guud ahaan",
    errorGeneric: "Wax baa khaldamay. Fadlan isku day mar kale.",
    errorLogin: "Email ama furaha waa khaldan.",
    errorNetwork: "Khalad shabakadeed. Hubi internetka."
  }
};

let currentLang = localStorage.getItem('sacab_lang') || 'en';

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('sacab_lang', lang);
  document.documentElement.lang = lang;
  applyTranslations();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
}

window.i18n = { t, setLanguage, applyTranslations, getLang: () => currentLang };
