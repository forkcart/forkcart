export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Craft.js serialized JSON string */
  content: string;
}

/** Blank template — empty canvas */
const blankTemplate: PageTemplate = {
  id: 'blank',
  name: 'Blank Page',
  description: 'Start from scratch with an empty canvas',
  icon: '📄',
  content: '',
};

/** Homepage template — Hero + Categories + Products + Newsletter */
const homepageTemplate: PageTemplate = {
  id: 'homepage',
  name: 'Homepage',
  description: 'Hero banner, category grid, product showcase, and newsletter signup',
  icon: '🏠',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'iconGrid1', 'catGrid1', 'prodGrid1', 'testimonials1', 'newsletter1'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'Welcome to Our Store',
        subtitle: 'Discover amazing products curated just for you',
        ctaText: 'Shop Now',
        ctaLink: '/products',
        backgroundColor: '#1f2937',
        overlayOpacity: 40,
        height: 'lg',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Hero Banner',
    },
    iconGrid1: {
      type: { resolvedName: 'IconGrid' },
      props: {
        items: [
          { icon: '🚚', title: 'Free Shipping', description: 'On orders over $50' },
          { icon: '🔒', title: 'Secure Payment', description: '100% secure checkout' },
          { icon: '↩️', title: 'Easy Returns', description: '30-day return policy' },
          { icon: '💬', title: '24/7 Support', description: 'We are here to help' },
        ],
        columns: 4,
        iconSize: 'md',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Icon Grid',
    },
    catGrid1: {
      type: { resolvedName: 'CategoryGrid' },
      props: { columns: 3 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Category Grid',
    },
    prodGrid1: {
      type: { resolvedName: 'ProductGrid' },
      props: { limit: 8, sortBy: 'createdAt', columns: 4 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Product Grid',
    },
    testimonials1: {
      type: { resolvedName: 'Testimonials' },
      props: {
        items: [
          {
            name: 'Sarah Johnson',
            role: 'Verified Buyer',
            content:
              'Amazing quality! The product exceeded my expectations. Will definitely order again.',
            rating: 5,
          },
          {
            name: 'Mike Chen',
            role: 'Repeat Customer',
            content: 'Fast shipping and great customer service. Highly recommended!',
            rating: 5,
          },
          {
            name: 'Emma Davis',
            role: 'Verified Buyer',
            content: 'Love the attention to detail. Beautiful packaging and top-notch quality.',
            rating: 4,
          },
        ],
        columns: 3,
        showRating: true,
        backgroundColor: '#f9fafb',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Testimonials',
    },
    newsletter1: {
      type: { resolvedName: 'Newsletter' },
      props: {},
      nodes: [],
      parent: 'ROOT',
      displayName: 'Newsletter',
    },
  }),
};

/** About Us template — Hero + Text + Team/Image + CTA */
const aboutTemplate: PageTemplate = {
  id: 'about',
  name: 'About Us',
  description: 'Tell your brand story with hero, text sections, and a call to action',
  icon: '👋',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'text1', 'divider1', 'text2', 'button1'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'About Us',
        subtitle: 'Our story, our mission, our values',
        ctaText: '',
        backgroundColor: '#374151',
        height: 'md',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Hero Banner',
    },
    text1: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          'We started with a simple idea: bring high-quality products directly to you. Since our founding, we have been committed to excellence in everything we do — from sourcing the finest materials to providing outstanding customer service.\n\nOur team is passionate about creating products that make a difference in your daily life. Every item in our store has been carefully selected to meet our high standards of quality and value.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Text',
    },
    divider1: {
      type: { resolvedName: 'Divider' },
      props: { style: 'solid', color: '#e5e7eb', thickness: 1, width: '1/4', marginY: 32 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Divider',
    },
    text2: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          '**Our Mission**\n\nTo provide our customers with the best products at fair prices, delivered with exceptional service. We believe that everyone deserves access to quality goods without compromise.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Text',
    },
    button1: {
      type: { resolvedName: 'ButtonBlock' },
      props: {
        text: 'Browse Our Products',
        link: '/products',
        variant: 'primary',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Button',
    },
  }),
};

/** Contact template — Heading + Text + Contact Form + Map */
const contactTemplate: PageTemplate = {
  id: 'contact',
  name: 'Contact',
  description: 'Contact form with a map and your business information',
  icon: '📬',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['heading1', 'text1', 'form1', 'map1'],
      displayName: 'Container',
    },
    heading1: {
      type: { resolvedName: 'Heading' },
      props: { text: 'Contact Us', level: 'h1', alignment: 'center' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Heading',
    },
    text1: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          'Have a question or feedback? We would love to hear from you. Fill out the form below and we will get back to you as soon as possible.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Text',
    },
    form1: {
      type: { resolvedName: 'ContactForm' },
      props: {
        title: '',
        subtitle: '',
        buttonText: 'Send Message',
        showPhone: true,
        showSubject: true,
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Contact Form',
    },
    map1: {
      type: { resolvedName: 'MapEmbed' },
      props: { query: 'New York, NY', height: 350, borderRadius: 12 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Map',
    },
  }),
};

/** Landing Page template — Hero + Features + Testimonials + CTA */
const landingTemplate: PageTemplate = {
  id: 'landing',
  name: 'Landing Page',
  description: 'High-conversion page with hero, feature grid, testimonials, and CTA',
  icon: '🚀',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'iconGrid1', 'divider1', 'testimonials1', 'spacer1', 'button1'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'Transform Your Business Today',
        subtitle: 'Join thousands of satisfied customers who trust our platform',
        ctaText: 'Get Started',
        ctaLink: '/products',
        backgroundColor: '#1e3a5f',
        height: 'xl',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Hero Banner',
    },
    iconGrid1: {
      type: { resolvedName: 'IconGrid' },
      props: {
        items: [
          {
            icon: '⚡',
            title: 'Lightning Fast',
            description: 'Optimized for speed and performance',
          },
          {
            icon: '🛡️',
            title: 'Secure & Reliable',
            description: 'Enterprise-grade security built in',
          },
          { icon: '📈', title: 'Scalable', description: 'Grows with your business needs' },
          { icon: '🎨', title: 'Customizable', description: 'Make it truly yours' },
        ],
        columns: 4,
        iconSize: 'lg',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Icon Grid',
    },
    divider1: {
      type: { resolvedName: 'Divider' },
      props: { style: 'solid', color: '#e5e7eb', thickness: 1, width: '1/2', marginY: 16 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Divider',
    },
    testimonials1: {
      type: { resolvedName: 'Testimonials' },
      props: {
        items: [
          {
            name: 'Alex Rodriguez',
            role: 'CEO, TechCorp',
            content:
              'This platform has completely transformed how we do business. The ROI was immediate.',
            rating: 5,
          },
          {
            name: 'Lisa Wang',
            role: 'Director of Operations',
            content: 'Best decision we made this year. The team support is phenomenal.',
            rating: 5,
          },
          {
            name: 'James Mitchell',
            role: 'Founder, StartupXYZ',
            content: 'From idea to launch in days, not months. Game changer.',
            rating: 5,
          },
        ],
        columns: 3,
        showRating: true,
        backgroundColor: '#f9fafb',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Testimonials',
    },
    spacer1: {
      type: { resolvedName: 'Spacer' },
      props: { size: 'md' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Spacer',
    },
    button1: {
      type: { resolvedName: 'ButtonBlock' },
      props: {
        text: 'Start Your Free Trial',
        link: '/products',
        variant: 'primary',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Button',
    },
  }),
};

/** Product Showcase template — Hero + Featured + Grid + Newsletter */
const productShowcaseTemplate: PageTemplate = {
  id: 'product-showcase',
  name: 'Product Showcase',
  description: 'Highlight your best products with a featured item, grid, and newsletter',
  icon: '🛍️',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'featured1', 'prodGrid1', 'newsletter1'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'New Collection',
        subtitle: 'Explore our latest arrivals — crafted with care',
        ctaText: 'View All',
        ctaLink: '/products',
        backgroundColor: '#0f172a',
        height: 'md',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Hero Banner',
    },
    featured1: {
      type: { resolvedName: 'FeaturedProduct' },
      props: {},
      nodes: [],
      parent: 'ROOT',
      displayName: 'Featured Product',
    },
    prodGrid1: {
      type: { resolvedName: 'ProductGrid' },
      props: { limit: 8, columns: 4 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Product Grid',
    },
    newsletter1: {
      type: { resolvedName: 'Newsletter' },
      props: {},
      nodes: [],
      parent: 'ROOT',
      displayName: 'Newsletter',
    },
  }),
};

/** Product Detail template — Hero + Product Info + Related Products + Reviews */
const productDetailTemplate: PageTemplate = {
  id: 'product-detail',
  name: 'Product Detail',
  description: 'Product page with image hero, details, related products, and reviews',
  icon: '🛍️',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'text1', 'divider1', 'prodGrid1', 'divider2', 'text2'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'Product Name',
        subtitle: 'Product tagline or short description',
        ctaText: 'Add to Cart',
        ctaLink: '#',
        backgroundColor: '#111827',
        height: 'lg',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Product Hero',
    },
    text1: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          '**Product Details**\n\nThis section is dynamically replaced with the actual product information (price, description, variants, and add-to-cart button) when viewing a real product. Customize the surrounding layout here in the Page Builder.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Product Info',
    },
    divider1: {
      type: { resolvedName: 'Divider' },
      props: { style: 'solid', color: '#e5e7eb', thickness: 1, width: '1/2', marginY: 24 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Divider',
    },
    prodGrid1: {
      type: { resolvedName: 'ProductGrid' },
      props: { limit: 4, columns: 4 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Related Products',
    },
    divider2: {
      type: { resolvedName: 'Divider' },
      props: { style: 'solid', color: '#e5e7eb', thickness: 1, width: '1/2', marginY: 24 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Divider',
    },
    text2: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          '**Customer Reviews**\n\nReviews are loaded dynamically from the product review system. This placeholder shows where they will appear on the page.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Reviews Section',
    },
  }),
};

/** Cart Page template — Heading + Cart Area + Cross-sell */
const cartTemplate: PageTemplate = {
  id: 'cart',
  name: 'Cart Page',
  description: 'Shopping cart with cross-sell product suggestions',
  icon: '🛒',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['heading1', 'text1', 'divider1', 'heading2', 'prodGrid1'],
      displayName: 'Container',
    },
    heading1: {
      type: { resolvedName: 'Heading' },
      props: { text: 'Shopping Cart', level: 'h1', alignment: 'center' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Heading',
    },
    text1: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          'Your cart items are displayed dynamically below. This area is automatically replaced with your current cart contents, quantities, and totals when the page is rendered.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Cart Items Area',
    },
    divider1: {
      type: { resolvedName: 'Divider' },
      props: { style: 'solid', color: '#e5e7eb', thickness: 1, width: '1/2', marginY: 32 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Divider',
    },
    heading2: {
      type: { resolvedName: 'Heading' },
      props: { text: 'You Might Also Like', level: 'h2', alignment: 'center' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Cross-sell Heading',
    },
    prodGrid1: {
      type: { resolvedName: 'ProductGrid' },
      props: { limit: 4, columns: 4 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Cross-sell Products',
    },
  }),
};

/** Checkout Page template — Heading + Checkout Steps + Trust Badges */
const checkoutTemplate: PageTemplate = {
  id: 'checkout',
  name: 'Checkout Page',
  description: 'Checkout flow with trust badges and secure payment indicators',
  icon: '💳',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['heading1', 'text1', 'iconGrid1'],
      displayName: 'Container',
    },
    heading1: {
      type: { resolvedName: 'Heading' },
      props: { text: 'Checkout', level: 'h1', alignment: 'center' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Heading',
    },
    text1: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          'The checkout steps (shipping address, payment method, order review) are rendered dynamically here. Customize the surrounding page elements using the Page Builder.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Checkout Steps',
    },
    iconGrid1: {
      type: { resolvedName: 'IconGrid' },
      props: {
        items: [
          { icon: '🔒', title: 'Secure Checkout', description: 'SSL encrypted payment' },
          { icon: '🚚', title: 'Fast Shipping', description: 'Quick and reliable delivery' },
          { icon: '↩️', title: 'Easy Returns', description: 'Hassle-free return policy' },
        ],
        columns: 3,
        iconSize: 'md',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Trust Badges',
    },
  }),
};

/** Account Page template — Heading + Dashboard Text + Section Icons */
const accountTemplate: PageTemplate = {
  id: 'account',
  name: 'Account Page',
  description: 'Customer account dashboard with navigation sections',
  icon: '👤',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['heading1', 'text1', 'iconGrid1'],
      displayName: 'Container',
    },
    heading1: {
      type: { resolvedName: 'Heading' },
      props: { text: 'My Account', level: 'h1', alignment: 'center' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Heading',
    },
    text1: {
      type: { resolvedName: 'TextBlock' },
      props: {
        content:
          'Welcome to your account dashboard. Manage your orders, addresses, and account settings below. The account functionality is loaded dynamically.',
        fontSize: 'base',
        alignment: 'center',
        maxWidth: 'md',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Dashboard Text',
    },
    iconGrid1: {
      type: { resolvedName: 'IconGrid' },
      props: {
        items: [
          { icon: '📦', title: 'Orders', description: 'View your order history' },
          { icon: '📍', title: 'Addresses', description: 'Manage shipping addresses' },
          { icon: '⚙️', title: 'Settings', description: 'Account preferences' },
        ],
        columns: 3,
        iconSize: 'lg',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Account Sections',
    },
  }),
};

/** 404 Page template — Hero with "Page Not Found" + Button home */
const error404Template: PageTemplate = {
  id: '404',
  name: '404 Page',
  description: 'Page not found with a call to action back to the homepage',
  icon: '❌',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'button1'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'Page Not Found',
        subtitle: 'Sorry, the page you are looking for does not exist or has been moved.',
        ctaText: '',
        backgroundColor: '#1f2937',
        height: 'md',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Hero Banner',
    },
    button1: {
      type: { resolvedName: 'ButtonBlock' },
      props: {
        text: 'Back to Homepage',
        link: '/',
        variant: 'primary',
        alignment: 'center',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Button',
    },
  }),
};

/** Search Results template — Heading + Product Grid */
const searchResultsTemplate: PageTemplate = {
  id: 'search-results',
  name: 'Search Results',
  description: 'Search results page with a product grid',
  icon: '🔍',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['heading1', 'prodGrid1'],
      displayName: 'Container',
    },
    heading1: {
      type: { resolvedName: 'Heading' },
      props: { text: 'Search Results', level: 'h1', alignment: 'center' },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Heading',
    },
    prodGrid1: {
      type: { resolvedName: 'ProductGrid' },
      props: { limit: 12, columns: 4 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Search Results Grid',
    },
  }),
};

/** Category Page template — Hero + Product Grid + Newsletter */
const categoryTemplate: PageTemplate = {
  id: 'category',
  name: 'Category Page',
  description: 'Category page with hero banner, product grid, and newsletter signup',
  icon: '📁',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { paddingX: 0, paddingY: 0, maxWidth: 'full', backgroundColor: 'transparent' },
      nodes: ['hero1', 'prodGrid1', 'newsletter1'],
      displayName: 'Container',
    },
    hero1: {
      type: { resolvedName: 'Hero' },
      props: {
        title: 'Category Name',
        subtitle: 'Browse our collection',
        ctaText: '',
        backgroundColor: '#374151',
        height: 'md',
        alignment: 'center',
        textColor: '#ffffff',
      },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Category Hero',
    },
    prodGrid1: {
      type: { resolvedName: 'ProductGrid' },
      props: { limit: 12, columns: 4 },
      nodes: [],
      parent: 'ROOT',
      displayName: 'Product Grid',
    },
    newsletter1: {
      type: { resolvedName: 'Newsletter' },
      props: {},
      nodes: [],
      parent: 'ROOT',
      displayName: 'Newsletter',
    },
  }),
};

export const pageTemplates: PageTemplate[] = [
  blankTemplate,
  homepageTemplate,
  aboutTemplate,
  contactTemplate,
  landingTemplate,
  productShowcaseTemplate,
  productDetailTemplate,
  cartTemplate,
  checkoutTemplate,
  accountTemplate,
  error404Template,
  searchResultsTemplate,
  categoryTemplate,
];
