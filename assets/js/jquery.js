/* __________________ SUPPORTS TOUCH OR NOT  __________________*/
/*!	Detects touch support and adds appropriate classes to html and returns a JS object  |  Copyright (c) 2013 Izilla Partners Pty Ltd  | http://www.izilla.com.au / Licensed under the MIT license  |  https://coderwall.com/p/egbgdw */
var supports=(function(){var d=document.documentElement,c="ontouchstart" in window||navigator.msMaxTouchPoints;if(c){d.className+=" touch";return{touch:true}}else{d.className+=" no-touch";return{touch:false}}})();


		
			$(document).ready(function () {

		    /* ----------   toggle-menu   -------- */
		    $('.toggle-menu').click(function() {
		        $('html').toggleClass('menu-toggled');
		    });


		    var $window = $(window),
		        $html = $('html');

		    $(window).on('resize load', function() {
		        if ($window.width() > 979) {
		            $html.removeClass('menu-toggled'); /* remove menu-toggled on larger viewports */
		        }
		    });


		    /* ----------   toggle-search   -------- */
		    $('.toggle-search, .vpanel.search .close').click(function() {
		        $( ".vpanel.search" ).slideToggle();
		      //  $('.search .form-control').focus(); // don't use because on touch the keyboard covers it up
		    });

		    /* ----------   toggle-social   -------- */
		    $('.toggle-social, .vpanel.social .close').click(function() {
		        $( ".vpanel.social" ).slideToggle();
		    });


		});
      
      
      
$(document).ready(function () {


    /* ----  tooltips and popover (bootstrap.min.js)  -------- */
    if ($('html').hasClass('no-touch')) { // hover doesn't work on touch, so don't use

    /* ----  hover tooltip -------- */
        $('.tooltip-hover').tooltip({trigger: 'hover',container: 'body'});

    /* ----  hover popover -------- */
        $('.popover-hover').popover({ trigger: 'hover'});
    } // end if html has class no-touch


    /* ----  click tooltip -------- */
    $('.tooltip-click').tooltip({trigger: 'click',container: 'body'});

    /* ----  click popover -------- */
    $('.popover-click').popover({trigger: 'click'});


}); // end document ready      
 
      
      