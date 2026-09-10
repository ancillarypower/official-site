export const zh = {
  banner_title: "Ancillary Power",
  banner_sub: "整合內容、3D 模型與商店的多功能平台",
  nav_content: "內容",
  nav_models: "3D 模型",
  nav_store: "商店",
  nav_about: "關於我們",
  nav_cart: "購物車",
  nav_settings: "設定",
  loading: "載入中...",
  empty_no_content: "尚未載入內容",
  back_to_list: "返回列表",

  // Content
  models_title: "3D 模型",
  models_drop: "拖放 3D 模型至此處或點擊瀏覽",
  models_formats: "支援 .glb、.gltf、.obj、.stl（儲存於本機 IndexedDB）",
  models_loaded: "{n} 個已載入",
  models_persisted: "已儲存至本機",
  models_loading_db: "正在從本機載入已儲存的模型...",
  models_parsing: "解析模型中...",
  models_error: "模型載入失敗",

  // Store
  store_title: "商店",
  store_products: "{n} 項商品",

  // Settings panel
  fetch_title: "設定",
  site_url_label: "網站網址",
  site_url_hint: "同時用於 WordPress 內容和 WooCommerce（可分開設定）",
  fetch_wp_section: "WordPress 內容",
  fetch_type: "內容類型",
  fetch_per_page: "每頁筆數",
  fetch_proxy: "使用 CORS 代理",
  fetch_btn: "擷取內容",
  fetch_fetching: "擷取中...",
  fetch_footer: "WP: /wp-json/wp/v2/ ；WooCommerce: /wp-json/wc/v3/",

  // WooCommerce
  woo_section: "WooCommerce 商店",
  woo_use_same_url: "使用上方相同網址",
  woo_url: "商店網址",
  woo_key: "Consumer Key",
  woo_secret: "Consumer Secret",
  woo_per_page: "每頁商品數",
  woo_fetch_btn: "載入商品",
  woo_fetching: "載入中...",
  woo_success: "成功載入 {n} 項商品",

  // Cart
  cart_title: "購物車",
  cart_empty: "購物車是空的。",
  cart_total: "合計",
  cart_checkout: "結帳",
  cart_checkout_processing: "建立訂單中...",
  add_to_cart: "加入購物車",
  added: "✓ 已加入",
  in_cart: "在購物車",

  // Pagination & filtering
  total_items: "共 {n} 項",
  prev: "← 上一頁",
  next: "下一頁 →",
  no_results: "沒有結果",
  filter_placeholder: "搜尋...",
  sort_label: "排序",
  sort_date_desc: "日期（新→舊）",
  sort_date_asc: "日期（舊→新）",
  sort_title_asc: "標題 A→Z",
  sort_title_desc: "標題 Z→A",
  sort_price_asc: "價格（低→高）",
  sort_price_desc: "價格（高→低）",
  store_filter_placeholder: "搜尋商品...",

  // Content types
  type_posts: "文章",
  type_pages: "頁面",
  type_categories: "分類",
  type_tags: "標籤",
  type_media: "媒體",

  // Checkout
  checkout_billing: "帳單資訊",
  checkout_first_name: "名字",
  checkout_last_name: "姓氏",
  checkout_email: "Email",
  checkout_phone: "電話",
  checkout_address: "地址",
  checkout_city: "城市",
  checkout_postcode: "郵遞區號",
  checkout_country: "國家代碼",
  checkout_note: "點擊結帳將建立訂單並跳轉至付款頁面。",
  checkout_no_woo: "請先連接 WooCommerce 商店。",
  order_success_title: "✓ 訂單建立成功！",
  order_success_desc: "訂單 #{id} 已建立，正在跳轉...",
  order_success_link: "點此前往付款",

  // Footer
  footer_text: "WP 內容 + 3D 檢視器 + WooCommerce 商店",

  // About
  about_title: "關於 Ancillary Power",
  about_subtitle: "提供多元整合解決方案，驅動企業數位轉型",
  about_mission_title: "我們的使命",
  about_mission_text:
    "Ancillary Power 致力於整合內容管理、3D 視覺化與電子商務技術，為客戶提供一站式數位解決方案。我們相信技術的力量能夠簡化複雜流程，讓企業專注於核心業務。",
  about_services_title: "核心服務",
  about_service_content: "內容管理",
  about_service_content_desc:
    "透過 WordPress API 整合，提供靈活的內容發布與管理功能。",
  about_service_3d: "3D 模型展示",
  about_service_3d_desc:
    "支援多種 3D 格式，提供沉浸式互動體驗。",
  about_service_store: "電子商務",
  about_service_store_desc:
    "整合 WooCommerce，打造完整的線上購物體驗。",
  about_contact_title: "聯絡我們",
  about_contact_text:
    "如有任何問題或合作需求，歡迎與我們聯繫。",
  about_email_label: "Email",
  about_email_value: "contact@ancillarypower.com",

  // Sample products
  product_1: "無線降噪耳機",
  product_1_desc: "30 小時續航，自適應降噪。",
  product_2: "機械式鍵盤",
  product_2_desc: "75%，熱插拔，RGB。",
  product_3: "4K 網路攝影機",
  product_3_desc: "自動對焦，USB-C。",
  product_4: "USB-C 擴充基座",
  product_4_desc: "三螢幕，100W PD。",
  product_5: "人體工學滑鼠",
  product_5_desc: "垂直設計，可調 DPI。",
  product_6: "行動 SSD 2TB",
  product_6_desc: "2000MB/s，IP65。",
  product_7: "智慧檯燈",
  product_7_desc: "自動調光，無線充電。",
  product_8: "螢幕掛燈",
  product_8_desc: "非對稱光學，USB。",
} as const;

export type TranslationKey = keyof typeof zh;
