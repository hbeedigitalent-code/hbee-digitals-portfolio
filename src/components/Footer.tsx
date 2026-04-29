// src/components/Footer.tsx
'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  services: [
    { name: 'Web Development', href: '/services' },
    { name: 'E-Commerce Solutions', href: '/services' },
    { name: 'UI/UX Design', href: '/services' },
    { name: 'Digital Marketing', href: '/services' },
    { name: 'Brand Strategy', href: '/services' },
    { name: 'Technical Consulting', href: '/services' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Portfolio', href: '/projects' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
  contact: [
    { 
      name: 'hbeedigital@gmail.com', 
      href: 'mailto:hello.hbeedigitals@gmail.com',
      icon: '/svgs/email.svg'
    },
    { 
      name: '+234 (912) 191-3997', 
      href: 'tel:+2349121913997',
      icon: '/svgs/phone.svg'
    },
    { 
      name: 'Plot 241 Digital Street, Tech City', 
      href: '#',
      icon: '/svgs/location.svg'
    },
  ],
};

const socialLinks = [
  { 
    name: 'Facebook', 
    href: 'https://facebook.com', 
    icon: '/svgs/facebook.svg' 
  },
  { 
    name: 'Twitter', 
    href: 'https://twitter.com', 
    icon: '/svgs/twitter.svg' 
  },
  { 
    name: 'LinkedIn', 
    href: 'https://linkedin.com', 
    icon: '/svgs/linkedin.svg' 
  },
  { 
    name: 'Instagram', 
    href: 'https://instagram.com', 
    icon: '/svgs/instagram.svg' 
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-[#0A0F1C] to-[#112266] text-white overflow-hidden">
      {/* Large Transparent Zoomed Logo Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -left-40 -top-40 w-96 h-96 transform scale-150">
          <Image
            src="/svgs/logo.svg"
            alt="Hbee Digitals"
            fill
            className="object-contain filter brightness-0 invert"
          />
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 transform scale-125 opacity-30">
          <Image
            src="/svgs/logo.svg"
            alt="Hbee Digitals"
            fill
            className="object-contain filter brightness-0 invert"
          />
        </div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#007BFF] rounded-full filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00BFFF] rounded-full filter blur-3xl opacity-5 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Brand Section with Logo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Footer Logo */}
            <Link href="/" className="inline-block">
              <motion.div 
                className="flex items-center gap-3 group"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-8 h-8 relative">
                    <Image
                      src="/svgs/logo.svg"
                      alt="Hbee Digitals"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xl text-white tracking-wide">
                    HBEE
                  </span>
                  <span className="text-sm font-semibold text-[#00BFFF] tracking-wider">
                    DIGITALS
                  </span>
                </div>
              </motion.div>
            </Link>

            <p className="text-gray-300 max-w-md leading-relaxed text-lg">
              Transforming businesses through innovative digital solutions. 
              We create exceptional experiences that drive growth and success.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 hover:bg-white hover:border-white transition-all duration-300 backdrop-blur-sm group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  aria-label={`Follow us on ${social.name}`}
                >
                  <div className="w-5 h-5 relative">
                    <Image 
                      src={social.icon} 
                      alt={social.name}
                      fill
                      className="object-contain filter brightness-0 invert group-hover:brightness-0 group-hover:invert-0 transition-all duration-300"
                    />
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Grid - Now 3 columns */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Services Column */}
            <div>
              <h3 className="font-bold text-lg text-[#00BFFF] mb-4">Services</h3>
              <ul className="space-y-3">
                {footerLinks.services.map((link, index) => (
                  <motion.li 
                    key={link.name} 
                    initial={{ opacity: 0, x: 20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    transition={{ delay: index * 0.1 }} 
                    viewport={{ once: true }}
                  >
                    <Link 
                      href={link.href} 
                      className="text-gray-300 hover:text-white transition-colors duration-300 text-sm flex items-center group"
                    >
                      {link.name}
                      <svg 
                        className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-bold text-lg text-[#00BFFF] mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link, index) => (
                  <motion.li 
                    key={link.name} 
                    initial={{ opacity: 0, x: 20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    transition={{ delay: index * 0.1 + 0.2 }} 
                    viewport={{ once: true }}
                  >
                    <Link 
                      href={link.href} 
                      className="text-gray-300 hover:text-white transition-colors duration-300 text-sm flex items-center group"
                    >
                      {link.name}
                      <svg 
                        className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-bold text-lg text-[#00BFFF] mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link, index) => (
                  <motion.li 
                    key={link.name} 
                    initial={{ opacity: 0, x: 20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    transition={{ delay: index * 0.1 + 0.4 }} 
                    viewport={{ once: true }}
                  >
                    <Link 
                      href={link.href} 
                      className="text-gray-300 hover:text-white transition-colors duration-300 text-sm flex items-center group"
                    >
                      {link.name}
                      <svg 
                        className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Contact Section Below Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 pb-8 border-b border-white/10">
          {footerLinks.contact.map((link, index) => (
            <motion.div
              key={link.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Link 
                href={link.href} 
                className="flex items-center gap-4 text-gray-300 hover:text-white transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[#007BFF] to-[#00BFFF] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-5 h-5 relative">
                    <Image
                      src={link.icon}
                      alt=""
                      fill
                      className="object-contain filter brightness-0 invert"
                    />
                  </div>
                </div>
                <span className="text-sm font-medium break-words group-hover:text-white">
                  {link.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
        >
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Hbee Digitals. All rights reserved.
          </p>
          
          <div className="flex space-x-6 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors duration-300">
              Cookie Policy
            </Link>
          </div>
        </motion.div>

        {/* Back to Top Button */}
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 z-50"
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>
      </div>
    </footer>
  );
}