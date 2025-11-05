import { Link } from 'react-router-dom'
import { useState } from 'react'

const Footer = () => {
  const [hoveredIcon, setHoveredIcon] = useState(null)

  return (
    <footer className="relative overflow-hidden bg-black text-white">
      {/* Modern background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-full filter blur-3xl animate-float-gentle"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Top section with company info and quick links */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Company Brand Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-red-500">
                  GULTRADERS
                </h2>
                <p className="text-slate-300 text-sm font-medium tracking-wide uppercase">
                  Body Kits & Car Accessories
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Premium automotive accessories and body kits for car enthusiasts. 
                  Quality products with exceptional service.
                </p>
              </div>
              
              {/* Social Media Links */}
              <div className="flex space-x-4">
                {[
                  { name: 'Facebook', icon: 'facebook', color: 'hover:text-blue-400', href: '#' },
                  { name: 'Instagram', icon: 'instagram', color: 'hover:text-pink-400', href: '#' },
                  { name: 'WhatsApp', icon: 'whatsapp', color: 'hover:text-green-400', href: '#' }
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className={`w-10 h-10 rounded-full bg-slate-700/50 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${social.color} hover:bg-slate-600/50 hover:scale-110`}
                    onMouseEnter={() => setHoveredIcon(social.name)}
                    onMouseLeave={() => setHoveredIcon(null)}
                  >
                    {social.icon === 'facebook' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                    {social.icon === 'instagram' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.244c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.781h-1.297v1.297h1.297V7.207zm-3.323 1.297c.49 0 .928.19 1.297.49.368.3.49.74.49 1.297v5.19c0 .557-.122.997-.49 1.297-.369.3-.807.49-1.297.49s-.928-.19-1.297-.49c-.368-.3-.49-.74-.49-1.297v-5.19c0-.557.122-.997.49-1.297.369-.3.807-.49 1.297-.49z"/>
                      </svg>
                    )}
                    {social.icon === 'whatsapp' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Quick Links</h3>
              <ul className="space-y-3">
                {['Home', 'Products', 'About Us', 'Contact', 'My Orders'].map((link) => (
                  <li key={link}>
                    <Link 
                      to={link === 'Home' ? '/' : `/${link.toLowerCase().replace(' ', '-')}`}
                      className="text-slate-300 hover:text-white transition-colors duration-200 text-sm"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Contact Info</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 mt-0.5 text-blue-400">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm">091-2640044</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 mt-0.5 text-green-400">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300 text-sm">+92 3114000096</p>
                    <p className="text-slate-300 text-sm">+92 3129991116</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address & Map */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Location</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 mt-0.5 text-red-400">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Grand Dil jan Plaza, Block A,<br />
                      Shop #7,8,9, Opposite Fahad CNG Pump,<br />
                      Near Toyota Khyber, Ring Road<br />
                      Peshawar, KPK, Pakistan
                    </p>
                  </div>
                </div>
                
                {/* Interactive Map */}
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-700/50">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3309.003481832633!2d71.53472219999999!3d33.96675!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMzPCsDU4JzAwLjMiTiA3McKwMzInMDUuMCJF!5e0!3m2!1sen!2s!4v1750542938354!5m2!1sen!2s" 
                    className="w-full h-48 rounded-lg" 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-slate-700/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-slate-400 text-sm">
                © {new Date().getFullYear()} <span className="text-red-500 font-semibold">GULTRADERS</span>. All rights reserved.
              </p>
              <div className="flex space-x-6 text-sm">
                <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Terms of Service</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-float-gentle {
          animation: float-gentle 6s ease-in-out infinite;
        }
      `}</style>
    </footer>
  )
}

export default Footer