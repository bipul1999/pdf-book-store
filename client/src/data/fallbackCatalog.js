const rawBase = "https://raw.githubusercontent.com/bipul1999/pdf-book-store/main/server/uploads";

export const fallbackAuthorImage = `${rawBase}/quotes/1778942745455-120118692.png`;

export const fallbackBooks = [
  {
    _id: "fallback-kawar-tal",
    title: "कावर ताल: एक रामसर साइट",
    author: "महेश भारती",
    description: "कावर झील और उसके पर्यावरण पर आधारित विशेष पुस्तक।",
    price: 99,
    coverImage: `${rawBase}/covers/1778925632060-933065848.png`,
    featured: true
  },
  {
    _id: "fallback-kawar-times",
    title: "कावर टाइम्स",
    author: "महेश भारती",
    description: "होली और क्षेत्रीय संस्कृति से जुड़ी विशेष पत्रिका।",
    price: 49,
    coverImage: `${rawBase}/covers/1778943636937-749831974.jpeg`,
    featured: true
  },
  {
    _id: "fallback-ramjeevan-singh",
    title: "ग्रामसभा से लोकसभा: रामजीवन सिंह",
    author: "महेश भारती",
    description: "रामजीवन सिंह जी के राजनीतिक सफर पर आधारित प्रेरक जीवनी।",
    price: 99,
    coverImage: `${rawBase}/covers/1778943629236-671708159.png`,
    featured: true
  },
  {
    _id: "fallback-neel",
    title: "नील से नीलहे तक",
    author: "महेश भारती",
    description: "नील की खेती और किसानों के संघर्ष की ऐतिहासिक गाथा।",
    price: 99,
    coverImage: `${rawBase}/covers/1778943620415-419698569.png`,
    featured: true
  },
  {
    _id: "fallback-jaymangla",
    title: "जयमंगला गढ़ का इतिहास व अध्यात्म",
    author: "महेश भारती",
    description: "जयमंगला गढ़ के इतिहास और आध्यात्मिक महत्व पर आधारित पुस्तक।",
    price: 99,
    coverImage: `${rawBase}/covers/1778943612193-686229670.png`,
    featured: true
  }
];
