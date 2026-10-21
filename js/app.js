function app() {
  const pageMap = {
    'index.html': 'home',
    'about.html': 'about',
    'projects.html': 'projects',
    'expertise.html': 'expertise',
    'education.html': 'education',
    'blog.html': 'blog',
    'contact.html': 'contact'
  };

  return {
    dark: false,
    mm: false,
    sc: false,
    s: 'home',
    loading: false,
    error: '',
    currentPage: 'index.html',
    navigationId: 0,

    init() {
      // Identify the initial page.
      this.currentPage = this.getFilename(window.location.pathname);
      this.s = pageMap[this.currentPage] || 'home';

      // Restore the saved theme.
      let savedTheme = null;

      try {
        savedTheme = localStorage.getItem('theme');
      } catch (error) {
        // Continue if browser storage is unavailable.
      }

      this.dark =
        savedTheme === 'dark' ||
        (
          savedTheme !== 'light' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        );

      // Save theme changes.
      this.$watch('dark', value => {
        try {
          localStorage.setItem('theme', value ? 'dark' : 'light');
        } catch (error) {
          // Theme switching remains available without storage.
        }
      });

      // Update header styling when scrolling.
      const updateScroll = () => {
        this.sc = window.scrollY > 20;
      };

      window.addEventListener('scroll', updateScroll, {
        passive: true
      });

      updateScroll();

      // Update the copyright year.
      this.updateYear();

      // Close the mobile menu when Escape is pressed.
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          this.mm = false;
        }
      });

      // Support browser Back and Forward.
      window.addEventListener('popstate', () => {
        const filename = this.getFilename(window.location.pathname);

        this.loadPage(filename, {
          updateHistory: false
        });
      });

      // Enable reveal animations on initial content.
      this.observeReveals();
    },

    getFilename(pathname) {
      return (
        pathname.split('/').filter(Boolean).pop() || 'index.html'
      ).toLowerCase();
    },

    async navigate(filename) {
      const target = filename.toLowerCase();

      // Close the mobile menu immediately.
      this.mm = false;

      // Do nothing if the selected page is already displayed.
      if (target === this.currentPage && !this.loading) {
        return;
      }

      await this.loadPage(target, {
        updateHistory: true
      });
    },

    async loadPage(filename, options = {}) {
      const {
        updateHistory = false
      } = options;

      const target = filename.toLowerCase();
      const requestId = ++this.navigationId;

      this.loading = true;
      this.error = '';

      try {
        // Fetch the selected HTML file.
        const response = await fetch(target);

        if (!response.ok) {
          throw new Error(
            `Unable to load ${target}: HTTP ${response.status}`
          );
        }

        const html = await response.text();

        // Parse the document without replacing the persistent layout.
        const parsed = new DOMParser().parseFromString(
          html,
          'text/html'
        );

        const pageMain = parsed.querySelector('main');

        if (!pageMain) {
          throw new Error(
            `${target} does not contain a <main> element.`
          );
        }

        // Ignore outdated requests if another navigation was selected.
        if (requestId !== this.navigationId) {
          return;
        }

        // Replace only the main content.
        this.$refs.content.innerHTML = pageMain.innerHTML;

        // Update the selected page and active navigation.
        this.currentPage = target;
        this.s = pageMap[target] || 'home';

        // Update the browser tab title.
        const title = parsed.querySelector('title');

        if (title && title.textContent.trim()) {
          document.title = title.textContent.trim();
        }

        // Update the URL without a full-page reload.
        if (updateHistory) {
          const destination = new URL(
            target,
            window.location.href
          );

          history.pushState(
            { page: target },
            '',
            destination.pathname + destination.search + destination.hash
          );
        }

        // Show the new page from the top.
        window.scrollTo({
          top: 0,
          behavior: 'auto'
        });

        this.sc = false;

        // Reinitialize features for the newly inserted content.
        this.updateYear();
        this.observeReveals();

      } catch (error) {
        if (requestId === this.navigationId) {
          console.error('Portfolio navigation error:', error);

          this.error =
            `Could not load "${target}". Check the filename and ensure the page contains a <main> element.`;
        }

      } finally {
        if (requestId === this.navigationId) {
          this.loading = false;
        }
      }
    },

    updateYear() {
      const yearElement = document.getElementById('yr');

      if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
      }
    },

    observeReveals() {
      const elements = this.$refs.content.querySelectorAll(
        '.reveal:not(.in)'
      );

      // Fallback for browsers without IntersectionObserver.
      if (!('IntersectionObserver' in window)) {
        elements.forEach(element => {
          element.classList.add('in');
        });

        return;
      }

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      elements.forEach(element => {
        observer.observe(element);
      });
    }
  };
}