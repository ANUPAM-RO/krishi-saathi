import type { Language, SchemeCategory, SupplierCategory } from '@prisma/client';

/**
 * Government scheme summaries for the West Bengal pilot (central schemes active in the state plus state schemes).
 * General guidance only: amounts and rules change, so an agriculture officer must check these before the pilot.
 * PMFBY is left out because West Bengal runs its own crop insurance (Bangla Shasya Bima) instead.
 */
interface SchemeText {
  title: string;
  summary: string;
  benefits: string;
  eligibility: string;
  howToApply: string;
  documents: string;
}

interface SchemeSeed {
  key: string;
  category: SchemeCategory;
  state: string | null;
  applyUrl: string | null;
  helpline: string | null;
  text: Record<Language, SchemeText>;
}

export const SCHEMES: SchemeSeed[] = [
  {
    key: 'pm-kisan',
    category: 'INCOME_SUPPORT',
    state: null,
    applyUrl: 'https://pmkisan.gov.in',
    helpline: '155261',
    text: {
      en: {
        title: 'PM-KISAN: ₹6,000 a year for farmer families',
        summary: 'The central government pays ₹6,000 a year directly into the bank account of landholding farmer families.',
        benefits: '₹6,000 per year, paid in three instalments of ₹2,000 each by direct bank transfer (DBT).',
        eligibility:
          'Farmer families who own cultivable land in their name. Some groups are not eligible, such as income-tax payers, government employees and people with high pensions.',
        howToApply:
          'Register on pmkisan.gov.in ("New Farmer Registration"), at a Common Service Centre (CSC), or through your block agriculture office. Complete e-KYC and link Aadhaar to your bank account to keep receiving instalments.',
        documents: 'Aadhaar card, land records (khatian/porcha), bank account details, mobile number.',
      },
      hi: {
        title: 'पीएम-किसान: किसान परिवारों को ₹6,000 सालाना',
        summary: 'केंद्र सरकार ज़मीन वाले किसान परिवारों के बैंक खाते में हर साल ₹6,000 सीधे भेजती है।',
        benefits: 'हर साल ₹6,000, ₹2,000 की तीन किस्तों में, सीधे बैंक खाते में (DBT)।',
        eligibility:
          'जिन किसान परिवारों के नाम पर खेती की ज़मीन है। आयकर देने वाले, सरकारी कर्मचारी और ज़्यादा पेंशन पाने वाले लोग पात्र नहीं हैं।',
        howToApply:
          'pmkisan.gov.in पर ("New Farmer Registration"), नज़दीकी कॉमन सर्विस सेंटर (CSC) पर, या ब्लॉक कृषि कार्यालय से पंजीकरण करें। किस्तें मिलती रहें, इसके लिए ई-केवाईसी पूरा करें और आधार को बैंक खाते से जोड़ें।',
        documents: 'आधार कार्ड, ज़मीन के कागज़ (खतियान), बैंक खाते की जानकारी, मोबाइल नंबर।',
      },
      bn: {
        title: 'পিএম-কিষাণ: কৃষক পরিবারকে বছরে ₹৬,০০০',
        summary: 'কেন্দ্র সরকার জমির মালিক কৃষক পরিবারের ব্যাংক অ্যাকাউন্টে বছরে ₹৬,০০০ সরাসরি পাঠায়।',
        benefits: 'বছরে ₹৬,০০০, ₹২,০০০ করে তিন কিস্তিতে, সরাসরি ব্যাংক অ্যাকাউন্টে (DBT)।',
        eligibility:
          'যে কৃষক পরিবারের নিজের নামে চাষের জমি আছে। আয়কর দাতা, সরকারি কর্মচারী এবং বেশি পেনশনভোগীরা এই সুবিধা পান না।',
        howToApply:
          'pmkisan.gov.in-এ ("New Farmer Registration"), কাছের কমন সার্ভিস সেন্টারে (CSC) অথবা ব্লক কৃষি দপ্তরে নাম নথিভুক্ত করুন। কিস্তি পেতে থাকার জন্য ই-কেওয়াইসি করুন এবং আধার ব্যাংক অ্যাকাউন্টের সঙ্গে যুক্ত করুন।',
        documents: 'আধার কার্ড, জমির কাগজ (খতিয়ান/পরচা), ব্যাংক অ্যাকাউন্টের তথ্য, মোবাইল নম্বর।',
      },
    },
  },
  {
    key: 'kcc',
    category: 'CREDIT',
    state: null,
    applyUrl: null,
    helpline: null,
    text: {
      en: {
        title: 'Kisan Credit Card (KCC): low-interest farm loans',
        summary: 'A bank card that lets farmers borrow for seeds, fertilizer and other farming costs at a low interest rate.',
        benefits:
          'Short-term loans for crop costs and related work such as animal husbandry and fisheries. Under the government interest subvention scheme, crop loans within the set limit cost about 4% a year if repaid on time. Ask your bank for the current limit.',
        eligibility:
          'Owner farmers, tenant farmers, sharecroppers and oral lessees, and self-help or joint liability groups of farmers.',
        howToApply:
          'Apply at any commercial bank, regional rural bank or cooperative bank branch. PM-KISAN beneficiaries can use the simple one-page KCC form.',
        documents: 'Application form, Aadhaar, land records or proof of tenancy, passport-size photo, bank details.',
      },
      hi: {
        title: 'किसान क्रेडिट कार्ड (KCC): कम ब्याज पर खेती का कर्ज़',
        summary: 'बैंक का कार्ड जिससे किसान बीज, खाद और खेती के दूसरे खर्चों के लिए कम ब्याज पर कर्ज़ ले सकते हैं।',
        benefits:
          'फ़सल के खर्च और पशुपालन, मछली पालन जैसे कामों के लिए छोटी अवधि का कर्ज़। सरकार की ब्याज सहायता योजना से तय सीमा तक का फ़सल कर्ज़ समय पर चुकाने पर लगभग 4% सालाना पड़ता है। मौजूदा सीमा अपने बैंक से पूछें।',
        eligibility: 'ज़मीन के मालिक किसान, किराएदार किसान, बटाईदार, और किसानों के स्वयं सहायता या संयुक्त देयता समूह।',
        howToApply:
          'किसी भी सरकारी/निजी बैंक, ग्रामीण बैंक या सहकारी बैंक की शाखा में आवेदन करें। पीएम-किसान लाभार्थी एक पन्ने का आसान KCC फ़ॉर्म भर सकते हैं।',
        documents: 'आवेदन फ़ॉर्म, आधार, ज़मीन के कागज़ या बटाई का प्रमाण, पासपोर्ट साइज़ फ़ोटो, बैंक की जानकारी।',
      },
      bn: {
        title: 'কিষাণ ক্রেডিট কার্ড (KCC): কম সুদে চাষের ঋণ',
        summary: 'ব্যাংকের কার্ড, যা দিয়ে কৃষক বীজ, সার ও চাষের অন্য খরচের জন্য কম সুদে ঋণ নিতে পারেন।',
        benefits:
          'ফসলের খরচ এবং পশুপালন, মাছ চাষের মতো কাজের জন্য স্বল্পমেয়াদি ঋণ। সরকারের সুদ ভর্তুকি প্রকল্পে নির্দিষ্ট সীমা পর্যন্ত ফসল ঋণ সময়ে শোধ করলে বছরে প্রায় ৪% সুদ লাগে। বর্তমান সীমা আপনার ব্যাংকে জিজ্ঞাসা করুন।',
        eligibility: 'জমির মালিক কৃষক, ভাগচাষি (বর্গাদার), মৌখিক ইজারাদার এবং কৃষকদের স্বনির্ভর বা যৌথ দায়বদ্ধ গোষ্ঠী।',
        howToApply:
          'যেকোনো বাণিজ্যিক ব্যাংক, গ্রামীণ ব্যাংক বা সমবায় ব্যাংকের শাখায় আবেদন করুন। পিএম-কিষাণ উপভোক্তারা এক পাতার সহজ KCC ফর্ম পূরণ করতে পারেন।',
        documents: 'আবেদনপত্র, আধার, জমির কাগজ বা বর্গার প্রমাণ, পাসপোর্ট সাইজের ছবি, ব্যাংকের তথ্য।',
      },
    },
  },
  {
    key: 'soil-health-card',
    category: 'OTHER',
    state: null,
    applyUrl: 'https://soilhealth.dac.gov.in',
    helpline: null,
    text: {
      en: {
        title: 'Soil Health Card: free soil test',
        summary: 'Get your field’s soil tested for free, with advice on which fertilizer to use and how much.',
        benefits:
          'The card shows your soil’s nutrient status (such as nitrogen, phosphorus, potassium, pH and organic carbon) and recommends fertilizer doses for your crops. This helps cut fertilizer cost and improve yield.',
        eligibility: 'All farmers.',
        howToApply:
          'Contact your block agriculture office or Krishi Vigyan Kendra (KVK). A soil sample is collected from your field; the card can then be checked on soilhealth.dac.gov.in.',
        documents: 'Usually just your name, mobile number and plot details.',
      },
      hi: {
        title: 'मृदा स्वास्थ्य कार्ड: मुफ़्त मिट्टी जाँच',
        summary: 'अपने खेत की मिट्टी की मुफ़्त जाँच कराएँ और जानें कौन-सी खाद कितनी डालनी है।',
        benefits:
          'कार्ड में मिट्टी के पोषक तत्व (जैसे नाइट्रोजन, फ़ॉस्फ़ोरस, पोटाश, pH और जैविक कार्बन) और आपकी फ़सल के लिए खाद की सही मात्रा लिखी होती है। इससे खाद का खर्च घटता है और पैदावार बढ़ती है।',
        eligibility: 'सभी किसान।',
        howToApply:
          'ब्लॉक कृषि कार्यालय या कृषि विज्ञान केंद्र (KVK) से संपर्क करें। आपके खेत से मिट्टी का नमूना लिया जाएगा; कार्ड soilhealth.dac.gov.in पर भी देखा जा सकता है।',
        documents: 'आम तौर पर सिर्फ़ नाम, मोबाइल नंबर और खेत की जानकारी।',
      },
      bn: {
        title: 'সয়েল হেলথ কার্ড: বিনামূল্যে মাটি পরীক্ষা',
        summary: 'বিনামূল্যে আপনার জমির মাটি পরীক্ষা করান এবং জানুন কোন সার কতটা দিতে হবে।',
        benefits:
          'কার্ডে মাটির পুষ্টির অবস্থা (যেমন নাইট্রোজেন, ফসফরাস, পটাশ, pH ও জৈব কার্বন) এবং আপনার ফসলের জন্য সারের সঠিক মাত্রা লেখা থাকে। এতে সারের খরচ কমে, ফলন বাড়ে।',
        eligibility: 'সব কৃষক।',
        howToApply:
          'ব্লক কৃষি দপ্তর বা কৃষি বিজ্ঞান কেন্দ্রে (KVK) যোগাযোগ করুন। আপনার জমি থেকে মাটির নমুনা নেওয়া হবে; কার্ড soilhealth.dac.gov.in-এও দেখা যায়।',
        documents: 'সাধারণত শুধু নাম, মোবাইল নম্বর ও জমির তথ্য।',
      },
    },
  },
  {
    key: 'krishak-bandhu',
    category: 'INCOME_SUPPORT',
    state: 'West Bengal',
    applyUrl: 'https://krishakbandhu.net',
    helpline: null,
    text: {
      en: {
        title: 'Krishak Bandhu: yearly help for West Bengal farmers',
        summary: 'West Bengal government support: money every year for farmers, and ₹2 lakh to the family if a farmer dies.',
        benefits:
          'Assured income: ₹10,000 a year for 1 acre or more, paid in two instalments (kharif and rabi). For less than 1 acre, a proportional amount of at least ₹4,000 a year. Death benefit: ₹2 lakh to the family of a farmer aged 18–60.',
        eligibility: 'Farmers and registered sharecroppers (bargadars) in West Bengal with recorded land.',
        howToApply: 'Apply at the block agriculture office (ADA office), at a Duare Sarkar camp, or online at krishakbandhu.net.',
        documents: 'Aadhaar, land records (khatian/porcha) or bargadar certificate, bank passbook, photo.',
      },
      hi: {
        title: 'कृषक बंधु: पश्चिम बंगाल के किसानों को सालाना मदद',
        summary: 'पश्चिम बंगाल सरकार की योजना: किसानों को हर साल पैसे, और किसान की मृत्यु पर परिवार को ₹2 लाख।',
        benefits:
          'सुनिश्चित आय: 1 एकड़ या उससे ज़्यादा ज़मीन पर ₹10,000 सालाना, दो किस्तों में (खरीफ़ और रबी)। 1 एकड़ से कम पर अनुपात में, कम से कम ₹4,000 सालाना। मृत्यु लाभ: 18–60 साल के किसान की मृत्यु पर परिवार को ₹2 लाख।',
        eligibility: 'पश्चिम बंगाल के किसान और पंजीकृत बटाईदार (बर्गादार), जिनकी ज़मीन दर्ज है।',
        howToApply: 'ब्लॉक कृषि कार्यालय (ADA कार्यालय), दुआरे सरकार शिविर, या krishakbandhu.net पर ऑनलाइन आवेदन करें।',
        documents: 'आधार, ज़मीन के कागज़ (खतियान/पर्चा) या बर्गादार प्रमाणपत्र, बैंक पासबुक, फ़ोटो।',
      },
      bn: {
        title: 'কৃষকবন্ধু: পশ্চিমবঙ্গের কৃষকদের বার্ষিক সহায়তা',
        summary: 'পশ্চিমবঙ্গ সরকারের প্রকল্প: কৃষকদের প্রতি বছর আর্থিক সাহায্য, এবং কৃষকের মৃত্যুতে পরিবারকে ₹২ লক্ষ।',
        benefits:
          'নিশ্চিত আয়: ১ একর বা তার বেশি জমিতে বছরে ₹১০,০০০, দুই কিস্তিতে (খরিফ ও রবি)। ১ একরের কম হলে আনুপাতিক হারে, বছরে কমপক্ষে ₹৪,০০০। মৃত্যুকালীন সাহায্য: ১৮–৬০ বছর বয়সী কৃষকের মৃত্যুতে পরিবারকে ₹২ লক্ষ।',
        eligibility: 'পশ্চিমবঙ্গের কৃষক ও নথিভুক্ত বর্গাদার, যাঁদের জমি রেকর্ডভুক্ত।',
        howToApply: 'ব্লক কৃষি দপ্তর (ADA অফিস), দুয়ারে সরকার শিবির, অথবা krishakbandhu.net-এ অনলাইনে আবেদন করুন।',
        documents: 'আধার, জমির কাগজ (খতিয়ান/পরচা) বা বর্গাদার সার্টিফিকেট, ব্যাংক পাসবই, ছবি।',
      },
    },
  },
  {
    key: 'bangla-shasya-bima',
    category: 'INSURANCE',
    state: 'West Bengal',
    applyUrl: 'https://banglashasyabima.net',
    helpline: null,
    text: {
      en: {
        title: 'Bangla Shasya Bima: crop insurance',
        summary: 'West Bengal crop insurance that pays you when crops are lost to flood, drought, pests or other disasters.',
        benefits:
          'For most notified crops, such as aman and boro paddy, wheat, pulses and oilseeds, the state government pays the whole premium. For potato and sugarcane, farmers pay a small share of the premium.',
        eligibility:
          'All farmers in West Bengal growing notified crops in notified areas, including sharecroppers, with or without a crop loan.',
        howToApply:
          'Enrol every season before the last date at the block agriculture office, a bank, a Common Service Centre, a Duare Sarkar camp, or online at banglashasyabima.net.',
        documents: 'Aadhaar, land records or sharecropper declaration, bank details, and the crop and area sown this season.',
      },
      hi: {
        title: 'बांग्ला शस्य बीमा: फ़सल बीमा',
        summary: 'पश्चिम बंगाल का फ़सल बीमा, जो बाढ़, सूखा, कीट या दूसरी आपदा से फ़सल खराब होने पर पैसे देता है।',
        benefits:
          'ज़्यादातर अधिसूचित फ़सलों (जैसे अमन और बोरो धान, गेहूँ, दालें और तिलहन) का पूरा प्रीमियम राज्य सरकार देती है। आलू और गन्ने के लिए किसान प्रीमियम का छोटा हिस्सा देते हैं।',
        eligibility: 'पश्चिम बंगाल में अधिसूचित क्षेत्र में अधिसूचित फ़सल उगाने वाले सभी किसान, बटाईदार भी, चाहे फ़सल कर्ज़ हो या नहीं।',
        howToApply:
          'हर सीज़न अंतिम तारीख से पहले ब्लॉक कृषि कार्यालय, बैंक, कॉमन सर्विस सेंटर, दुआरे सरकार शिविर, या banglashasyabima.net पर नाम लिखवाएँ।',
        documents: 'आधार, ज़मीन के कागज़ या बटाईदार घोषणा पत्र, बैंक की जानकारी, और इस सीज़न में बोई गई फ़सल व रकबा।',
      },
      bn: {
        title: 'বাংলা শস্য বীমা: ফসল বীমা',
        summary: 'পশ্চিমবঙ্গের ফসল বীমা, যা বন্যা, খরা, পোকা বা অন্য দুর্যোগে ফসল নষ্ট হলে ক্ষতিপূরণ দেয়।',
        benefits:
          'বেশিরভাগ বিজ্ঞাপিত ফসলের (যেমন আমন ও বোরো ধান, গম, ডাল ও তৈলবীজ) পুরো প্রিমিয়াম রাজ্য সরকার দেয়। আলু ও আখের ক্ষেত্রে কৃষককে প্রিমিয়ামের সামান্য অংশ দিতে হয়।',
        eligibility: 'পশ্চিমবঙ্গে বিজ্ঞাপিত এলাকায় বিজ্ঞাপিত ফসল চাষ করা সব কৃষক, বর্গাদাররাও, ফসল ঋণ থাকুক বা না থাকুক।',
        howToApply:
          'প্রতি মরসুমে শেষ তারিখের আগে ব্লক কৃষি দপ্তর, ব্যাংক, কমন সার্ভিস সেন্টার, দুয়ারে সরকার শিবিরে অথবা banglashasyabima.net-এ নাম নথিভুক্ত করুন।',
        documents: 'আধার, জমির কাগজ বা বর্গাদারের ঘোষণাপত্র, ব্যাংকের তথ্য, এবং এই মরসুমে চাষ করা ফসল ও জমির পরিমাণ।',
      },
    },
  },
];

/**
 * Sample suppliers around the demo farm so the feature can be tried out. They are NOT real businesses:
 * names start with "Sample", phones use the unassigned +91 00000 range, and source is "sample-seed".
 * Delete them and add real, verified suppliers before the pilot.
 */
interface SupplierSeed {
  name: string;
  categories: SupplierCategory[];
  phone: string;
  village: string;
  district: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const SAMPLE_SUPPLIERS: SupplierSeed[] = [
  {
    name: 'Sample – Annapurna Krishi Seva Kendra',
    categories: ['SEED', 'FERTILIZER', 'PESTICIDE'],
    phone: '+910000000101',
    village: 'Memari',
    district: 'Purba Bardhaman',
    latitude: 23.1745,
    longitude: 88.1083,
    description: 'Paddy, potato and vegetable seed; urea, DAP and potash.',
  },
  {
    name: 'Sample – Maa Durga Tractor Hire',
    categories: ['TRACTOR'],
    phone: '+910000000102',
    village: 'Memari',
    district: 'Purba Bardhaman',
    latitude: 23.189,
    longitude: 88.112,
    description: 'Tractor and rotavator on hire by the hour or bigha.',
  },
  {
    name: 'Sample – Gram Bandhu Agro',
    categories: ['SEED', 'FERTILIZER'],
    phone: '+910000000103',
    village: 'Satgachia',
    district: 'Purba Bardhaman',
    latitude: 23.15,
    longitude: 88.05,
    description: 'Certified seed and fertilizer.',
  },
  {
    name: 'Sample – Bardhaman Pump & Motor Works',
    categories: ['PUMP'],
    phone: '+910000000104',
    village: 'Bardhaman',
    district: 'Purba Bardhaman',
    latitude: 23.24,
    longitude: 87.87,
    description: 'Diesel and electric pump sales and repair.',
  },
  {
    name: 'Sample – Kisan Sar Ghar',
    categories: ['FERTILIZER', 'PESTICIDE'],
    phone: '+910000000105',
    village: 'Bardhaman',
    district: 'Purba Bardhaman',
    latitude: 23.233,
    longitude: 87.865,
    description: 'Fertilizer and plant protection products.',
  },
  {
    name: 'Sample – Sabuj Bij Bhandar',
    categories: ['SEED'],
    phone: '+910000000106',
    village: 'Kalna',
    district: 'Purba Bardhaman',
    latitude: 23.2219,
    longitude: 88.36,
    description: 'Vegetable and pulse seed.',
  },
  {
    name: 'Sample – Hooghly Farm Machinery',
    categories: ['TRACTOR', 'PUMP'],
    phone: '+910000000107',
    village: 'Chinsurah',
    district: 'Hooghly',
    latitude: 22.9,
    longitude: 88.39,
    description: 'Tractor sales, power tiller and pump sets.',
  },
  {
    name: 'Sample – Solar Pump Centre',
    categories: ['PUMP'],
    phone: '+910000000108',
    village: 'Guskara',
    district: 'Purba Bardhaman',
    latitude: 23.493,
    longitude: 87.745,
    description: 'Solar irrigation pumps and installation.',
  },
];
