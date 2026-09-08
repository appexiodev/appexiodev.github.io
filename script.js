/* =========================================================
   APP EXIO DEV
   MAIN JAVASCRIPT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const html = document.documentElement;
    const body = document.body;

    const pageLoader = document.getElementById("pageLoader");
    const themeToggle = document.getElementById("themeToggle");
    const menuToggle = document.getElementById("menuToggle");
    const mobileNav = document.getElementById("mobileNav");
    const header = document.getElementById("header");
    const backTop = document.getElementById("backTop");
    const currentYear = document.getElementById("currentYear");


    /* =====================================================
       PAGE LOADER
    ===================================================== */

    // Always remove the loader after the page is ready.
    window.addEventListener("load", () => {

        setTimeout(() => {

            if (pageLoader) {
                pageLoader.classList.add("hidden");
            }

        }, 350);

    });


    // Safety fallback in case the load event behaves unexpectedly.
    setTimeout(() => {

        if (pageLoader) {
            pageLoader.classList.add("hidden");
        }

    }, 2500);


    /* =====================================================
       THEME
    ===================================================== */

    const savedTheme = localStorage.getItem("appexio-dev-theme");

    if (savedTheme === "light") {
        html.classList.add("light-theme");
    } else if (savedTheme === "dark") {
        html.classList.remove("light-theme");
    } else {

        // Follow the visitor's system preference.
        const prefersLight = window.matchMedia(
            "(prefers-color-scheme: light)"
        ).matches;

        if (prefersLight) {
            html.classList.add("light-theme");
        }

    }


    function updateThemeIcon() {

        if (!themeToggle) return;

        const icon = themeToggle.querySelector("i");

        if (!icon) return;

        if (html.classList.contains("light-theme")) {

            icon.className = "fa-solid fa-sun";

            themeToggle.setAttribute(
                "aria-label",
                "Switch to dark theme"
            );

            themeToggle.setAttribute(
                "title",
                "Switch to dark theme"
            );

        } else {

            icon.className = "fa-solid fa-moon";

            themeToggle.setAttribute(
                "aria-label",
                "Switch to light theme"
            );

            themeToggle.setAttribute(
                "title",
                "Switch to light theme"
            );

        }

    }


    updateThemeIcon();


    if (themeToggle) {

        themeToggle.addEventListener("click", () => {

            html.classList.toggle("light-theme");

            const isLight =
                html.classList.contains("light-theme");

            localStorage.setItem(
                "appexio-dev-theme",
                isLight ? "light" : "dark"
            );

            updateThemeIcon();

        });

    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function closeMobileMenu() {

        if (!mobileNav || !menuToggle) return;

        mobileNav.classList.remove("open");

        menuToggle.classList.remove("open");

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    if (menuToggle && mobileNav) {

        menuToggle.addEventListener("click", () => {

            const isOpen =
                mobileNav.classList.toggle("open");

            menuToggle.classList.toggle(
                "open",
                isOpen
            );

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        });

    }


    // Close mobile menu when a link is clicked.

    if (mobileNav) {

        mobileNav.querySelectorAll("a").forEach(link => {

            link.addEventListener(
                "click",
                closeMobileMenu
            );

        });

    }


    // Close menu when clicking outside it.

    document.addEventListener("click", event => {

        if (!mobileNav || !menuToggle) return;

        const clickedInsideMenu =
            mobileNav.contains(event.target);

        const clickedButton =
            menuToggle.contains(event.target);

        if (
            !clickedInsideMenu &&
            !clickedButton
        ) {
            closeMobileMenu();
        }

    });


    // Close mobile navigation when resizing to desktop.

    window.addEventListener("resize", () => {

        if (window.innerWidth > 800) {
            closeMobileMenu();
        }

    });


    /* =====================================================
       HEADER SCROLL EFFECT
    ===================================================== */

    function updateHeader() {

        if (!header) return;

        if (window.scrollY > 30) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }

    }


    updateHeader();

    window.addEventListener(
        "scroll",
        updateHeader,
        { passive: true }
    );


    /* =====================================================
       BACK TO TOP
    ===================================================== */

    function updateBackTop() {

        if (!backTop) return;

        if (window.scrollY > 600) {
            backTop.classList.add("show");
        } else {
            backTop.classList.remove("show");
        }

    }


    updateBackTop();

    window.addEventListener(
        "scroll",
        updateBackTop,
        { passive: true }
    );


    if (backTop) {

        backTop.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    }


    /* =====================================================
       SMOOTH ANCHOR NAVIGATION
    ===================================================== */

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", event => {

            const targetId =
                link.getAttribute("href");

            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }


            const target =
                document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            const headerHeight =
                header ? header.offsetHeight : 0;

            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                headerHeight -
                10;


            window.scrollTo({
                top: targetPosition,
                behavior: "smooth"
            });

        });

    });


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements =
        document.querySelectorAll(".reveal");


    if ("IntersectionObserver" in window) {

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {

                    entries.forEach(entry => {

                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add(
                            "visible"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    });

                },
                {
                    threshold: 0.12,
                    rootMargin: "0px 0px -45px 0px"
                }
            );


        revealElements.forEach(element => {

            revealObserver.observe(element);

        });

    } else {

        // Fallback for older browsers.

        revealElements.forEach(element => {

            element.classList.add("visible");

        });

    }


    /* =====================================================
       ACTIVE NAVIGATION
    ===================================================== */

    const sections =
        document.querySelectorAll("main section[id]");

    const navLinks =
        document.querySelectorAll(
            ".desktop-nav .nav-link"
        );


    function updateActiveNav() {

        if (!sections.length || !navLinks.length) {
            return;
        }

        let currentSection = "home";

        const scrollPosition =
            window.scrollY +
            (header ? header.offsetHeight : 0) +
            120;


        sections.forEach(section => {

            if (
                scrollPosition >=
                section.offsetTop
            ) {

                currentSection =
                    section.getAttribute("id");

            }

        });


        navLinks.forEach(link => {

            const href =
                link.getAttribute("href");

            link.classList.toggle(
                "active",
                href === `#${currentSection}`
            );

        });

    }


    updateActiveNav();

    window.addEventListener(
        "scroll",
        updateActiveNav,
        { passive: true }
    );


    /* =====================================================
       CURRENT YEAR
    ===================================================== */

    if (currentYear) {

        currentYear.textContent =
            new Date().getFullYear();

    }


    /* =====================================================
       PRODUCT CARD MICRO INTERACTION
    ===================================================== */

    const productCards =
        document.querySelectorAll(".product-card");


    productCards.forEach(card => {

        card.addEventListener(
            "mouseenter",
            () => {

                card.style.setProperty(
                    "--card-hover",
                    "1"
                );

            }
        );


        card.addEventListener(
            "mouseleave",
            () => {

                card.style.setProperty(
                    "--card-hover",
                    "0"
                );

            }
        );

    });


    /* =====================================================
       KEYBOARD ESCAPE
    ===================================================== */

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeMobileMenu();
        }

    });

});