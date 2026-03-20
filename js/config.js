// ─────────────────────────────────────────────────────────────────────────────
// config.js — Telnix Admin Panel Configuration
// Update these values if you ever change your Supabase project.
// ─────────────────────────────────────────────────────────────────────────────

export const SB   = 'https://nsauxvxopajdsgglcvpk.supabase.co';
export const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYXV4dnhvcGFqZHNnZ2xjdnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDYyNDIsImV4cCI6MjA4OTQyMjI0Mn0.YMblltS5nm9TIRRi_ysciAJoO4zljnlTTfJRBONnBxw';
export const ORG  = '4c0a98ac-c971-4d04-9e51-655f323b512e';

export const ALL_CATS = [
  'social','news','productivity','shopping','entertainment','education',
  'technology','finance','health','travel','gaming','sports',
  'adult','gambling','malware','phishing','streaming','messaging',
  'search','government','unknown',
];

// Used by URL Tester for client-side category guessing
export const CAT_MAP = {
  social:       ['facebook.com','twitter.com','instagram.com','tiktok.com','snapchat.com','linkedin.com','reddit.com'],
  news:         ['bbc.com','cnn.com','reuters.com','nytimes.com','theguardian.com'],
  productivity: ['google.com','microsoft.com','gmail.com','outlook.com','slack.com','notion.so'],
  streaming:    ['youtube.com','netflix.com','spotify.com','twitch.tv','primevideo.com'],
  gaming:       ['steam.com','epicgames.com','roblox.com','ea.com'],
  shopping:     ['amazon.com','ebay.com','flipkart.com','etsy.com'],
  finance:      ['paypal.com','stripe.com','robinhood.com','coinbase.com'],
  gambling:     ['betway.com','bet365.com','draftkings.com','fanduel.com'],
};
