import type { TranslationKey } from "./zh";

export const en: Record<TranslationKey, string> = {
  banner_title: "Ancillary Power",
  banner_sub: "AI-Driven Virtual Power Plants, Leading Taiwan's Energy Transition",
  nav_brand_name: "Ancillary Power",
  nav_content: "Content",
  nav_models: "3D Models",
  nav_store: "Store",
  nav_about: "About",
  nav_cart: "Cart",
  nav_settings: "Settings",
  loading: "Loading...",
  empty_no_content: "No content loaded",
  back_to_list: "Back to list",

  models_title: "3D Models",
  models_drop: "Drop 3D models here or click to browse",
  models_formats:
    "Supports .glb, .gltf, .obj, .stl (stored locally in IndexedDB)",
  models_loaded: "{n} loaded",
  models_persisted: "Saved locally",
  models_loading_db: "Loading saved models from local storage...",
  models_parsing: "Parsing model...",
  models_error: "Failed to load model",

  store_title: "Store",
  store_products: "{n} products",

  fetch_title: "Settings",
  font_size_section: "Font Size",
  theme_section: "Reading Theme",
  theme_light: "Light",
  theme_sepia: "Sepia",
  theme_dark: "Dark",
  theme_toggle: "Toggle reading theme",
  site_url_label: "Site URL",
  site_url_hint:
    "Used for both WP content and WooCommerce (can be separate)",
  fetch_wp_section: "WordPress Content",
  fetch_type: "Content Type",
  fetch_per_page: "Per Page",
  fetch_proxy: "Use CORS proxy",
  fetch_btn: "Fetch Content",
  fetch_fetching: "Fetching...",
  fetch_footer: "WP: /wp-json/wp/v2/ ; WooCommerce: /wp-json/wc/v3/",

  woo_section: "WooCommerce Store",
  woo_use_same_url: "Use same URL above",
  woo_url: "Store URL",
  woo_key: "Consumer Key",
  woo_secret: "Consumer Secret",
  woo_per_page: "Products Per Page",
  woo_fetch_btn: "Load Products",
  woo_fetching: "Loading...",
  woo_success: "Loaded {n} products",

  cart_title: "Shopping Cart",
  cart_empty: "Your cart is empty.",
  cart_total: "Total",
  cart_checkout: "Checkout",
  cart_checkout_processing: "Creating order...",
  cart_clear_all: "Clear All",
  cart_clear_confirm: "Clear your entire cart? This cannot be undone.",
  add_to_cart: "Add to Cart",
  added: "\u2713 Added",
  in_cart: "in cart",

  total_items: "{n} total",
  prev: "\u2190 Prev",
  next: "Next \u2192",
  no_results: "No results",
  filter_placeholder: "Search...",
  sort_label: "Sort",
  sort_date_desc: "Date (Newest)",
  sort_date_asc: "Date (Oldest)",
  sort_title_asc: "Title A\u2192Z",
  sort_title_desc: "Title Z\u2192A",
  sort_price_asc: "Price (Low\u2192High)",
  sort_price_desc: "Price (High\u2192Low)",
  store_filter_placeholder: "Search products...",

  type_posts: "Posts",
  type_pages: "Pages",
  type_categories: "Categories",
  type_tags: "Tags",
  type_media: "Media",

  checkout_billing: "Billing Info",
  checkout_first_name: "First Name",
  checkout_last_name: "Last Name",
  checkout_email: "Email",
  checkout_phone: "Phone",
  checkout_address: "Address",
  checkout_city: "City",
  checkout_postcode: "Postcode",
  checkout_country: "Country Code",
  checkout_note: "Creates an order and redirects to payment.",
  checkout_no_woo: "Connect WooCommerce first.",
  order_success_title: "\u2713 Order Created!",
  order_success_desc: "Order #{id} created. Redirecting...",
  order_success_link: "Click to pay",

  footer_text: "\u00a9 2026 Ancillary Power",
  footer_website: "Official Website",

  // About
  about_title: "About Ancillary Power",
  about_subtitle:
    "Taiwan's first qualified private electricity trader and renewable energy retailer, powering energy transition with AI-driven Virtual Power Plants",
  about_mission_title: "Our Mission",
  about_mission_text:
    "Ancillary Power is a 100% Taiwan-based team dedicated to renewable energy technology solutions and services, building a gateway platform of technology, finance, and services for diverse distributed energy resources to participate in the electricity market. As one of the first private companies to obtain trading qualifications on Taipower's Energy Trading Platform, we have successfully aggregated over 300 MW of virtual power plant capacity with a 100%+ average dispatch execution rate, facilitating the annual transfer and sale of nearly 300 million kWh of green electricity. Through our ESCO financial model, we form long-term partnerships with clients, helping enterprises transform energy storage, renewables, and other distributed resources into predictable, dispatchable power assets.",
  about_highlights_title: "Key Achievements",
  about_highlight_vpp: "300+ MW VPP aggregation, leading the platform in trading volume",
  about_highlight_dispatch: "100%+ average dispatch execution rate with over 30,000 cumulative operating hours",
  about_highlight_earthquake: "Assisted Taipower in emergency dispatch during the 2024 Hualien earthquake, helping prevent large-scale blackouts",
  about_highlight_nvidia: "NVIDIA Inception Program member, deepening AI-powered intelligent dispatch",
  about_highlight_bloom: "NDC Startup Bloom Competition award winner, standing out from nearly 3,000 startups nationwide",
  about_highlight_acer: "Acer Foundation Longterm Award, International Group 3rd Place, recognizing Taiwan-rooted global startups",
  about_services_title: "Core Services",
  about_service_content: "Virtual Power Plant",
  about_service_content_desc:
    "Through our proprietary AIoT platform seamlessly integrated with Taipower's Energy Trading Platform, we use a light-capital aggregation model to combine enterprise energy storage, demand response, and smart charging into dispatchable grid resources, specializing in spinning and supplemental reserve markets.",
  about_service_3d: "Green Electricity Trading",
  about_service_3d_desc:
    "Licensed green electricity retailer with an AI-powered real-time procurement dashboard that precisely matches enterprise demand with green energy supply, minimizing surplus waste.",
  about_service_store: "Energy Storage & Management",
  about_service_store_desc:
    "We help enterprises deploy advanced behind-the-meter storage systems, integrating solar PV, EV charging, and EMS for intelligent dispatch and power asset monetization.",
  about_contact_title: "Contact Us",
  about_contact_text:
    "For energy management, virtual power plant, or green electricity procurement inquiries, get in touch.",
  about_email_label: "Email",
  about_email_value: "contact@ancillarypower.com",
  about_phone_label: "Phone",
  about_phone_value: "02-2727-2988 / 02-7755-5030",
  about_address_label: "Address",
  about_address_value:
    "4F-5, No. 50, Sec. 1, Xinsheng S. Rd., Zhongzheng Dist., Taipei 100510",
  about_website_label: "Website",
  about_website_value: "https://www.ancillarypower.com",

  product_1: "Wireless Headphones",
  product_1_desc: "30hr, adaptive ANC.",
  product_2: "Mechanical Keyboard",
  product_2_desc: "75%, hot-swap, RGB.",
  product_3: "4K Webcam",
  product_3_desc: "Auto-focus, USB-C.",
  product_4: "USB-C Dock",
  product_4_desc: "Triple display, 100W PD.",
  product_5: "Ergonomic Mouse",
  product_5_desc: "Vertical, adjustable DPI.",
  product_6: "Portable SSD 2TB",
  product_6_desc: "2000MB/s, IP65.",
  product_7: "Smart Lamp",
  product_7_desc: "Auto-dim, wireless charger.",
  product_8: "Monitor Light Bar",
  product_8_desc: "Asymmetric optics, USB.",

  // Legal
  legal_privacy_title: "Privacy Policy",
  legal_privacy_effective: "Effective: September 2026",
  legal_privacy_intro_title: "Overview",
  legal_privacy_intro_text:
    "Ancillary Power (hereinafter referred to as \"the Company\") values the protection of your personal data. This Privacy Policy is established in accordance with the Taiwan Personal Data Protection Act (PDPA) and describes how this website collects, processes, and uses your personal data. By using this website, you acknowledge that you have read and understood this policy.",
  legal_privacy_collect_title: "1. Data We Collect",
  legal_privacy_collect_text:
    "This website may collect the following categories of personal data: (1) Checkout information: When you place an order through the store, you are required to provide billing details such as name, email, phone number, address, city, postcode, and country code for creating a WooCommerce order. (2) Browsing data: This website may collect your IP address, browser type, and browsing behavior through cookies or similar technologies to improve the website experience.",
  legal_privacy_purpose_title: "2. Purpose of Data Collection",
  legal_privacy_purpose_text:
    "The Company collects personal data for the following specific purposes: (1) Order processing and fulfillment: Processing store orders, generating payment links, and handling delivery matters. (2) Customer service: Responding to your inquiries and providing after-sales support. (3) Website functionality: Providing content browsing, 3D model viewing, and product display services. (4) Website analytics and improvement: Understanding user behavior to optimize website design and performance. Personal data will not be used beyond the necessary scope of the above purposes.",
  legal_privacy_storage_title: "3. Local Data Storage",
  legal_privacy_storage_text:
    "This website uses browser-based local storage technologies. The data stored locally remains on your device and is not transmitted to our servers: (1) IndexedDB: Stores 3D model files you upload for local viewing. (2) localStorage: Stores shopping cart contents and website preferences (theme, font size, language, WordPress/WooCommerce connection settings). You may clear this local data at any time through your browser settings.",
  legal_privacy_third_party_title: "4. Third-Party Services",
  legal_privacy_third_party_text:
    "This website uses the following third-party services, and your data may be processed by these services during operation: (1) WooCommerce API: Used to load product information and process orders; your billing information is transmitted to the WooCommerce store backend. (2) CORS proxy services (corsproxy.io, allorigins.win): Used for cross-origin requests to WordPress and WooCommerce APIs; proxy servers may temporarily process data in transit. (3) jsDelivr CDN: Used to load the Draco decoder library required for 3D models. Please refer to each third-party service's official website for their privacy policies.",
  legal_privacy_security_title: "5. Data Security",
  legal_privacy_security_text:
    "The Company implements reasonable technical and organizational measures to protect the security of personal data, including: (1) HTTPS encryption across the entire site. (2) The frontend does not store sensitive payment information such as credit card details; payment processing is handled by the WooCommerce store backend. (3) Regular review and updates of security measures. Although we are committed to protecting your personal data, no internet transmission can be guaranteed to be 100% secure. Please take care to protect your account credentials and personal information.",
  legal_privacy_rights_title: "6. Your Rights",
  legal_privacy_rights_text:
    "Under Article 3 of the Personal Data Protection Act, you have the following rights regarding personal data held by the Company: (1) Right to inquire or request access. (2) Right to request copies. (3) Right to request supplementation or correction. (4) Right to request cessation of collection, processing, or use. (5) Right to request deletion. To exercise any of the above rights, please contact us using the contact information provided at the end of this policy. The Company will respond within the legally prescribed timeframe.",
  legal_privacy_retention_title: "7. Data Retention",
  legal_privacy_retention_text:
    "The Company retains your personal data for the period necessary to fulfill the purpose of collection. Order-related data is retained for five years in accordance with tax regulations. Other personal data will be deleted or its processing and use ceased when the purpose of collection no longer exists or upon your request for deletion. Locally stored data (IndexedDB, localStorage) is managed by you and can be cleared at any time.",
  legal_privacy_changes_title: "8. Policy Changes",
  legal_privacy_changes_text:
    "The Company reserves the right to amend this Privacy Policy at any time. Updated content and effective dates will be posted on this page. For material changes (such as adding third-party data sharing or changing data use purposes), the Company will notify users through appropriate means. We recommend that you review this policy periodically for the latest information.",
  legal_privacy_contact_title: "9. Contact",
  legal_privacy_contact_text:
    "If you have any questions about this Privacy Policy or wish to exercise your personal data rights, please contact the Company at: Email: contact@ancillarypower.com | Phone: 02-2727-2988 / 02-7755-5030 | Address: 4F-5, No. 50, Sec. 1, Xinsheng S. Rd., Zhongzheng Dist., Taipei 100510.",

  legal_tos_title: "Terms of Service",
  legal_tos_effective: "Effective: September 2026",
  legal_tos_intro_title: "Overview",
  legal_tos_intro_text:
    "Welcome to the Ancillary Power official website (hereinafter referred to as \"this website\"). By using this website, you agree to comply with the following Terms of Service. If you do not agree to any of these terms, please discontinue use of this website.",
  legal_tos_use_title: "1. Acceptable Use",
  legal_tos_use_text:
    "You agree to use this website only in a lawful manner consistent with these terms. The following activities are prohibited: (1) Unauthorized access to this website's systems or networks. (2) Interfering with or disrupting the normal operation of website services. (3) Using this website for any unlawful purpose. (4) Using automated tools to scrape website content in bulk. The Company reserves the right to restrict or terminate access for users who violate these usage rules without prior notice.",
  legal_tos_ip_title: "2. Intellectual Property",
  legal_tos_ip_text:
    "All content on this website, including but not limited to text, images, logos, source code, interface design, and layout, is protected by the Copyright Act of the Republic of China and international intellectual property laws, and is owned by Ancillary Power or its licensors. No reproduction, modification, distribution, public display, or use of website content is permitted without the Company's written consent. Content loaded via the WordPress API is owned by the original publisher.",
  legal_tos_store_title: "3. Store and Transactions",
  legal_tos_store_text:
    "The store functionality on this website provides product information and order services through the WooCommerce API. Product prices, specifications, and stock availability are determined by the WooCommerce store backend; this website serves as the frontend display interface. All payment processing, returns and exchanges, and after-sales service are governed by the policies of the WooCommerce store backend. The Company is not responsible for issues arising from changes made by the WooCommerce store backend or third-party payment processors.",
  legal_tos_disclaimer_title: "4. Disclaimer",
  legal_tos_disclaimer_text:
    "This website and its content are provided on an \"as is\" basis. The Company does not warrant: (1) That website services will be uninterrupted or error-free. (2) The accuracy, completeness, or timeliness of content obtained through third-party APIs. (3) The continued availability of CORS proxy services. (4) The compatibility of the 3D model viewer across all devices and browsers. The Company assumes no liability for any damages arising from the use of or inability to use this website.",
  legal_tos_liability_title: "5. Limitation of Liability",
  legal_tos_liability_text:
    "To the maximum extent permitted by law, the Company, its directors, employees, and partners shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of this website, including but not limited to loss of profits, data loss, or business interruption, whether based on contract, tort, or any other legal theory, even if the Company has been advised of the possibility of such damages.",
  legal_tos_changes_title: "6. Changes to Terms",
  legal_tos_changes_text:
    "The Company reserves the right to amend these Terms of Service at any time. Amended terms will be posted on this page. Continued use of this website constitutes your acceptance of the amended terms. Material changes will be communicated to users through appropriate means.",
  legal_tos_governing_title: "7. Governing Law and Jurisdiction",
  legal_tos_governing_text:
    "The interpretation and application of these Terms of Service, and any disputes arising from the use of this website, shall be governed by the laws of the Republic of China. Both parties agree that the Taipei District Court of Taiwan shall be the court of first instance.",

  legal_footer_link: "Privacy & Terms",
};
