// config.js — Telnix Admin Panel Configuration

export const SB   = 'https://nsauxvxopajdsgglcvpk.supabase.co';
export const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYXV4dnhvcGFqZHNnZ2xjdnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDYyNDIsImV4cCI6MjA4OTQyMjI0Mn0.YMblltS5nm9TIRRi_ysciAJoO4zljnlTTfJRBONnBxw';
export const ORG  = '4c0a98ac-c971-4d04-9e51-655f323b512e';

export const ALL_CATS = [
  'social','news','productivity','shopping','entertainment','education',
  'technology','finance','health','travel','gaming','sports',
  'adult','gambling','malware','phishing','streaming','messaging',
  'search','government','unknown',
];

export const CAT_COLORS = {
  social:'#a855f7',news:'#3b82f6',productivity:'#10b981',shopping:'#f59e0b',
  entertainment:'#ec4899',education:'#06b6d4',technology:'#6366f1',
  finance:'#22c55e',health:'#ef4444',travel:'#f97316',gaming:'#8b5cf6',
  sports:'#14b8a6',adult:'#f43f5e',gambling:'#dc2626',malware:'#ef4444',
  phishing:'#f59e0b',streaming:'#e11d48',messaging:'#0ea5e9',
  search:'#64748b',government:'#475569',unknown:'#374151',
};

export const THREAT_CATEGORIES = [
  {id:'malware',label:'Malware',color:'#ef4444'},
  {id:'phishing',label:'Phishing',color:'#f97316'},
  {id:'ransomware',label:'Ransomware',color:'#dc2626'},
  {id:'botnet',label:'Botnet C&C',color:'#991b1b'},
  {id:'cryptomining',label:'Cryptomining',color:'#d97706'},
  {id:'spyware',label:'Spyware',color:'#7c3aed'},
  {id:'adware',label:'Adware',color:'#6d28d9'},
  {id:'trojan',label:'Trojan',color:'#b91c1c'},
  {id:'exploit',label:'Exploit Kit',color:'#c2410c'},
  {id:'dga',label:'DGA Domain',color:'#92400e'},
  {id:'homograph',label:'Homograph Attack',color:'#1d4ed8'},
  {id:'typosquat',label:'Typosquatting',color:'#1e40af'},
  {id:'newly_registered',label:'Newly Registered',color:'#0369a1'},
  {id:'tor_exit',label:'Tor Exit Node',color:'#374151'},
  {id:'vpn',label:'VPN / Proxy',color:'#4b5563'},
];

export const CAT_MAP = {
  social:       ['facebook.com','twitter.com','instagram.com','tiktok.com','snapchat.com','linkedin.com','reddit.com','pinterest.com'],
  news:         ['bbc.com','cnn.com','reuters.com','nytimes.com','theguardian.com','ndtv.com','timesofindia.com'],
  productivity: ['google.com','microsoft.com','gmail.com','outlook.com','slack.com','notion.so','trello.com'],
  streaming:    ['youtube.com','netflix.com','spotify.com','twitch.tv','primevideo.com','hotstar.com','disneyplus.com'],
  gaming:       ['steam.com','epicgames.com','roblox.com','ea.com'],
  shopping:     ['amazon.com','ebay.com','flipkart.com','etsy.com'],
  finance:      ['paypal.com','stripe.com','robinhood.com','coinbase.com'],
  gambling:     ['betway.com','bet365.com','draftkings.com','fanduel.com'],
  adult:        ['pornhub.com','xvideos.com','xhamster.com'],
  government:   ['gov.in','nic.in','gov.uk','gov.au'],
};

export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
