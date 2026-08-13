import { Link } from 'react-router-dom';
import { FacebookIcon, TwitterIcon, InstagramIcon } from './icons/SocialIcons';
import logo from '../assets/brand/logo.png';

const platformLinks = [
  { to: '/about', label: 'About' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/browse-tasks', label: 'Browse Tasks' },
  { to: '/for-professionals', label: 'For Professionals' },
];

const supportLinks = [
  { to: '/about#faq', label: 'FAQs' },
  { to: '/about#privacy', label: 'Privacy Policy' },
  { to: '/about#terms', label: 'Terms of Service' },
];

export default function Footer() {
  return (
    <footer
      className="mt-16 text-white"
      style={{
        background:
          'radial-gradient(circle at top, rgba(15,118,255,0.15), transparent 55%), #020617',
      }}
    >
      <div className="container mx-auto px-4 py-16 pb-10 text-center lg:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 justify-items-center gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center">
            <img
              src={logo}
              alt="Sirius Jobs logo"
              className="h-12 w-auto drop-shadow-2xl sm:h-14 md:h-16"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <p className="mt-4 mb-5 text-sm text-slate-400">
              One platform to post tasks, get bids from trusted Nigerian professionals, and pay
              securely, from quick errands to big trade jobs.
            </p>
            <div className="flex gap-3">
              <a
                href="https://web.facebook.com/profile.php?id=61582342397507"
                target="_blank"
                rel="noopener"
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-slate-400/35 text-white transition-all hover:-translate-y-0.5 hover:border-white"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/SiriusOddJobs"
                target="_blank"
                rel="noopener"
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-slate-400/35 text-white transition-all hover:-translate-y-0.5 hover:border-white"
              >
                <TwitterIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/siriusjobss"
                target="_blank"
                rel="noopener"
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-slate-400/35 text-white transition-all hover:-translate-y-0.5 hover:border-white"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3.5 text-sm font-semibold tracking-[0.25em] text-blue-100 uppercase">
              Platform
            </h4>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-300/75 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3.5 text-sm font-semibold tracking-[0.25em] text-blue-100 uppercase">
              Support
            </h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-300/75 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3.5 text-sm font-semibold tracking-[0.25em] text-blue-100 uppercase">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-slate-300/75">
              <li>WhatsApp: 0704 447 0559</li>
              <li>Email: info@siriusjobs.com.ng</li>
              <li>Port Harcourt, Rivers State</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-center gap-4 border-t border-slate-400/20 pt-6 text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} Sirius Jobs. All rights reserved.</p>
          <span className="hidden sm:inline">·</span>
          <span>Built for Nigerian businesses & talent.</span>
        </div>
      </div>
    </footer>
  );
}
