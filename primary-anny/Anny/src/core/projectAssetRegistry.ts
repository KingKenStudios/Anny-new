/**
 * ANNY — GENERAL-PURPOSE UNIVERSAL ASSET & IMAGE REGISTRY (UPGRADED v3.0)
 * Provides high-resolution curated asset mappings, hero slide collections,
 * domain-aware image discovery, and dynamic keyword-tailored Unsplash assets
 * for all generated applications across any domain.
 */

export interface ImageAssetItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  category: string;
  tag?: string;
  price?: string;
  meta?: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  badge: string;
  ctaText: string;
  secondaryCtaText?: string;
}

export interface DomainAssetBundle {
  domainKey: string;
  domainTitle: string;
  heroSlides: HeroSlide[];
  cardItems: ImageAssetItem[];
  galleryImages: string[];
  bannerImage: string;
}

export class ProjectAssetRegistry {
  private static bundles: Record<string, DomainAssetBundle> = {
    education: {
      domainKey: 'education',
      domainTitle: 'University & Higher Education',
      bannerImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'edu-slide-1',
          title: 'Excellence, Innovation & Global Leadership',
          subtitle: 'Academic Year 2026 / 2027 Session',
          description: 'Empowering future leaders through world-class academic programs, cutting-edge AI research labs, and global faculty collaboration.',
          imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80',
          badge: '2026 ACADEMIC SESSION',
          ctaText: 'Explore Degree Programs',
          secondaryCtaText: 'Admissions Portal'
        },
        {
          id: 'edu-slide-2',
          title: 'State-of-the-Art Robotics & AI Research',
          subtitle: 'Faculty of Engineering & Computing',
          description: 'Discover specialized undergraduate and postgraduate research grants in mechatronics, neural computing, and autonomous systems.',
          imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=80',
          badge: 'INNOVATION HUB',
          ctaText: 'View Research Labs',
          secondaryCtaText: 'Scholarships'
        },
        {
          id: 'edu-slide-3',
          title: 'Vibrant Campus Life & Diverse Community',
          subtitle: 'Main Campus Quadrangle',
          description: 'Join over 28,000 students from 85 countries participating in leadership forums, sports, culture, and innovation expositions.',
          imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
          badge: 'CAMPUS LIFE',
          ctaText: 'Campus Tour',
          secondaryCtaText: 'Student Portal'
        }
      ],
      cardItems: [
        {
          id: 'edu-1',
          title: 'College of Engineering & Autonomous Systems',
          subtitle: 'Dean Prof. K. Akinwumi',
          description: 'Offering accredited degree tracks in Mechatronics, AI Systems, and Aerospace Engineering.',
          url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
          category: 'Engineering & Tech',
          tag: 'Top 1% Accredited',
          meta: '12 Degree Majors'
        },
        {
          id: 'edu-2',
          title: 'Faculty of Computer Science & Neural Computing',
          subtitle: 'Department of AI',
          description: 'Pioneering neural matrix algorithms, cloud architectures, and machine intelligence research.',
          url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
          category: 'Computer Science & AI',
          tag: 'Research Priority',
          meta: '850 Active Scholars'
        },
        {
          id: 'edu-3',
          title: 'College of Health, Medicine & Neural Technology',
          subtitle: 'Medical Center',
          description: 'Clinical excellence with state-of-the-art diagnostic labs and bio-engineering research.',
          url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
          category: 'Health & Life Sciences',
          tag: 'Clinical Research',
          meta: 'Teaching Hospital'
        },
        {
          id: 'edu-4',
          title: 'School of Business & Enterprise Leadership',
          subtitle: 'Executive Management',
          description: 'Preparing global executives, tech entrepreneurs, and strategic enterprise leaders.',
          url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
          category: 'Business & Economics',
          tag: 'AACSB Accredited',
          meta: 'Global Exchange'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80'
      ]
    },

    ecommerce: {
      domainKey: 'ecommerce',
      domainTitle: 'E-Commerce & Retail Marketplace',
      bannerImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'ecom-slide-1',
          title: 'Quantum Kinetic Athletic Performance Gear',
          subtitle: 'New Season Release 2026',
          description: 'Engineered with responsive energy-return soles and breathable weatherproof mesh for maximum mobility.',
          imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1600&q=80',
          badge: 'NEW ARRIVALS',
          ctaText: 'Shop New Collection',
          secondaryCtaText: 'View Lookbook'
        },
        {
          id: 'ecom-slide-2',
          title: 'Urban Cyber Designer Apparel Collection',
          subtitle: 'Limited Edition Drop',
          description: 'Precision-tailored minimalist streetwear with water-resistant membranes and tactical storage compartments.',
          imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
          badge: 'TRENDING NOW',
          ctaText: 'Explore Apparel',
          secondaryCtaText: 'Size Guide'
        },
        {
          id: 'ecom-slide-3',
          title: 'Minimalist Smart Tech & Daily Accessories',
          subtitle: 'Everyday Carry Essentials',
          description: 'High-grade anodized aluminum travel gear, chronometers, and noise-canceling audio hardware.',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80',
          badge: 'TECH ACCESSORIES',
          ctaText: 'Shop Accessories',
          secondaryCtaText: 'Best Sellers'
        }
      ],
      cardItems: [
        {
          id: 'ecom-1',
          title: 'Quantum Kinetic Runner Pro',
          subtitle: 'Performance Footwear',
          description: 'Ultra-lightweight mesh upper with ultra-responsive nitrogen cushion midsole.',
          url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
          category: 'Footwear',
          price: '$189.00',
          tag: 'Best Seller',
          meta: 'In Stock (42 units)'
        },
        {
          id: 'ecom-2',
          title: 'AeroTech 3-Layer Waterproof Jacket',
          subtitle: 'Outerwear',
          description: 'Windproof breathable technical shell with laser-cut ventilation ports.',
          url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
          category: 'Apparel',
          price: '$245.00',
          tag: 'New Drop',
          meta: 'In Stock (18 units)'
        },
        {
          id: 'ecom-3',
          title: 'CyberGrip Tactical Modular Duffle',
          subtitle: 'Travel Gear',
          description: '1000D waterproof ripstop nylon with magnetic FIDLOCK buckles.',
          url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
          category: 'Accessories',
          price: '$115.00',
          tag: 'Popular',
          meta: 'In Stock (65 units)'
        },
        {
          id: 'ecom-4',
          title: 'Titanium Smart Chrono Watch V2',
          subtitle: 'Timepieces',
          description: 'Sapphire glass display with 14-day battery life and biometric sensors.',
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          category: 'Accessories',
          price: '$320.00',
          tag: 'Premium',
          meta: 'In Stock (12 units)'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
      ]
    },

    saas: {
      domainKey: 'saas',
      domainTitle: 'SaaS & Enterprise Platform',
      bannerImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'saas-slide-1',
          title: 'Automated Neural AI Platform & Analytics Hub',
          subtitle: 'Enterprise AIOS Engine V2',
          description: 'Streamline team workflows, deploy predictive intelligence models, and orchestrate serverless microservices with real-time telemetry.',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80',
          badge: 'ENTERPRISE AI PLATFORM',
          ctaText: 'Start Free Trial',
          secondaryCtaText: 'Schedule Demo'
        },
        {
          id: 'saas-slide-2',
          title: 'Global High-Throughput Sovereign Cloud Node',
          subtitle: 'Zero-Trust Infrastructure',
          description: 'End-to-end encrypted datalakes, real-time message brokers, and sub-millisecond edge API routing.',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
          badge: '99.99% UPTIME SLA',
          ctaText: 'Deploy Infrastructure',
          secondaryCtaText: 'View Benchmarks'
        },
        {
          id: 'saas-slide-3',
          title: 'Intelligent Code & Workflow Synthesizer',
          subtitle: 'Autonomous Developer Experience',
          description: 'Generate full-stack microservices, automate security audits, and continuously verify production releases.',
          imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
          badge: 'AUTONOMOUS DEVOPS',
          ctaText: 'Launch Studio',
          secondaryCtaText: 'Documentation'
        }
      ],
      cardItems: [
        {
          id: 'saas-1',
          title: 'Automated Workflow Orchestrator',
          subtitle: 'Core Engine',
          description: 'Visual event graph editor for multi-stage background pipelines and webhook triggers.',
          url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
          category: 'Automation',
          tag: 'Active Module',
          meta: 'p99: 1.2ms'
        },
        {
          id: 'saas-2',
          title: 'Real-Time Telemetry & Monitoring',
          subtitle: 'Observability',
          description: 'Live CPU, memory, log streams, and anomaly detection alerts across all nodes.',
          url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80',
          category: 'Analytics',
          tag: 'Live Sync',
          meta: '12,400 events/sec'
        },
        {
          id: 'saas-3',
          title: 'Cryptographic Security Sentinel',
          subtitle: 'Cyber Shield',
          description: 'Automated vulnerability scanner, rate limiter, and token authorization enforcement.',
          url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
          category: 'Security',
          tag: 'ISO 27001',
          meta: 'Zero Breaches'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80'
      ]
    },

    restaurant: {
      domainKey: 'restaurant',
      domainTitle: 'Culinary & Fine Dining Experience',
      bannerImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'rest-slide-1',
          title: 'Exquisite Culinary Artistry & Fine Dining',
          subtitle: 'Michelin Star Chef Signature Menu',
          description: 'Indulge in an unforgettable gastronomic journey featuring organic farm-to-table delicacies and sommelier wine pairings.',
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
          badge: 'FINE DINING',
          ctaText: 'Reserve a Table',
          secondaryCtaText: 'View Dinner Menu'
        },
        {
          id: 'rest-slide-2',
          title: 'Master Chef Signature Tasting Experience',
          subtitle: 'Seasonal Harvest 2026',
          description: 'Handcrafted multi-course tasting menu paired with rare vintages from our temperature-controlled cellar.',
          imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
          badge: 'CHEF SPECIALS',
          ctaText: 'Explore Tasting Menu',
          secondaryCtaText: 'Private Dining'
        },
        {
          id: 'rest-slide-3',
          title: 'Artisan Cocktail Bar & Sommelier Lounge',
          subtitle: 'Crafted Mixology',
          description: 'Enjoy bespoke handcrafted botanical cocktails, rare whiskies, and house-infused aperitifs in our ambient lounge.',
          imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1600&q=80',
          badge: 'LOUNGE & BAR',
          ctaText: 'Drinks Menu',
          secondaryCtaText: 'Events'
        }
      ],
      cardItems: [
        {
          id: 'rest-1',
          title: 'Seared Aged Prime Ribeye',
          subtitle: 'Signature Main Course',
          description: '45-day dry-aged beef served with truffle bone marrow reduction and charred asparagus.',
          url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
          category: 'Main Dishes',
          price: '$68.00',
          tag: 'Chef Signature'
        },
        {
          id: 'rest-2',
          title: 'Wild Black Truffle Risotto',
          subtitle: 'Primo Corso',
          description: 'Acquerello carnaroli rice with aged Parmigiano Reggiano and shaved Piedmontese truffles.',
          url: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80',
          category: 'Starters',
          price: '$42.00',
          tag: 'Vegetarian'
        },
        {
          id: 'rest-3',
          title: 'Wood-Fired Neapolitan Artisan Pizza',
          subtitle: 'Specialty Oven',
          description: 'San Marzano DOP tomatoes, buffalo mozzarella, and fresh basil charred in our 900°F oven.',
          url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
          category: 'Main Dishes',
          price: '$32.00',
          tag: 'Organic'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'
      ]
    },

    hospital: {
      domainKey: 'hospital',
      domainTitle: 'Healthcare & Hospital Management',
      bannerImage: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'hosp-slide-1',
          title: 'Advanced Clinical Healthcare & Emergency Care',
          subtitle: 'AuraHealth Medical Center',
          description: 'Providing 24/7 comprehensive patient medical care, robotic surgery suites, electronic health records (EHR), and emergency ICU response.',
          imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1600&q=80',
          badge: '24/7 EMERGENCY ACTIVE',
          ctaText: 'Book Appointment',
          secondaryCtaText: 'Patient Portal'
        },
        {
          id: 'hosp-slide-2',
          title: 'Precision Surgical & Neural Medicine Wing',
          subtitle: 'Robotic Surgical Center',
          description: 'Equipped with da Vinci surgical robotics, high-field MRI scanners, and specialized neurology intensive care units.',
          imageUrl: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1600&q=80',
          badge: 'PRECISION MEDICINE',
          ctaText: 'Consult Specialist',
          secondaryCtaText: 'Departments'
        },
        {
          id: 'hosp-slide-3',
          title: 'Real-Time ICU Vital Monitoring & Telemetry',
          subtitle: 'Critical Patient Telemetry',
          description: 'Continuous digital telemetry for heart rate, spO2, ventilator pressure, and automated alert dispatch.',
          imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80',
          badge: 'ICU TELEMETRY',
          ctaText: 'View ICU Dashboard',
          secondaryCtaText: 'Doctors Roster'
        }
      ],
      cardItems: [
        {
          id: 'hosp-1',
          title: 'Cardiology & Vascular Surgery Unit',
          subtitle: 'Dr. S. Chen, Chief of Surgery',
          description: 'Comprehensive cardiac catheterization, pacemaker implants, and non-invasive electrophysiology.',
          url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
          category: 'Cardiology',
          tag: 'Emergency Ready'
        },
        {
          id: 'hosp-2',
          title: 'Neurology & Brain Technology Center',
          subtitle: 'Prof. M. Vance',
          description: 'Specialized diagnosis and treatment of neuro-vascular conditions, stroke rehabilitation, and EEG monitoring.',
          url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
          category: 'Neurology',
          tag: 'Research Center'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80'
      ]
    },

    industrial: {
      domainKey: 'industrial',
      domainTitle: 'SCADA & Mechatronics Industrial Control',
      bannerImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'ind-slide-1',
          title: 'KEDA SCADA & Industrial Control Operating System',
          subtitle: 'Level 4 Autonomous Factory Controller',
          description: 'High-frequency MQTT telemetry processing, hydraulic valve pressure monitoring, and digital Lockout/Tagout (LOTO) safety enforcement.',
          imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
          badge: 'SCADA OPERATIONAL',
          ctaText: 'Open Control Panel',
          secondaryCtaText: 'Digital LOTO Lock'
        },
        {
          id: 'ind-slide-2',
          title: 'Hydraulic Actuator & PLC Valve Diagnostics',
          subtitle: 'Plant Pressure Monitor',
          description: 'Real-time telemetry stream monitoring hydraulic pressure (1,450 PSI), coil temperature, and valve flow rates.',
          imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1600&q=80',
          badge: 'VALVE MATRIX',
          ctaText: 'View Telemetry',
          secondaryCtaText: 'Calibrate Sensors'
        },
        {
          id: 'ind-slide-3',
          title: 'Autonomous Robotics & Mechatronics Assembly',
          subtitle: '3D Digital Twin Active',
          description: 'Robotic arm positioning, inverse kinematics calculations, and safety boundary sensors.',
          imageUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1600&q=80',
          badge: 'ROBOTICS CELL',
          ctaText: 'Digital Twin Twin',
          secondaryCtaText: 'Audit Log'
        }
      ],
      cardItems: [
        {
          id: 'ind-1',
          title: 'Main Hydraulic Relief Valve V-102',
          subtitle: 'Subsystem SCADA-1',
          description: 'Monitored pressure: 1,420 PSI. Status: OPERATIONAL. Digital LOTO Key Armed.',
          url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
          category: 'Hydraulics',
          tag: 'LOTO Ready'
        },
        {
          id: 'ind-2',
          title: 'Robotic Pick & Place Kinematic Cell',
          subtitle: 'Subsystem ROBOT-4',
          description: '6-axis articulated robot cell operating at 98.4% efficiency with optical safety curtain.',
          url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80',
          category: 'Robotics',
          tag: '6-Axis Synchronized'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
      ]
    },

    realestate: {
      domainKey: 'realestate',
      domainTitle: 'Luxury Real Estate & Architectural Living',
      bannerImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 're-slide-1',
          title: 'Architectural Masterpieces & Prime Coastal Villas',
          subtitle: 'Exclusive Collection 2026',
          description: 'Discover ultra-luxury private estates, waterfront penthouses, and smart sustainable architectural living spaces.',
          imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
          badge: 'LUXURY REAL ESTATE',
          ctaText: 'Explore Estates',
          secondaryCtaText: 'Schedule Private Tour'
        },
        {
          id: 're-slide-2',
          title: 'Contemporary Minimalist Penthouse Residences',
          subtitle: 'Urban Sky Tower',
          description: 'Panoramic skyline views, Italian marble interiors, smart home automation, and private infinity pools.',
          imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
          badge: 'PENTHOUSE COLLECTION',
          ctaText: 'View Floorplans',
          secondaryCtaText: 'Virtual 3D Walkthrough'
        }
      ],
      cardItems: [
        {
          id: 're-1',
          title: 'The Glass Pavilion Coastal Estate',
          subtitle: 'Malibu Coastline',
          description: '6 Bedrooms, 8 Bathrooms, private beach access, custom solar roof, and climate-controlled garage.',
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          category: 'Villas',
          price: '$12,800,000',
          tag: 'Verified Listing'
        },
        {
          id: 're-2',
          title: 'Metropolitan Sky Penthouse Suite',
          subtitle: 'Downtown High-Rise',
          description: '4,200 sq ft luxury duplex with floor-to-ceiling glass, private elevator, and concierge service.',
          url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
          category: 'Penthouses',
          price: '$6,450,000',
          tag: 'Featured'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
      ]
    },

    finance: {
      domainKey: 'finance',
      domainTitle: 'FinTech & Sovereign Digital Wealth System',
      bannerImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'fin-slide-1',
          title: 'Next-Generation Sovereign Wealth & Asset Engine',
          subtitle: 'Quantum Ledger V4',
          description: 'Real-time multi-currency settlement, automated yield optimization, and institutional cryptographic security.',
          imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80',
          badge: 'QUANTUM FINTECH',
          ctaText: 'Open Wealth Terminal',
          secondaryCtaText: 'View Institutional Yields'
        },
        {
          id: 'fin-slide-2',
          title: 'Institutional Crypto & Global Forex Terminal',
          subtitle: 'Sub-Millisecond Execution',
          description: 'High-frequency liquidity aggregation, cross-border wire transfers, and automated risk hedging.',
          imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1600&q=80',
          badge: 'DEEP LIQUIDITY',
          ctaText: 'Trade Terminal',
          secondaryCtaText: 'API Documentation'
        }
      ],
      cardItems: [
        {
          id: 'fin-1',
          title: 'Automated Yield Optimizer Vault',
          subtitle: 'Fixed Return Strategy',
          description: 'Algorithmic yield routing generating 8.4% APY with real-time collateral auditing.',
          url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
          category: 'Vaults',
          price: '8.4% APY',
          tag: 'Active'
        },
        {
          id: 'fin-2',
          title: 'Cross-Border Instant Settlement Bridge',
          subtitle: 'SEPA & SWIFT Matrix',
          description: 'Zero-fee global money transfers with sub-second finality and cryptographic audit trails.',
          url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
          category: 'Payments',
          tag: 'Instant Sync'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80'
      ]
    },

    aios: {
      domainKey: 'aios',
      domainTitle: 'AIOS & Neural Matrix Operating System',
      bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
      heroSlides: [
        {
          id: 'aios-slide-1',
          title: 'ANNY Universal AI Operating System Shell',
          subtitle: 'Nexus Core Matrix Kernel v1.0',
          description: 'Autonomous multi-agent orchestration, offline neural GGUF inference, real-time memory graph, and cyber workspace desktop.',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
          badge: 'SYSTEM ACTIVE',
          ctaText: 'Launch AIOS Desktop',
          secondaryCtaText: 'System Diagnostics'
        },
        {
          id: 'aios-slide-2',
          title: 'Neural Matrix Agent Workspace & Command Center',
          subtitle: 'Autonomous Worker Swarm',
          description: 'Deploy specialized AI agents for code synthesis, security auditing, robotics control, and data intelligence.',
          imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80',
          badge: 'AGENT MATRIX',
          ctaText: 'Open Agent Swarm',
          secondaryCtaText: 'Vector Storage'
        }
      ],
      cardItems: [
        {
          id: 'aios-1',
          title: 'Quantum Neural Model Router',
          subtitle: 'GGUF / Ollama Engine',
          description: 'Adaptive offline model switcher executing Llama 3.3, DeepSeek Coder, and Qwen 2.5.',
          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          category: 'Kernel',
          tag: 'Offline Ready'
        },
        {
          id: 'aios-2',
          title: 'Persistent Knowledge Graph Store',
          subtitle: 'Vector DB Shell',
          description: 'High-speed semantic search indexing past conversation turns, codebase VFS, and system logs.',
          url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
          category: 'Memory',
          tag: '100% Synced'
        }
      ],
      galleryImages: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80'
      ]
    }
  };

  public static getBundleForPrompt(prompt: string): DomainAssetBundle {
    const p = prompt.toLowerCase();

    if (/university|school|college|academic|campus|faculty|student|course|admissions|degree/i.test(p)) {
      return this.bundles.education;
    }
    if (/e-commerce|ecommerce|store|shop|shoe|clothing|fashion|retail|product|cart|buy|checkout|sneaker/i.test(p)) {
      return this.bundles.ecommerce;
    }
    if (/restaurant|culinary|food|dish|dining|chef|menu|recipe|bakery|cafe/i.test(p)) {
      return this.bundles.restaurant;
    }
    if (/hospital|medical|health|patient|doctor|clinic|icu|ehr|pharma/i.test(p)) {
      return this.bundles.hospital;
    }
    if (/keda|scada|industrial|plc|valve|hydraulic|mechatronics|robotics|loto|factory/i.test(p)) {
      return this.bundles.industrial;
    }
    if (/real estate|estate|property|house|apartment|villa|penthouse|realty|architecture/i.test(p)) {
      return this.bundles.realestate;
    }
    if (/bank|banking|fintech|finance|wealth|investment|trade|crypto|stock|ledger/i.test(p)) {
      return this.bundles.finance;
    }
    if (/aios|operating system|os shell|desktop|quantum kernel|neural matrix/i.test(p)) {
      return this.bundles.aios;
    }

    // Dynamic keyword extractor fallback for custom prompts
    return this.createDynamicBundleFromPrompt(prompt);
  }

  private static createDynamicBundleFromPrompt(prompt: string): DomainAssetBundle {
    const p = prompt.toLowerCase();
    
    // Extract topic or default to tech/modern
    let topic = 'modern technology platform';
    let keyword = 'technology';
    
    if (p.includes('coffee') || p.includes('cafe')) { topic = 'Artisan Coffee Roasters'; keyword = 'coffee'; }
    else if (p.includes('car') || p.includes('auto') || p.includes('vehicle')) { topic = 'Automotive & EV Showcase'; keyword = 'supercar'; }
    else if (p.includes('fitness') || p.includes('gym') || p.includes('workout')) { topic = 'Athletic Performance Hub'; keyword = 'gym'; }
    else if (p.includes('music') || p.includes('audio') || p.includes('sound')) { topic = 'Acoustic Studio & Audio Engine'; keyword = 'music'; }
    else if (p.includes('hotel') || p.includes('resort') || p.includes('travel')) { topic = 'Luxury Hotel & Spa Resort'; keyword = 'resort'; }
    else if (p.includes('security') || p.includes('cyber') || p.includes('shield')) { topic = 'Cybersecurity Command Center'; keyword = 'cybersecurity'; }
    else if (p.includes('law') || p.includes('legal') || p.includes('attorney')) { topic = 'Premier Legal Counsel & Advisory'; keyword = 'office'; }

    return {
      domainKey: 'custom-generated',
      domainTitle: topic,
      bannerImage: `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80`,
      heroSlides: [
        {
          id: 'custom-slide-1',
          title: `Next-Gen ${topic} Operating Engine`,
          subtitle: 'Production Release 2026',
          description: `Empowering high-performance workflows, intelligent automation, and seamless user experiences built for ${prompt}.`,
          imageUrl: `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80`,
          badge: 'ANNY ENTERPRISE APP',
          ctaText: 'Get Started',
          secondaryCtaText: 'Learn More'
        },
        {
          id: 'custom-slide-2',
          title: 'Intelligent Telemetry & Real-Time Performance',
          subtitle: 'Ultra-Low Latency Core',
          description: 'Experience sub-millisecond response times, automated data synchronization, and state-of-the-art interface design.',
          imageUrl: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80`,
          badge: 'HIGH PERFORMANCE',
          ctaText: 'Explore System',
          secondaryCtaText: 'View Metrics'
        }
      ],
      cardItems: [
        {
          id: 'custom-1',
          title: 'Primary Operational Module',
          subtitle: 'Active Core',
          description: 'Integrated system module providing full-stack real-time data orchestration and state management.',
          url: `https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80`,
          category: 'Core System',
          tag: 'Active',
          meta: '100% Uptime'
        },
        {
          id: 'custom-2',
          title: 'Analytics & Reporting Hub',
          subtitle: 'Telemetry Node',
          description: 'Comprehensive insights engine delivering predictive analytics and actionable metrics.',
          url: `https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80`,
          category: 'Analytics',
          tag: 'Live Sync',
          meta: 'Real-Time'
        }
      ],
      galleryImages: [
        `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80`,
        `https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80`
      ]
    };
  }

  private static dynamicExternalAssets: Map<string, Array<{ id: string; name: string; category: string; url: string; dimensions?: string; createdAt: string }>> = new Map();

  public static registerExternalAsset(projectId: string, asset: { name: string; category: string; url: string; dimensions?: string }) {
    const list = this.dynamicExternalAssets.get(projectId) || [];
    const item = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: asset.name,
      category: asset.category,
      url: asset.url,
      dimensions: asset.dimensions || '1024x1024',
      createdAt: new Date().toISOString()
    };
    list.push(item);
    this.dynamicExternalAssets.set(projectId, list);
    return item;
  }

  public registerExternalAsset(projectId: string, asset: { name: string; category: string; url: string; dimensions?: string }) {
    return ProjectAssetRegistry.registerExternalAsset(projectId, asset);
  }

  public static getExternalAssets(projectId: string) {
    return this.dynamicExternalAssets.get(projectId) || [];
  }
}

export const projectAssetRegistry = new ProjectAssetRegistry();
