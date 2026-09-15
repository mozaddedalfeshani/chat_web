import {
  CONTENT_LANGUAGES,
  DEFAULT_TITLE,
  EXTENDED_DESCRIPTION,
  ORG_EMAIL,
  ORG_NAME,
  ORG_URL,
  PRODUCT_NAME,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

export type JsonLdSchema = {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
};

export const ORG_ID = `${ORG_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

const FEATURE_LIST = [
  "End-to-end encrypted personal messaging",
  "Encrypted workspace group chat",
  "Phone QR sign-in for the web",
  "Note to Self",
  "1:1 voice and video calls",
  "Group calls",
  "Message requests and blocks",
];

export function organizationSchema(): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: ORG_NAME,
    url: ORG_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo-512.png`,
      width: 512,
      height: 512,
    },
    description: EXTENDED_DESCRIPTION,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: ORG_EMAIL,
      availableLanguage: ["English", "Bengali"],
    },
    sameAs: [ORG_URL, SITE_URL],
  };
}

export function websiteSchema(): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: [
      "AbabilX Chat",
      "chat AbabilX",
      "AbabilX messaging",
      "chat.ababilx.com",
    ],
    url: SITE_URL,
    description: EXTENDED_DESCRIPTION,
    inLanguage: CONTENT_LANGUAGES,
    publisher: { "@id": ORG_ID },
  };
}

export function softwareSchema(): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": SOFTWARE_ID,
    name: PRODUCT_NAME,
    alternateName: [
      "AbabilX Chat",
      "chat AbabilX",
      "AbabilX messaging",
      "AbabilX web chat",
    ],
    applicationCategory: "CommunicationApplication",
    applicationSubCategory: "Encrypted messaging",
    operatingSystem: "Web, iOS, Android, macOS, Windows",
    url: SITE_URL,
    description: EXTENDED_DESCRIPTION,
    featureList: FEATURE_LIST,
    inLanguage: CONTENT_LANGUAGES,
    isAccessibleForFree: true,
    provider: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      category: "free",
      url: SITE_URL,
    },
  };
}

export function webPageSchema(): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    name: DEFAULT_TITLE,
    description: EXTENDED_DESCRIPTION,
    url: SITE_URL,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": SOFTWARE_ID },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SITE_URL}/opengraph-image`,
    },
  };
}

export function homeJsonLdSchemas(): JsonLdSchema[] {
  return [
    organizationSchema(),
    websiteSchema(),
    softwareSchema(),
    webPageSchema(),
  ];
}
