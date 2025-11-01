(function($) {

	// Update countdown every second
	let countdownInterval = setInterval(updateCountdown, 1000);
	"use strict"

	// Scrollspy
	$('body').scrollspy({
		target: '#nav',
		offset: $(window).height() / 2
	});

	// Mobile nav toggle
	$('.navbar-toggle').on('click',function() {
		$('.main-nav').toggleClass('open');
		$('#header').toggleClass('main-nav-open');
	});

	// Dropdown toggle
	$('.dropdown-toggle').on('click', function(e) {
		e.preventDefault();
		e.stopPropagation();

		const $dropdown = $(this).parent();
		const $menu = $dropdown.find('.dropdown-menu');

		// Close other dropdowns
		$('.dropdown').not($dropdown).removeClass('open');
		
		// Toggle current dropdown
		$dropdown.toggleClass('open');
		
		console.log('Dropdown clicked, open class:', $dropdown.hasClass('open'));
		console.log('Menu element:', $menu);
		console.log('Menu display:', $menu.css('display'));
	});

	// Dropdown hover functionality
	$('.dropdown').on('mouseenter', function() {
		$(this).addClass('open');
	});

	$('.dropdown').on('mouseleave', function() {
		$(this).removeClass('open');
	});

	// Close dropdown when clicking outside
	$(document).on('click', function(e) {
		if (!$(e.target).closest('.dropdown').length) {
			$('.dropdown').removeClass('open');
		}
	});


	// Fixed nav
	$(window).on('scroll', function() {
		const wScroll = $(this).scrollTop();
		wScroll > 50 ? $('#header').addClass('fixed-navbar') : $('#header').removeClass('fixed-navbar');
	});

	// Smooth scroll
	$(".main-nav a[href^='#']").on('click', function(e) {
		e.preventDefault();
		$('html, body').animate({
			scrollTop: $(this.hash).offset().top
		}, 800);
	});

	// Section title animation
	$('.section-title').each(function() {
		const $this = $(this);
		$this.find('.title > span').each(function(i) {
			const $span = $(this);
			const animated = new Waypoint({
				element: $this,
				handler: function () {
					setTimeout(function () {
						$span.addClass('appear')
					}, i * 250);
					this.destroy();
				},
				offset: '95%'
			});
		});
	});

	// Galery Owl
	$('#galery-owl').owlCarousel({
		items:1,
		loop:true,
		margin:0,
		dots : false,
		nav: true,
		navText : ['<i class="fa fa-angle-left"></i>','<i class="fa fa-angle-right"></i>'],
		autoplay : true,
		autoplaySpeed :500,
		navSpeed :500,
		responsive : {
	    0 : {
	       stagePadding : 0,
	    },
	    768 : {
	        stagePadding : 120,
	    }
		}
	});

	// Parallax Background
	$.stellar({
		responsive: true
	});

	// CountTo
	$('.counter').each(function() {
		const $this = $(this);
		const counter = new Waypoint({
			element: $this,
			handler: function () {
				$this.countTo();
			},
			offset: '95%'
		});
	});

	// Countdown Timer
	// Event configuration - Update ONLY this date to change everything
	const EVENT_DATE = new Date('2025-12-03T08:30:00-05:00'); // December 3, 2025 at 8:30 AM (Peru Time - GMT-5)

	// Format and display event date
	function displayEventDate() {
		const formattedDate = new Intl.DateTimeFormat('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(EVENT_DATE);

		$('#event-date-display').text(formattedDate);
	}

	function updateCountdown() {
		const distance = EVENT_DATE.getTime() - new Date().getTime();

		// Time calculations
		const days = Math.floor(distance / (1000 * 60 * 60 * 24));
		const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((distance % (1000 * 60)) / 1000);

		// Display the result
		$('#days').text(days);
		$('#hours').text(hours);
		$('#minutes').text(minutes);
		$('#seconds').text(seconds);

		// If countdown is over
		if (distance < 0) {
			clearInterval(countdownInterval);
			$('#countdown').html('<div class="countdown-item"><span class="countdown-number">¡Evento en curso!</span></div>');
		}
	}

	// Initialize event date display
	displayEventDate();
	// Initial call
	updateCountdown();

})(jQuery);
