// ── Scroll to top on page reload ──
if ('scrollRestoration' in history) {
	history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

const siteHeader = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');

if (siteHeader && navToggle && navList) {

	// ── Mobile menu ──
	navToggle.addEventListener('click', () => {
		const isOpen = siteHeader.classList.toggle('menu-open');
		navToggle.setAttribute('aria-expanded', String(isOpen));
	});

	navList.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.closest('a') && window.innerWidth <= 1080) {
			siteHeader.classList.remove('menu-open');
			navToggle.setAttribute('aria-expanded', 'false');
		}
	});

	window.addEventListener('resize', () => {
		if (window.innerWidth > 1080) {
			siteHeader.classList.remove('menu-open');
			navToggle.setAttribute('aria-expanded', 'false');
		}
	});

	// ── Hover pill ──
	const pill = document.createElement('div');
	pill.className = 'nav-pill';
	navList.appendChild(pill);

	const movePill = (link) => {
		const listRect = navList.getBoundingClientRect();
		const linkRect = link.getBoundingClientRect();
		const padding = 12;
		pill.style.left = (linkRect.left - listRect.left - padding) + 'px';
		pill.style.width = (linkRect.width + padding * 2) + 'px';
		pill.style.opacity = '1';
	};

	navList.querySelectorAll('a').forEach((link) => {
		link.addEventListener('focus', () => movePill(link));
	});

	// ── Active state & Scroll spy ──
	const navLinks = navList.querySelectorAll('a');
	const hasSectionNav = Array.from(navLinks).some((link) => {
		const href = link.getAttribute('href') || '';
		return href.startsWith('#');
	});

	const setActive = (id) => {
		let hasMatch = false;
		navLinks.forEach(link => {
			if (link.getAttribute('href') === `#${id}`) {
				hasMatch = true;
			}
		});

		if (!hasMatch) {
			return;
		}

		navLinks.forEach(link => {
			link.classList.remove('menu-active');
			if (link.getAttribute('href') === `#${id}`) {
				link.classList.add('menu-active');
				movePill(link);
			}
		});
	};

	if (hasSectionNav) {
		// Activo en carga
		setActive('inicio');
	}

	// Activo al hacer click
	if (hasSectionNav) {
		navLinks.forEach(link => {
			link.addEventListener('click', () => {
				const href = link.getAttribute('href');
				if (href && href.startsWith('#')) {
					setActive(href.slice(1));
				}
			});
		});
	}

	// Scroll spy via IntersectionObserver
	const sections = document.querySelectorAll('section[id]');
	if (hasSectionNav && sections.length > 0) {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					setActive(entry.target.id);
				}
			});
		}, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

		sections.forEach(section => observer.observe(section));
	}

	// ── Analytics + Conversion flow ──
	const loadPublicConfig = async () => {
		try {
			const response = await fetch('/api/public-config', { headers: { Accept: 'application/json' } });
			const data = await response.json().catch(() => ({}));
			if (!response.ok || !data.success || !data.config) {
				return {};
			}
			return data.config;
		} catch {
			return {};
		}
	};

	const initAnalytics = async () => {
		const publicConfig = await loadPublicConfig();
		const measurementId = String(publicConfig.analyticsMeasurementId || '').trim();
		if (!measurementId || document.getElementById('wf-analytics-script')) {
			return;
		}

		window.dataLayer = window.dataLayer || [];
		window.gtag = window.gtag || function () {
			window.dataLayer.push(arguments);
		};
		window.gtag('js', new Date());
		window.gtag('config', measurementId);

		const script = document.createElement('script');
		script.id = 'wf-analytics-script';
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
		document.head.appendChild(script);
	};

	initAnalytics();

	const trackEvent = (eventName, params = {}) => {
		if (typeof window.gtag === 'function') {
			window.gtag('event', eventName, params);
		}
	};

	const ctaLinks = document.querySelectorAll('[data-cta]');
	ctaLinks.forEach((element) => {
		element.addEventListener('click', () => {
			const ctaName = element.getAttribute('data-cta') || 'unknown';
			trackEvent('cta_click', {
				cta_name: ctaName,
				page_location: window.location.href
			});
		});
	});

	const whatsappLinks = document.querySelectorAll('a[href*="api.whatsapp.com"]');
	whatsappLinks.forEach((link) => {
		link.addEventListener('click', () => {
			trackEvent('whatsapp_click', {
				link_text: (link.textContent || '').trim()
			});
		});
	});

	const contactSection = document.querySelector('#contacto');
	if (contactSection) {
		let contactViewed = false;
		const contactObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && !contactViewed) {
					contactViewed = true;
					trackEvent('contact_section_view', {
						section_id: 'contacto'
					});
				}
			});
		}, { threshold: 0.45 });

		contactObserver.observe(contactSection);
	}

	const serviceCtas = document.querySelectorAll('.service-card-btn[data-service]');
	const serviceSelect = document.querySelector('.contact-form select[name="servicio"]');
	serviceCtas.forEach((button) => {
		button.addEventListener('click', () => {
			if (!serviceSelect) return;
			const serviceValue = button.getAttribute('data-service');
			if (serviceValue) {
				serviceSelect.value = serviceValue;
			}
		});
	});

	const leadForm = document.querySelector('#lead-form');
	const formStatus = document.querySelector('#form-status');
	if (leadForm instanceof HTMLFormElement) {
		leadForm.addEventListener('submit', async (event) => {
			event.preventDefault();

			const submitButton = leadForm.querySelector('button[type="submit"]');
			if (submitButton instanceof HTMLButtonElement) {
				submitButton.disabled = true;
				submitButton.textContent = 'Enviando...';
			}

			if (formStatus) {
				formStatus.className = 'form-status';
				formStatus.textContent = '';
			}

			const formData = new FormData(leadForm);
			let succeeded = false;

			try {
				const response = await fetch(leadForm.action, {
					method: 'POST',
					body: formData,
					headers: {
						Accept: 'application/json'
					}
				});

				const result = await response.json();

				if (!response.ok || result.success !== 'true') {
					throw new Error(result.message || 'No se pudo enviar el formulario');
				}

				succeeded = true;

				trackEvent('generate_lead', {
					form_name: 'contacto_webforge',
					service: String(formData.get('servicio') || '')
				});

				const formToast = document.querySelector('#form-toast');
				if (formToast) {
					formToast.removeAttribute('hidden');
					requestAnimationFrame(() => requestAnimationFrame(() => formToast.classList.add('is-visible')));
				}

				window.setTimeout(() => {
					window.location.href = 'gracias.html';
				}, 1800);
			} catch {
				if (formStatus) {
					formStatus.className = 'form-status is-error';
					formStatus.textContent = 'No pudimos enviar la solicitud. Intenta nuevamente en unos segundos.';
				}

				trackEvent('form_submit_error', {
					form_name: 'contacto_webforge'
				});
			} finally {
				if (!succeeded && submitButton instanceof HTMLButtonElement) {
					submitButton.disabled = false;
					submitButton.textContent = 'Enviar solicitud';
				}
			}
		});
	}

	// ── Section reveal animations ──
	const revealConfig = [
		{ sel: '.plans-hero-shell',                          delay: 0   },
		{ sel: '.plan-card',                                 stagger: 90 },
		{ sel: '.plans-compare',                             delay: 120 },
		{ sel: '.plans-build',                               delay: 140 },
		{ sel: '.plans-faq',                                 delay: 160 },
		{ sel: '.services-kicker',                           delay: 0   },
		{ sel: '.services-head h2',                          delay: 80  },
		{ sel: '.services-head p:not(.services-kicker)',     delay: 160 },
		{ sel: '.service-card-pro',                          stagger: 80 },
		{ sel: '.featured-kicker',                           delay: 0   },
		{ sel: '.featured-head h2',                          delay: 80  },
		{ sel: '.featured-head p:not(.featured-kicker)',     delay: 160 },
		{ sel: '.featured-card',                             stagger: 100 },
		{ sel: '.contact-kicker',                            delay: 0   },
		{ sel: '.contact-head h2',                          delay: 80  },
		{ sel: '.contact-head p:not(.contact-kicker)',       delay: 160 },
		{ sel: '.contact-card',                              stagger: 120 },
	];

	const revealObserver = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add('is-revealed');
				revealObserver.unobserve(entry.target);
			}
		});
	}, { rootMargin: '200px 0px 200px 0px', threshold: 0 });

	revealConfig.forEach(({ sel, delay = 0, stagger = 0 }) => {
		document.querySelectorAll(sel).forEach((el, i) => {
			el.classList.add('reveal-item');
			el.style.transitionDelay = (delay + i * stagger) + 'ms';
			revealObserver.observe(el);
		});
	});

	// Fallback de producción: revela secciones de planes al entrar en viewport si el observer falla.
	const revealPlanSectionOnView = (selector) => {
		const section = document.querySelector(selector);
		if (!section) return;

		const revealOnView = () => {
			if (section.classList.contains('is-revealed')) return;

			const rect = section.getBoundingClientRect();
			const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
			const isVisible = rect.top <= viewportHeight * 0.92 && rect.bottom >= 0;

			if (isVisible) {
				section.classList.add('is-revealed');
				window.removeEventListener('scroll', revealOnView, { passive: true });
				window.removeEventListener('resize', revealOnView);
			}
		};

		window.addEventListener('scroll', revealOnView, { passive: true });
		window.addEventListener('resize', revealOnView);
		revealOnView();
	};

	revealPlanSectionOnView('.plans-build.reveal-item');
	revealPlanSectionOnView('.plans-faq.reveal-item');
}

