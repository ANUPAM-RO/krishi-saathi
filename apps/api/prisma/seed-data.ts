import type { ActivityType, CropSeason } from '@prisma/client';

/**
 * Initial crop master data for the West Bengal pilot.
 * Calendar guidance is deliberately general; dosages are left to local agriculture officers.
 * An agriculture SME should review all content before the pilot.
 */

type Text3 = { en: string; hi: string; bn: string };

interface ActivityLibraryItem {
  type: ActivityType;
  title: Text3;
  description: Text3;
}

export const ACTIVITY_LIBRARY = {
  land_prep: {
    type: 'LAND_PREPARATION',
    title: { en: 'Land preparation', hi: 'खेत की तैयारी', bn: 'জমি তৈরি' },
    description: {
      en: 'Plough the field 2–3 times and level it. Mix in well-rotted farmyard manure (compost).',
      hi: 'खेत की 2–3 बार जुताई करके समतल करें। अच्छी सड़ी गोबर की खाद मिलाएँ।',
      bn: 'জমি ২–৩ বার চাষ দিয়ে সমান করুন। ভালো পচা গোবর সার মিশিয়ে দিন।',
    },
  },
  nursery: {
    type: 'SOWING',
    title: { en: 'Sow seeds in nursery', hi: 'नर्सरी में बीज बोएँ', bn: 'বীজতলায় বীজ বোনা' },
    description: {
      en: 'Sow treated seeds in a well-prepared nursery bed. Keep the bed moist.',
      hi: 'उपचारित बीज अच्छी तरह तैयार नर्सरी में बोएँ। क्यारी में नमी बनाए रखें।',
      bn: 'শোধন করা বীজ ভালোভাবে তৈরি বীজতলায় বুনুন। বীজতলা ভেজা রাখুন।',
    },
  },
  sowing: {
    type: 'SOWING',
    title: { en: 'Sowing', hi: 'बुवाई', bn: 'বীজ বোনা' },
    description: {
      en: 'Sow good quality, treated seed at the right spacing. Make sure the soil has enough moisture.',
      hi: 'अच्छी गुणवत्ता के उपचारित बीज सही दूरी पर बोएँ। मिट्टी में पर्याप्त नमी होनी चाहिए।',
      bn: 'ভালো মানের শোধন করা বীজ সঠিক দূরত্বে বুনুন। মাটিতে যথেষ্ট রস থাকা দরকার।',
    },
  },
  basal_fert: {
    type: 'FERTILIZER',
    title: { en: 'Basal fertilizer', hi: 'बुनियादी खाद (बेसल डोज़)', bn: 'মূল সার প্রয়োগ' },
    description: {
      en: 'Apply the basal dose of fertilizer as recommended by your local agriculture officer, based on a soil test if available.',
      hi: 'स्थानीय कृषि अधिकारी की सलाह अनुसार, हो सके तो मिट्टी जाँच के आधार पर, बुनियादी खाद डालें।',
      bn: 'স্থানীয় কৃষি আধিকারিকের পরামর্শ মতো, সম্ভব হলে মাটি পরীক্ষা করে, মূল সার দিন।',
    },
  },
  transplant_paddy: {
    type: 'TRANSPLANTING',
    title: { en: 'Transplanting', hi: 'रोपाई', bn: 'চারা রোপণ' },
    description: {
      en: 'Transplant healthy seedlings at proper spacing. Keep a thin layer of water in the field.',
      hi: 'स्वस्थ पौधों की सही दूरी पर रोपाई करें। खेत में पानी की पतली परत रखें।',
      bn: 'সুস্থ চারা সঠিক দূরত্বে রোপণ করুন। জমিতে অল্প জল ধরে রাখুন।',
    },
  },
  transplant_veg: {
    type: 'TRANSPLANTING',
    title: { en: 'Transplant seedlings', hi: 'पौध रोपाई', bn: 'চারা লাগানো' },
    description: {
      en: 'Transplant healthy seedlings in the evening and water lightly right after.',
      hi: 'स्वस्थ पौधों की रोपाई शाम को करें और तुरंत हल्की सिंचाई करें।',
      bn: 'বিকেলের দিকে সুস্থ চারা লাগান এবং সঙ্গে সঙ্গে হালকা জল দিন।',
    },
  },
  irrigation: {
    type: 'IRRIGATION',
    title: { en: 'Irrigation', hi: 'सिंचाई', bn: 'সেচ' },
    description: {
      en: 'Irrigate if the soil is dry. Skip irrigation if good rain is expected.',
      hi: 'मिट्टी सूखी हो तो सिंचाई करें। अच्छी बारिश की संभावना हो तो सिंचाई न करें।',
      bn: 'মাটি শুকনো থাকলে সেচ দিন। ভালো বৃষ্টির সম্ভাবনা থাকলে সেচ দেবেন না।',
    },
  },
  weeding: {
    type: 'WEEDING',
    title: { en: 'Weeding', hi: 'निराई', bn: 'আগাছা পরিষ্কার' },
    description: {
      en: 'Remove weeds by hand or with a weeder. A weed-free field in the early weeks gives a better yield.',
      hi: 'हाथ से या वीडर से खरपतवार निकालें। शुरुआती हफ्तों में खेत साफ रखने से पैदावार अच्छी होती है।',
      bn: 'হাতে বা নিড়ানি যন্ত্রে আগাছা তুলুন। প্রথম কয়েক সপ্তাহ জমি পরিষ্কার রাখলে ফলন ভালো হয়।',
    },
  },
  top_dress_1: {
    type: 'FERTILIZER',
    title: { en: 'First top dressing', hi: 'पहली टॉप ड्रेसिंग', bn: 'প্রথম চাপান সার' },
    description: {
      en: 'Apply the first split of nitrogen (urea) as recommended. Apply when the soil is moist, not just before heavy rain.',
      hi: 'सलाह अनुसार नाइट्रोजन (यूरिया) की पहली किस्त डालें। मिट्टी में नमी हो तब डालें, भारी बारिश से ठीक पहले नहीं।',
      bn: 'পরামর্শ মতো নাইট্রোজেন (ইউরিয়া) সারের প্রথম কিস্তি দিন। মাটি ভেজা থাকলে দিন, ভারী বৃষ্টির ঠিক আগে নয়।',
    },
  },
  top_dress_2: {
    type: 'FERTILIZER',
    title: { en: 'Second top dressing', hi: 'दूसरी टॉप ड्रेसिंग', bn: 'দ্বিতীয় চাপান সার' },
    description: {
      en: 'Apply the second split of nitrogen as recommended for your crop.',
      hi: 'अपनी फसल के लिए सलाह अनुसार नाइट्रोजन की दूसरी किस्त डालें।',
      bn: 'আপনার ফসলের জন্য পরামর্শ মতো নাইট্রোজেন সারের দ্বিতীয় কিস্তি দিন।',
    },
  },
  pest_check: {
    type: 'PEST_CONTROL',
    title: { en: 'Pest and disease check', hi: 'कीट और रोग की जाँच', bn: 'পোকা ও রোগ পরীক্ষা' },
    description: {
      en: 'Walk through the field and check leaves and stems for insects or spots. If you see damage, ask your local agriculture officer before spraying.',
      hi: 'खेत में घूमकर पत्तियों और तनों पर कीड़े या धब्बे देखें। नुकसान दिखे तो छिड़काव से पहले स्थानीय कृषि अधिकारी से सलाह लें।',
      bn: 'জমি ঘুরে পাতা ও কাণ্ডে পোকা বা দাগ আছে কিনা দেখুন। ক্ষতি দেখলে স্প্রে করার আগে স্থানীয় কৃষি আধিকারিকের পরামর্শ নিন।',
    },
  },
  earthing_up: {
    type: 'OTHER',
    title: { en: 'Earthing up', hi: 'मिट्टी चढ़ाना', bn: 'গোড়ায় মাটি তোলা' },
    description: {
      en: 'Pull soil up around the base of the plants to support them and keep tubers and roots covered.',
      hi: 'पौधों की जड़ के पास मिट्टी चढ़ाएँ ताकि पौधे मजबूत रहें और कंद व जड़ें ढकी रहें।',
      bn: 'গাছের গোড়ায় মাটি তুলে দিন যাতে গাছ শক্ত থাকে এবং কন্দ ও শিকড় ঢাকা থাকে।',
    },
  },
  first_pick: {
    type: 'HARVEST',
    title: { en: 'First picking', hi: 'पहली तुड़ाई', bn: 'প্রথম তোলা' },
    description: {
      en: 'Start picking mature fruits every few days. Regular picking increases yield.',
      hi: 'पके फल हर कुछ दिनों में तोड़ना शुरू करें। नियमित तुड़ाई से पैदावार बढ़ती है।',
      bn: 'কয়েক দিন পর পর পাকা ফল তোলা শুরু করুন। নিয়মিত তুললে ফলন বাড়ে।',
    },
  },
  harvest: {
    type: 'HARVEST',
    title: { en: 'Harvest', hi: 'कटाई', bn: 'ফসল কাটা' },
    description: {
      en: 'Harvest when the crop is mature. Dry and store the produce properly before selling. Check mandi prices first.',
      hi: 'फसल पकने पर कटाई करें। बेचने से पहले उपज को अच्छी तरह सुखाकर रखें। पहले मंडी भाव देख लें।',
      bn: 'ফসল পাকলে কাটুন। বিক্রির আগে ফসল ভালো করে শুকিয়ে রাখুন। আগে মান্ডির দাম দেখে নিন।',
    },
  },
  retting: {
    type: 'OTHER',
    title: { en: 'Retting', hi: 'सड़ाई (रेटिंग)', bn: 'পাট পচানো' },
    description: {
      en: 'Steep the harvested jute bundles in clean, slow-moving water for retting.',
      hi: 'काटे गए जूट के गट्ठरों को साफ, धीमे बहते पानी में सड़ाने के लिए डुबोएँ।',
      bn: 'কাটা পাটের আঁটি পরিষ্কার, ধীরে বয়ে যাওয়া জলে পচাতে দিন।',
    },
  },
} satisfies Record<string, ActivityLibraryItem>;

export type ActivityKey = keyof typeof ACTIVITY_LIBRARY;

export interface SeedCrop {
  code: string;
  name: string;
  nameHi: string;
  nameBn: string;
  localName?: string;
  season: CropSeason;
  durationDays: number;
  /** Quintals per acre, a conservative West Bengal average. */
  defaultYieldPerAcre: number;
  /** Indicative modal price (₹/quintal) used only to generate sample mandi prices. */
  samplePrice: number;
  calendar: [ActivityKey, number][];
}

export const CROPS: SeedCrop[] = [
  {
    code: 'paddy-aman', name: 'Paddy (Aman)', nameHi: 'अमन धान', nameBn: 'আমন ধান', localName: 'Aman dhan',
    season: 'KHARIF', durationDays: 140, defaultYieldPerAcre: 12, samplePrice: 2300,
    calendar: [['nursery', 0], ['land_prep', 18], ['basal_fert', 24], ['transplant_paddy', 25], ['weeding', 45], ['top_dress_1', 46], ['pest_check', 60], ['top_dress_2', 70], ['pest_check', 90], ['harvest', 140]],
  },
  {
    code: 'paddy-boro', name: 'Paddy (Boro)', nameHi: 'बोरो धान', nameBn: 'বোরো ধান', localName: 'Boro dhan',
    season: 'RABI', durationDays: 150, defaultYieldPerAcre: 16, samplePrice: 2250,
    calendar: [['nursery', 0], ['land_prep', 30], ['basal_fert', 39], ['transplant_paddy', 40], ['irrigation', 50], ['weeding', 55], ['top_dress_1', 60], ['pest_check', 75], ['top_dress_2', 85], ['irrigation', 100], ['pest_check', 105], ['harvest', 150]],
  },
  {
    code: 'wheat', name: 'Wheat', nameHi: 'गेहूं', nameBn: 'গম',
    season: 'RABI', durationDays: 120, defaultYieldPerAcre: 11, samplePrice: 2500,
    calendar: [['land_prep', -7], ['basal_fert', -1], ['sowing', 0], ['irrigation', 21], ['top_dress_1', 22], ['weeding', 30], ['irrigation', 45], ['pest_check', 55], ['irrigation', 65], ['irrigation', 85], ['harvest', 120]],
  },
  {
    code: 'potato', name: 'Potato', nameHi: 'आलू', nameBn: 'আলু',
    season: 'RABI', durationDays: 90, defaultYieldPerAcre: 100, samplePrice: 1400,
    calendar: [['land_prep', -10], ['basal_fert', -1], ['sowing', 0], ['irrigation', 10], ['weeding', 25], ['top_dress_1', 30], ['earthing_up', 31], ['pest_check', 45], ['irrigation', 50], ['pest_check', 65], ['harvest', 90]],
  },
  {
    code: 'jute', name: 'Jute', nameHi: 'जूट (पटसन)', nameBn: 'পাট',
    season: 'KHARIF', durationDays: 120, defaultYieldPerAcre: 10, samplePrice: 5500,
    calendar: [['land_prep', -7], ['basal_fert', -1], ['sowing', 0], ['weeding', 21], ['top_dress_1', 25], ['weeding', 40], ['top_dress_2', 45], ['pest_check', 60], ['harvest', 120], ['retting', 121]],
  },
  {
    code: 'mustard', name: 'Mustard', nameHi: 'सरसों', nameBn: 'সরিষা',
    season: 'RABI', durationDays: 100, defaultYieldPerAcre: 4.5, samplePrice: 6000,
    calendar: [['land_prep', -7], ['basal_fert', -1], ['sowing', 0], ['weeding', 20], ['irrigation', 25], ['top_dress_1', 26], ['pest_check', 45], ['irrigation', 50], ['harvest', 100]],
  },
  {
    code: 'lentil', name: 'Lentil', nameHi: 'मसूर', nameBn: 'মসুর ডাল',
    season: 'RABI', durationDays: 110, defaultYieldPerAcre: 4, samplePrice: 6800,
    calendar: [['land_prep', -7], ['basal_fert', -1], ['sowing', 0], ['weeding', 25], ['irrigation', 40], ['pest_check', 55], ['harvest', 110]],
  },
  {
    code: 'onion', name: 'Onion', nameHi: 'प्याज', nameBn: 'পেঁয়াজ',
    season: 'RABI', durationDays: 150, defaultYieldPerAcre: 70, samplePrice: 2000,
    calendar: [['nursery', 0], ['land_prep', 35], ['basal_fert', 44], ['transplant_veg', 45], ['irrigation', 50], ['weeding', 65], ['top_dress_1', 75], ['pest_check', 90], ['irrigation', 95], ['harvest', 150]],
  },
  {
    code: 'tomato', name: 'Tomato', nameHi: 'टमाटर', nameBn: 'টমেটো',
    season: 'RABI', durationDays: 120, defaultYieldPerAcre: 100, samplePrice: 1800,
    calendar: [['nursery', 0], ['land_prep', 18], ['basal_fert', 24], ['transplant_veg', 25], ['irrigation', 28], ['weeding', 40], ['top_dress_1', 45], ['pest_check', 55], ['first_pick', 85], ['harvest', 120]],
  },
  {
    code: 'brinjal', name: 'Brinjal', nameHi: 'बैंगन', nameBn: 'বেগুন',
    season: 'KHARIF', durationDays: 150, defaultYieldPerAcre: 80, samplePrice: 2000,
    calendar: [['nursery', 0], ['land_prep', 25], ['basal_fert', 29], ['transplant_veg', 30], ['irrigation', 33], ['weeding', 45], ['top_dress_1', 50], ['pest_check', 60], ['first_pick', 90], ['top_dress_2', 95], ['harvest', 150]],
  },
  {
    code: 'cauliflower', name: 'Cauliflower', nameHi: 'फूलगोभी', nameBn: 'ফুলকপি',
    season: 'RABI', durationDays: 100, defaultYieldPerAcre: 80, samplePrice: 1500,
    calendar: [['nursery', 0], ['land_prep', 20], ['basal_fert', 24], ['transplant_veg', 25], ['irrigation', 28], ['weeding', 40], ['top_dress_1', 41], ['earthing_up', 45], ['pest_check', 55], ['harvest', 100]],
  },
  {
    code: 'maize', name: 'Maize', nameHi: 'मक्का', nameBn: 'ভুট্টা',
    season: 'KHARIF', durationDays: 110, defaultYieldPerAcre: 15, samplePrice: 2200,
    calendar: [['land_prep', -7], ['basal_fert', -1], ['sowing', 0], ['weeding', 20], ['top_dress_1', 25], ['earthing_up', 40], ['irrigation', 45], ['top_dress_2', 50], ['pest_check', 60], ['harvest', 110]],
  },
  {
    code: 'sesame', name: 'Sesame', nameHi: 'तिल', nameBn: 'তিল',
    season: 'ZAID', durationDays: 90, defaultYieldPerAcre: 3, samplePrice: 11000,
    calendar: [['land_prep', -7], ['basal_fert', -1], ['sowing', 0], ['weeding', 20], ['pest_check', 40], ['harvest', 90]],
  },
  {
    code: 'green-gram', name: 'Green gram (Moong)', nameHi: 'मूंग', nameBn: 'মুগ ডাল',
    season: 'ZAID', durationDays: 70, defaultYieldPerAcre: 3.5, samplePrice: 8500,
    calendar: [['land_prep', -5], ['basal_fert', -1], ['sowing', 0], ['weeding', 20], ['pest_check', 35], ['harvest', 70]],
  },
];

export const MANDIS = [
  { name: 'Bardhaman', district: 'Purba Bardhaman', latitude: 23.2324, longitude: 87.8615 },
  { name: 'Kalna', district: 'Purba Bardhaman', latitude: 23.2219, longitude: 88.3617 },
  { name: 'Sheoraphuli', district: 'Hooghly', latitude: 22.7697, longitude: 88.3247 },
  { name: 'Bolpur', district: 'Birbhum', latitude: 23.6687, longitude: 87.6853 },
  { name: 'Tamluk', district: 'Purba Medinipur', latitude: 22.3, longitude: 87.9167 },
  { name: 'Ghatal', district: 'Paschim Medinipur', latitude: 22.6629, longitude: 87.7344 },
  { name: 'Krishnanagar', district: 'Nadia', latitude: 23.4058, longitude: 88.4906 },
  { name: 'Bankura', district: 'Bankura', latitude: 23.2324, longitude: 87.0716 },
  { name: 'Barasat', district: 'North 24 Parganas', latitude: 22.7231, longitude: 88.4767 },
  { name: 'Siliguri', district: 'Darjeeling', latitude: 26.7271, longitude: 88.3953 },
].map((m) => ({ ...m, state: 'West Bengal' }));

export const ADVISORIES = [
  {
    cropCode: 'paddy-aman',
    language: 'bn' as const,
    title: 'আমন ধানে মাজরা পোকার দিকে নজর রাখুন',
    description:
      'রোপণের ৩০–৬০ দিনের মধ্যে মাজরা পোকার আক্রমণ বেশি হয়। মাঝখানের পাতা শুকিয়ে গেলে (মরা ডিগ) সতর্ক হন। জমিতে আলোর ফাঁদ ব্যবহার করুন এবং কীটনাশক দেওয়ার আগে স্থানীয় কৃষি আধিকারিকের পরামর্শ নিন।',
  },
  {
    cropCode: 'paddy-aman',
    language: 'hi' as const,
    title: 'अमन धान में तना छेदक कीट पर नज़र रखें',
    description:
      'रोपाई के 30–60 दिन बाद तना छेदक का प्रकोप अधिक होता है। बीच की पत्ती सूखने (डेड हार्ट) पर सावधान रहें। प्रकाश जाल का उपयोग करें और कीटनाशक से पहले स्थानीय कृषि अधिकारी से सलाह लें।',
  },
  {
    cropCode: 'paddy-aman',
    language: 'en' as const,
    title: 'Watch for stem borer in Aman paddy',
    description:
      'Stem borer attacks peak 30–60 days after transplanting. Watch for drying central shoots (dead hearts). Use light traps and consult your local agriculture officer before using any pesticide.',
  },
  {
    cropCode: 'potato',
    language: 'bn' as const,
    title: 'আলুর নাবি ধসা রোগ থেকে সাবধান',
    description:
      'কুয়াশা ও মেঘলা আবহাওয়ায় আলুর নাবি ধসা রোগ দ্রুত ছড়ায়। পাতায় জলে-ভেজা কালো দাগ দেখলে দেরি না করে স্থানীয় কৃষি আধিকারিকের সাথে যোগাযোগ করুন।',
  },
];
