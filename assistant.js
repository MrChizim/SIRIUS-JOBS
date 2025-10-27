/**
 * Sirius Jobs – Lightweight AI Assistant & FAQ injector
 * This script attaches a floating helper widget to every page that loads it.
 * The “AI” layer currently performs keyword + FAQ matching so visitors always
 * see an answer, and it can be swapped for a real LLM endpoint later.
 */

(() => {
  if (window.SiriusAssistant) {
    return;
  }

  const FAQS = [
    {
      question: 'How do I hire an artisan on Sirius Jobs?',
      answer:
        'Create an employer account, verify your company details, then open any artisan profile to record a hire. Accepted artisans receive instant notifications.',
      tags: ['hire', 'artisan', 'employer', 'jobs'],
    },
    {
      question: 'What does verification involve for workers and employers?',
      answer:
        'Both sides submit a NIN, driver’s licence or international passport. Once the ID is confirmed, their profile earns a verified badge and can apply or hire.',
      tags: ['verify', 'verification', 'badge', 'nin', 'passport'],
    },
    {
      question: 'How much do professionals earn from consultations?',
      answer:
        'Consultations cost ₦3,000. Sirius Jobs retains ₦500 to power support, while the doctor or lawyer receives ₦2,500. Balances appear in the professional dashboard.',
      tags: ['doctor', 'lawyer', 'consultation', 'earnings', '2,500'],
    },
    {
      question: 'Can I get alerts when new jobs are posted?',
      answer:
        'Yes. Subscribe to a service category from the alerts panel. Whenever an employer posts a matching job, you’ll receive an instant notification.',
      tags: ['alerts', 'subscription', 'jobs', 'notify'],
    },
    {
      question: 'How do payouts work?',
      answer:
        'Professionals can request payouts anytime from their dashboard. Funds move from pending to available after the client confirms completion, then can be transferred.',
      tags: ['payout', 'wallet', 'withdraw', 'payment'],
    },
    {
      question: 'What happens when I click apply on a job?',
      answer:
        'You submit a cover letter, expected rate, and supporting documents. The employer reviews your profile, and you’ll be notified when they accept or decline.',
      tags: ['apply', 'job', 'cv', 'application'],
    },
    {
      question: 'Do I need to pay to contact artisans?',
      answer:
        'Employers with an active plan can contact subscribed artisans without extra fees. For unsubscribed listings, you may be asked to pay to reveal contact details safely.',
      tags: ['contact', 'plan', 'subscription', 'payment'],
    },
    {
      question: 'Can Sirius Jobs match me with a personal assistant for a day?',
      answer:
        'Absolutely. Submit a concierge request from the Find Workers page. Interested day PAs also receive alerts whenever short gigs appear.',
      tags: ['pa', 'personal assistant', 'concierge', 'day hire'],
    },
  ];

  const QUICK_REPLIES = [
    { label: 'How hiring works', tags: ['hire'] },
    { label: 'Verification steps', tags: ['verification'] },
    { label: 'Doctor/Lawyer earnings', tags: ['consultation'] },
    { label: 'Job alerts', tags: ['alerts'] },
    { label: 'Payouts', tags: ['payout'] },
  ];

  const style = document.createElement('style');
  style.textContent = `
    .sirius-assistant-toggle {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9998;
      background: #0056b3;
      color: #fff;
      border: none;
      border-radius: 9999px;
      width: 3.5rem;
      height: 3.5rem;
      box-shadow: 0 12px 30px rgba(0,86,179,0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .sirius-assistant-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 40px rgba(0,86,179,0.35);
    }
    .sirius-assistant-panel {
      position: fixed;
      bottom: calc(1.5rem + 4.25rem);
      right: 1.5rem;
      width: min(320px, calc(100vw - 2rem));
      max-height: min(70vh, 520px);
      background: #fff;
      border-radius: 1.25rem;
      box-shadow: 0 20px 45px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      border: 1px solid rgba(0,86,179,0.12);
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: translateY(16px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s ease, opacity 0.2s ease;
    }
    .sirius-assistant-panel.open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .sirius-assistant-header {
      padding: 1rem 1.2rem 0.6rem;
      background: #f4f7fb;
    }
    .sirius-assistant-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #0f172a;
    }
    .sirius-assistant-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      scroll-behavior: smooth;
    }
    .sirius-assistant-message {
      font-size: 0.85rem;
      line-height: 1.4;
      border-radius: 0.9rem;
      padding: 0.65rem 0.85rem;
      max-width: 85%;
    }
    .sirius-assistant-message.bot {
      background: #eff4ff;
      color: #1d4ed8;
      align-self: flex-start;
    }
    .sirius-assistant-message.user {
      background: #0056b3;
      color: #fff;
      align-self: flex-end;
    }
    .sirius-assistant-footer {
      border-top: 1px solid rgba(148,163,184,0.25);
      padding: 0.65rem 0.8rem;
      background: #fff;
    }
    .sirius-assistant-input {
      width: 100%;
      border: 1px solid rgba(148,163,184,0.35);
      border-radius: 0.75rem;
      padding: 0.55rem 0.9rem;
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .sirius-assistant-input:focus {
      border-color: #0056b3;
      box-shadow: 0 0 0 3px rgba(0,86,179,0.18);
    }
    .sirius-assistant-quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0.6rem 1.2rem 0.2rem;
    }
    .sirius-assistant-quick-actions button {
      border: none;
      background: rgba(0,86,179,0.12);
      color: #0f172a;
      border-radius: 9999px;
      padding: 0.35rem 0.8rem;
      font-size: 0.72rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .sirius-assistant-quick-actions button:hover {
      background: rgba(0,86,179,0.2);
    }
    .sirius-faq-section {
      background: #f8fafc;
      margin: 4rem auto 2rem;
      padding: clamp(1.5rem, 4vw, 3rem);
      border-radius: 1.5rem;
      max-width: min(960px, 94vw);
      box-shadow: 0 10px 35px rgba(15,23,42,0.05);
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .sirius-faq-section h2 {
      margin: 0 0 1rem;
      font-size: clamp(1.5rem, 4vw, 2.25rem);
      font-weight: 700;
      color: #0f172a;
    }
    .sirius-faq-grid {
      display: grid;
      gap: 0.9rem;
    }
    @media (min-width: 720px) {
      .sirius-faq-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .sirius-faq-item {
      background: #fff;
      border-radius: 1rem;
      padding: 1.1rem 1.25rem;
      border: 1px solid rgba(148,163,184,0.18);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .sirius-faq-item h3 {
      margin: 0 0 0.4rem;
      font-size: 1rem;
      color: #1f2937;
      font-weight: 600;
    }
    .sirius-faq-item p {
      margin: 0;
      font-size: 0.9rem;
      color: #475569;
      line-height: 1.5;
    }
    .sirius-faq-item:hover {
      border-color: rgba(0,86,179,0.4);
      box-shadow: 0 16px 40px rgba(0,0,0,0.06);
    }
  `;
  document.head.appendChild(style);

  function findFaqResponse(message) {
    const input = message.toLowerCase();
    let match = FAQS.find(faq =>
      [faq.question, ...(faq.tags || [])].some(token =>
        token.toLowerCase().split(' ').some(word => input.includes(word)),
      ),
    );

    if (!match) {
      match = FAQS.find(faq =>
        faq.tags && faq.tags.some(tag => input.includes(tag.toLowerCase())),
      );
    }

    if (!match) {
      return {
        text:
          "I couldn't find an exact match, but a specialist can help. Drop us a note via support@siriusjobsng.com or choose “How hiring works”, “Verification steps”, “Payouts” below.",
      };
    }

    return {
      text: `${match.answer}`,
      reference: match.question,
    };
  }

  function createMessageElement(text, type = 'bot', reference) {
    const div = document.createElement('div');
    div.className = `sirius-assistant-message ${type}`;
    div.textContent = text;
    if (reference) {
      const ref = document.createElement('div');
      ref.style.fontSize = '0.72rem';
      ref.style.marginTop = '0.35rem';
      ref.style.opacity = '0.65';
      ref.textContent = `FAQ reference: ${reference}`;
      div.appendChild(ref);
    }
    return div;
  }

  function initAssistant() {
    const toggle = document.createElement('button');
    toggle.className = 'sirius-assistant-toggle';
    toggle.setAttribute('aria-label', 'Open Sirius Jobs assistant');
    toggle.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19c3.866 0 7-2.91 7-6.5S15.866 6 12 6 5 8.91 5 12.5c0 1.72.746 3.284 2 4.5v3l3.102-1.657A8.536 8.536 0 0 0 12 19Z"/><path d="m8 9 8 6"/><path d="m16 9-8 6"/></svg>';

    const panel = document.createElement('section');
    panel.className = 'sirius-assistant-panel';
    panel.innerHTML = `
      <header class="sirius-assistant-header">
        <h4>Sirius Assistant</h4>
        <p style="margin:0;font-size:0.76rem;color:#334155;">
          Ask about hiring, verification, payouts, or anything else.
        </p>
      </header>
      <div class="sirius-assistant-quick-actions"></div>
      <div class="sirius-assistant-body" role="log"></div>
      <footer class="sirius-assistant-footer">
        <form id="sirius-assistant-form" style="display:flex;gap:0.5rem;align-items:center;">
          <input type="text" class="sirius-assistant-input" id="sirius-assistant-input" placeholder="Ask the assistant…" autocomplete="off" />
          <button type="submit" style="background:#0056b3;color:#fff;border:none;border-radius:0.75rem;padding:0.55rem 0.9rem;font-size:0.8rem;cursor:pointer;">Send</button>
        </form>
      </footer>
    `;

    const quickActions = panel.querySelector('.sirius-assistant-quick-actions');
    QUICK_REPLIES.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        const tags = action.tags || [];
        const artificialQuery = tags.length ? tags[0] : action.label;
        appendMessage(artificialQuery, 'user');
        respondToQuery(artificialQuery);
      });
      quickActions.appendChild(btn);
    });

    const body = panel.querySelector('.sirius-assistant-body');
    const input = panel.querySelector('#sirius-assistant-input');
    const form = panel.querySelector('#sirius-assistant-form');

    function appendMessage(text, type = 'bot', reference) {
      body.appendChild(createMessageElement(text, type, reference));
      body.scrollTop = body.scrollHeight;
    }

    function respondToQuery(message) {
      const { text, reference } = findFaqResponse(message);
      appendMessage(text, 'bot', reference);
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      appendMessage(value, 'user');
      respondToQuery(value);
      input.value = '';
      input.focus();
    });

    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      if (open && body.childElementCount === 0) {
        appendMessage(
          'Hi! I am the Sirius Jobs assistant. I can explain how hiring, verification, subscriptions, payouts, and consultations work. Try asking “How do payouts work?”',
        );
      }
      if (open) {
        input.focus();
      }
    });

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    window.SiriusAssistant = {
      open: () => {
        panel.classList.add('open');
        input.focus();
      },
      close: () => panel.classList.remove('open'),
      ask: query => {
        appendMessage(query, 'user');
        respondToQuery(query);
      },
      faqs: FAQS,
    };
  }

  const faqEligiblePages = new Set(['faq.html']);

  function injectFAQSection() {
    const pathname = window.location.pathname.split('/').pop() ?? '';
    const normalized = pathname === '' ? 'index.html' : pathname;
    if (!faqEligiblePages.has(normalized)) {
      return;
    }

    if (document.getElementById('sirius-faq-section')) {
      return;
    }

    const section = document.createElement('section');
    section.id = 'sirius-faq-section';
    section.className = 'sirius-faq-section';
    section.innerHTML = `
      <h2>Frequently Asked Questions</h2>
      <p style="margin:0 0 1.5rem;font-size:0.95rem;color:#475569;">
        Answers to the most common questions employers, artisans, doctors, and lawyers ask on Sirius Jobs.
      </p>
      <div class="sirius-faq-grid">
        ${FAQS.map(
          faq => `
            <article class="sirius-faq-item">
              <h3>${faq.question}</h3>
              <p>${faq.answer}</p>
            </article>
          `,
        ).join('')}
      </div>
      <p style="margin:1.5rem 0 0;font-size:0.8rem;color:#64748b;">
        Need more help? Ask the assistant in the corner or email <a href="mailto:support@siriusjobsng.com" style="color:#0056b3;text-decoration:none;">support@siriusjobsng.com</a>.
      </p>
    `;

    const footer = document.querySelector('footer');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }
  }

  function init() {
    initAssistant();
    injectFAQSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
