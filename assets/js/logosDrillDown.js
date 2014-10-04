// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

// MIT license

(function() {
    'use strict';

    var lastTime = 0,
        vendors = ['ms', 'moz', 'webkit', 'o'],
        x;

    for(x = 0; x < vendors.length && !window.requestAnimationFrame; x += 1) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame){
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime(),
                timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                id = window.setTimeout(function() { callback(currTime + timeToCall); },timeToCall);

            lastTime = currTime + timeToCall;

            return id;
        };
    }

    if (!window.cancelAnimationFrame){
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

}());

(function($) {

    'use strict';

    /** "global" vars **/
    var pluginName = "logosDrillDown",

        methods = {
            /** constructor **/
            init: function(options) {
                options = $.extend({}, $.fn.logosDrillDown.defaults, options);

                return this.each(function() {

                    var $wrapper = $(this).addClass(options.myClass),
                        $menu = $(">ul", $wrapper),
                        defaultPath = [],
                        width = $wrapper.width();

                    // save data for later usage
                    $wrapper.data(pluginName, {
                        options: options,
                        $menu: $menu,
                        path: [],
                        pathNumerical: [],
                        offset: $menu.width(),
                        keysActive: false
                    });

                    // prepare markup & events
                    // height of starting ul
                    adjustHeight.apply($wrapper, [$menu]);

                    // widths of uls
                    window.requestAnimationFrame(function(){
                        $wrapper.css("width", width+"px");
                    });

                    window.requestAnimationFrame(function(){
                        $("ul", $menu).css({"width": width+"px", "left": width+"px"});
                    });

                    if(options.keyboardNavigation) {
                        var keysActive = false;

                        // activate keyboard navigation (ctrl + m)
                        $(document).bind("keyup", function(event) {
                            if(event.keyCode == 77 && event.ctrlKey) {
                                // ctrl + m clicked - focus on menu
                                var data = $wrapper.data(pluginName);
                                data.keysActive = !data.keysActive;

                                if(data.keysActive) {
                                    // if no position is active - activate first from the top
                                    var path = $wrapper.data(pluginName).path;
                                    var $li;

                                    if(path.length) {
                                        $li = $(">li:eq(0)", path[path.length-1].nextAll("ul"));
                                    } else {
                                        $li = $(">li:eq(0)", $wrapper.data(pluginName).$menu);
                                    }

                                    $li.addClass(options.activeClass);


                                }
                            }

                            return true;

                        });

                        // attach keyboard navigation listeners (arrows, enter)
                        $(document).bind("keyup", function(event){
                            var data = $wrapper.data(pluginName);

                            if(!data.keysActive && $(":focus", $wrapper).length == 0) {
                                return true;
                            }

                            switch(event.keyCode) {
                                case 8:
                                case 13:
                                case 37:
                                case 38:
                                case 39:
                                case 40:
                                    keyboardMove.apply($wrapper, [event.keyCode]);
                                    break;
                            }

                            return false;
                        });
                    }

                    if(options.ajax){
                        // prepare to ajax mode

                        $(document).on(options.event, "li."+options.expandableClass+" > a", function(){
                            var $this = $(this);

                            if(!$(this).nextAll("ul").length) {
                                // need to fetch the contents
                                $.ajax({
                                    type: "GET",
                                    url: $this.attr("href"),
                                    dataType: "html",
                                    success: function(data) {
                                        $this.after(data);
                                        prepareAjaxNode.apply($wrapper, $this.nextAll("ul"));
                                        $wrapper.logosDrillDown("goTo", $this);
                                    }
                                });

                            } else {
                                $wrapper.logosDrillDown("goTo", $(this));
                            }

                            return false;
                        });
                    } else {
                        // standard mode
                        $("a", $menu).each(function() {
                            var expandable = false;

                            if($(this).nextAll("ul").length > 0) {

                                $(this).parent().addClass(options.expandableClass);

                                expandable = true;
                            }

                            $(this).bind(options.event, function() {
                                if(!expandable) {return true;}

                                $wrapper.logosDrillDown("goTo", $(this));

                                return false;
                            });


                            // class based state holding
                            if($(this).hasClass(options.currentClass)) {
                                $(this).removeClass(options.currentClass);

                                var $expandableLi = $(this).closest("li."+options.expandableClass),
                                    $realCurrent;

                                $realCurrent = $(">a", $expandableLi).addClass(options.currentClass);

                                defaultPath = getNumericalPathForElement.apply($wrapper, [$realCurrent]);
                            }
                        });

                        // cookie based state holding
                        if(options.useCookies) {
                            var cookie = getCookie(pluginName);

                            if(cookie !== null && cookie !== "") {
                                var cookiePath = cookie.split(',');
                                if(cookiePath.length > 0) {
                                    defaultPath = cookiePath;
                                }
                            }
                        }

                        // cookie based state has precedence with html based state
                        if(defaultPath.length > 0) {
                            followPath.apply($wrapper, [defaultPath, false]);
                            $wrapper.dequeue(pluginName);
                        }
                    }

                });
            },
            /**
             * Open given position (node) in menu.
             *
             * @param $el node "a" element to be opened. If node does not exist in menu - menu will go to top.
             * @param withAnimation boolean Should the operation be animated (optional, default: yes)
             *
             */
            goTo: function($el, withAnimation) {
                return this.each(function() {
                    var $wrapper = $(this),
                        data = $wrapper.data(pluginName),
                        pathNumerical = data.pathNumerical,
                        options = data.options,
                        stepsUp = 0,
                        x = 0;

                    if(withAnimation === undefined) {
                        withAnimation = true;
                    }

                    if($el === undefined || $el === null) {
                        // no element given = no action
                        return false;
                    }

                    if(!data.$menu.has($el).length) {
                        // given $el is not within our menu.
                        // go top
                        $wrapper.logosDrillDown("goTop", withAnimation);
                        return false;
                    }

                    if(!$el.closest("li").hasClass(options.expandableClass)) {
                        // we cannot open a thing that has no children
                        // so let's open the element that is above
                        $wrapper.logosDrillDown("goTo", $el.closest("li."+options.expandableClass).find(">a"), withAnimation);

                        return false;
                    }

                    var elPath = getNumericalPathForElement.apply($wrapper, [$el]),
                        pathNumericalLength = pathNumerical.length,
                        pathToFollow = [];

                    for(var i = 0; i<elPath.length; i++) {
                        if(pathNumericalLength < i) {
                            pathToFollow = elPath.slice(i, elPath.length);
                            break;
                        }

                        if(elPath[i] !== pathNumerical[i]) {
                            // go up as many loops as needed
                            stepsUp = pathNumerical.length - i;
                            for(x=0; x<stepsUp; x++) {
                                closeCurrentPosition.apply($wrapper, [withAnimation]);
                            }
                            pathToFollow = elPath.slice(i, elPath.length);

                            break;
                        }
                    }

                    if(elPath.length < pathNumerical.length && pathToFollow.length === 0) {
                        // go up as many times as the difference is
                        stepsUp = pathNumerical.length - elPath.length;
                        for(x=0; x<stepsUp; x++) {
                            closeCurrentPosition.apply($wrapper, [withAnimation]);
                        }
                    }


                    followPath.apply($wrapper, [pathToFollow, withAnimation]);
                    $wrapper.dequeue(pluginName);

                    return false;
                });
            },
            /**
             * Go to the top of whole menu
             *
             * @param withAnimation boolean Should the operation be animated (optional, default: true)
             */
            goTop: function(withAnimation) {
                return this.each(function() {
                    var $wrapper = $(this),
                        data = $wrapper.data(pluginName);

                    if(withAnimation === undefined) {
                        withAnimation = true;
                    }

                    $wrapper.logosDrillDown("goUp", data.path.length, withAnimation);

                });
            },
            /**
             * Go 'levels' up
             *
             * @levels int How many levels to go
             * @withAnimation boolean Shall the movement be animated (optional, default: true)
             */
            goUp: function(levels, withAnimation) {
                if(withAnimation === undefined) {
                    withAnimation = true;
                }

                return this.each(function() {
                    if(levels === 0) {
                        // no going up
                        return;
                    }

                    var $wrapper = $(this);

                    for(var i=0; i<levels; i++) {
                        closeCurrentPosition.apply($wrapper, [withAnimation]);
                    }

                    $wrapper.dequeue(pluginName);

                    return false;
                });
            },
            /** Get or set any option. If no value is specified, will act as a getter **/
            option: function(key, value) {
                if  (typeof key === "string" ) {

                    var $container = $(this),
                        data = $container.data(pluginName);

                    if ( value === undefined ) {
                        // behave as a "getter"
                        return data.options[key];

                    } else {

                        data.options[key] = value;
                        $container.data(pluginName, data);

                        return this;
                    }
                }

                return false;
            },
            /**
             * Searches for given phrase in whole menu.
             * Always returns an array containing matched nodes.
             *
             *
             * @param phrase string The phrase we're looking for (at least 1 character)
             * @param autoOpen boolean If one node is matched, should the menu be automatically opened. Optional, default: true
             * @param withAnimation boolan (Used only if autoOpen is true) Shall the opening operation be animated
             */
            search: function(phrase, autoOpen, withAnimation) {
                if(phrase === "") {
                    // don't allow to search for empty string
                    return [];
                }
                if(autoOpen === undefined) {
                    autoOpen = true;
                }

                if(withAnimation === undefined) {
                    withAnimation = false;
                }

                var $wrapper = $(this),
                    data = $wrapper.data(pluginName),
                    options = data.options,
                    regex = new RegExp(phrase, "i"),
                    $menu = data.$menu,
                    elements = [];

                var $as = $("li > a", $menu);
                $as.filter("."+options.matchClass).removeClass(options.matchClass);

                $as.each(function() {
                    if($(this).text().match(regex)) {

                        $(this).addClass(options.matchClass);

                        elements.push($(this));
                    }
                });

                if(autoOpen && elements.length === 1) {
                    var parentsLi = $(elements[0]).parents("li");

                    if(parentsLi.length < 2) {
                        // found element on the top
                        $wrapper.logosDrillDown("goTop", withAnimation);
                    } else {
                        $wrapper.logosDrillDown("goTo", $(">a", parentsLi[1]), withAnimation);
                    }
                }

                return elements;
            },
            /*
             * Wrapper for "search" function - attaches all
             * the events, builds search results.
             *
             * @param $form node Search form
             * @param $resultsContainer node HTML container where the search results will be put
             * @param autoOpen boolean If one node is matched, should the menu be automatically opened. Optional, default: true
             * @param withAnimation boolean Shall the opening operation be animated
             */
            searchWrapper: function($form, $resultsContainer, autoOpen, withAnimation) {
                return this.each(function() {
                    var $wrapper = $(this);

                    $form.submit(function() {
                        var phrase = $("input[type=text]", $form).val(),
                            results = $wrapper.logosDrillDown("search", phrase, autoOpen, withAnimation);

                        $resultsContainer.html("");
                        if(results.length > 1) {
                            var $sWrapper = $('<div></div>');

                            $.each(results, function(i, res) {
                                var breadcrumb = $wrapper.logosDrillDown("getBreadcrumbs", res);
                                var breadcrumbHtml = $wrapper.logosDrillDown("getBreadcrumbsFormatted", breadcrumb, withAnimation);

                                $sWrapper.append(breadcrumbHtml);
                            });
                            $resultsContainer.html($sWrapper);
                        }

                        return false;
                    });

                });
            },
            /**
             * Returns breadcrumbs to given element or to currently opened element as
             * an array of nodes (Starting node is always "span")
             *
             *@param $el node Node ("a" element) to get breadcrumbs to. If null (or undefined) given will return array to currently opened node.
             */
            getBreadcrumbs: function ($el){
                return getBreadcrumbs.apply($(this), [$el]);
            },
            /**
             * Returns HTML formatted with JS events attached breadcrumbs.
             * If no arguments are provided - returns breadcrumbs to currently opened node.
             *
             * @param breadcrumbs Array|node Array of nodes to build path to. Optional, default: undefined
             *
             */
            getBreadcrumbsFormatted: function(breadcrumbs, withAnimation) {
                var $wrapper = $(this);

                if(breadcrumbs === undefined) {
                    breadcrumbs = $wrapper.logosDrillDown("getBreadcrumbs");
                }

                if(withAnimation === undefined) {
                    withAnimation = true;
                }

                var $container = $('<div class="breadcrumbs"></div>');

                $.each(breadcrumbs, function(i, bc){
                    var span = $('<span>'+$(bc).text()+'</span>').bind("click", function() {
                        $wrapper.logosDrillDown("goTo", bc, withAnimation);

                        return false;
                    });
                    $container.append(span).append(" ");
                });

                return $container;
            },

            windowResizeEvent : function(){

                //Setting of all the variables.
                var $wrapper = $(this),
                    width = $(window).width(),
                    data = $wrapper.data(pluginName),
                    $menu = $(">ul", $wrapper),
                    $pathLength = data.path.length-1;//gives the location of the current selected object)

                data.offset = width;


                // height of starting ul
                //you can comment this out if you don't want the height to resize as well.
                //  adjustHeight.apply($wrapper, [$menu]);



                //pathLength is a dynamic variable that is equal to the number of previous menu objects
                //We want to check that the current selected object is not the root path
                if($pathLength >= 0){

                    //going through each menu item to calculate out the length and the width.
                    $("ul", $menu).each(function(index){

                        var self = this;

                        if(index < $pathLength){//if the element comes before the current object

                            window.requestAnimationFrame(function(){
                                $(self).css({"width": width+"px", "left": 0+"px"});
                            });

                        }else {//this handles the current object and all other objects.

                            window.requestAnimationFrame(function(){
                                $(self).css({"width": width+"px", "left": width+"px"});
                            });

                        }
                    });

                    //this effects the root element. if the path isn't the root, we want to set the root to a negative width
                    //If this isn't done, any time you back from an element, the root element will be shown
                    window.requestAnimationFrame(function(){
                        $($menu).css({"width": width+"px", "left": -width+"px"});
                    });

                }else{

                    //if all of the elements are actually outside the viewport, and we are currently on the root element,
                    //we're going to just set the widths and left vales of everything to right of the viewport.
                    $("ul", $menu).each(function(){
                        var self = this;

                        window.requestAnimationFrame(function(){
                            $(self).css({"width": width+"px", "left": width+"px"});
                        });
                    });

                    window.requestAnimationFrame(function(){
                        $($menu).css({"width": width+"px", "left": 0+"px"});
                    });
                }

                window.requestAnimationFrame(function(){
                    $wrapper.css("width", width+"px");
                });

            }
        };


    /**
     * returns path to the element
     *
     * @return Array indexes of "li" elements leading to given elements
     *
     */
    var getNumericalPathForElement = function($element) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            path = [];

        $element.parentsUntil("."+data.options.myClass, "li").each(function() {
            path.push($(this).index());
        });

        return path.reverse();
    };


    /**
     * returns path to the element
     *
     * @return Array jquery "a" elements leading to given elements
     */
    var getElementPathForElement = function($element) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            path = [];

        $element.parentsUntil("."+data.options.myClass, "li").each(function() {
            path.push($(">a", $(this)));
        });

        return path.reverse();
    };

    /**
     * Will follow given path from the position we're currently at
     */
    var followPath = function(pathToFollow, withAnimation) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            $menu = data.$menu,
            pathNumerical = data.pathNumerical,
            path = data.path;

        if(pathToFollow.length === 0) {
            // nothing to follow
            return false;
        }

        if(pathNumerical.length === 0) {
            // first step
            openPosition.apply($wrapper, [$(">li:eq("+pathToFollow[0]+")>a", $menu), withAnimation]);
        } else {
            openPosition.apply($wrapper, [path[path.length-1].nextAll("ul").find(">li:eq("+pathToFollow[0]+")>a"), withAnimation]);
        }

        return followPath.apply($wrapper, [pathToFollow.slice(1, pathToFollow.length), withAnimation]);

    };


    /**
     * opens given position, assuming that the ancesting ul is currently visible
     */
    var openPosition = function($el, withAnimation) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            options = data.options,
            path = data.path,
            pathNumerical = data.pathNumerical;

        var $prev = $el.closest("ul");
        var $next = $el.nextAll("ul");

        options.onBeforeOpen($el);

        var duration = options.duration;
        if(!withAnimation) {
            duration = 0;
        }

        $wrapper.queue(pluginName, function(next){
            $next.show();

            if(options.heightAutoAdjust) {
                adjustHeight.apply($wrapper, [$next]);
            }

            if ($.isFunction($prev.velocity)) {

                $prev.velocity({
                    left: "-="+data.offset
                }, {
                    duration: duration,
                    easing: options.easing,
                    complete: function() {
                        next();
                    }
                });

            } else {

                $prev.animate({
                    left: "-="+data.offset
                }, {
                    duration: duration,
                    easing: options.easing,
                    complete: function() {
                        next();
                    }
                });

            }


        });

        path.push($el);
        pathNumerical.push($el.closest("li").index());

        if(options.useCookies) {
            setCookie(pluginName, pathNumerical);
        }

        data.path = path;
        data.pathNumerical = pathNumerical;
        $wrapper.data(pluginName, data);


        options.onOpened($el);
        $wrapper.trigger("drilldownchange", [$el, true]);

        if(options.ajaxPreloading) {
            ajaxPreload.apply($wrapper, [$el]);
        }

        return false;
    };


    /**
     *
     * Close currently opened node
     *
     * @param withAnimation boolean Should it be animated (optional, default: yes)
     *
     */
    var closeCurrentPosition = function(withAnimation) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            $menu = data.$menu,
            options = data.options,
            path = data.path,
            pathNumerical = data.pathNumerical;


        var $current = path.pop();
        if($current === null) {
            // we're already on top, nothing to do
            return;
        }

        var $parent = $current.closest("ul");
        var $currentUl = $current.nextAll("ul");

        var duration = options.duration;
        if(withAnimation === false) {
            duration = 0;
        }

        options.onBeforeClose($current);

        $wrapper.queue(pluginName, function(next){

            if ($.isFunction($parent.velocity)) {

                $parent.velocity({
                    left: "+="+data.offset
                }, {
                    duration: duration,
                    easing: options.easing,
                    complete: function() {
                        $currentUl.hide();
                        next();
                    },
                    display: "block"
                });

            } else {

                $parent.show();
                $parent.animate({
                    left: "+="+data.offset
                }, {
                    duration: duration,
                    easing: options.easing,
                    complete: function() {
                        $currentUl.hide();
                        next();
                    }
                });

            }


            if(options.heightAutoAdjust) {
                adjustHeight.apply($wrapper, [$parent]);
            }
        });

        pathNumerical.pop();

        if(options.useCookies) {
            setCookie(pluginName, pathNumerical);
        }

        data[pathNumerical] = pathNumerical;
        data[path] = path;
        $wrapper.data(pluginName, data);

        var $el = path[path.length-1];
        options.onClosed($current);
        $wrapper.trigger("drilldownchange", [$el, false]);
    };


    /**
     * Returns breadcrumbs (starter + path) to the given element or
     * to the currently opened element
     *
     * @param $el node Element to get breadcrumbs to. Leave it undefined to get breadcrumbs to currently opened
     */
    var getBreadcrumbs = function($el) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            start = [];

        var path = data.path;
        if($el !== undefined) {
            path = getElementPathForElement.apply($wrapper, [$el]);
        }

        if(path.length > 0){
            start.push($('<span class="">'+data.options.startName+"</span>"));
        }

        return start.concat(path);

    };


    /**
     * Cookie handler - setter
     */
    var setCookie = function (name, value, days) {
        var expires = "";

        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            expires = "; expires="+date.toUTCString();
        }

        document.cookie = name+"="+value+expires+"; path=/";
    };


    /**
     * Cookie handler -getter
     */
    var getCookie = function (name) {
        var nameEQ = name + "=",
            ca = document.cookie.split(';');

        for(var i=0;i < ca.length;i++) {

            var c = ca[i];

            while (c.charAt(0) === ' '){
                c = c.substring(1,c.length);
            }

            if (c.indexOf(nameEQ) === 0){
                return c.substring(nameEQ.length,c.length);
            }
        }

        return null;
    };

    /**
     * Adjusts height of given $ul basing on it's content
     *
     * @param $ul node
     */
    var adjustHeight = function ($ul) {
        var $wrapper = $(this),
            data = $ul.data(pluginName),
            newHeight;


        if(data !== undefined) {
            newHeight = data.height;
        } else {
            newHeight = $ul.height();
            data = {
                height: newHeight
            };

            $ul.data(pluginName, data);
        }

        if ($.isFunction($wrapper.velocity)) {

            $wrapper.velocity({
                height: newHeight
            }, {
                duration: 200
            });

        } else {
            $wrapper.animate({
                height: newHeight
            }, {
                duration: 200
            });
        }

    };

    /**
     * Preloads all
     * positions in given $el
     *
     * @param $el node "a" element to preload subpositions of
     */
    var ajaxPreload = function($el) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            options = data.options;

        $el.nextAll("ul").find("li."+options.expandableClass+">a").each(function() {
            var $this = $(this);
            if($this.nextAll("ul").length>0) {
                // element already has children
                return;
            }

            $.ajax({
                type: "GET",
                url: $this.attr("href"),
                dataType: "html",
                success: function(data) {
                    $this.after(data);

                    prepareAjaxNode.apply($wrapper, $this.nextAll("ul"));
                }
            });
        });
    };

    /**
     * Prepares freshly added through ajax ul node
     */
    var prepareAjaxNode = function($ul) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName);

        window.requestAnimationFrame(function(){
            $($ul).css({"width": data.$menu.width()+"px" , "left": data.$menu.width()+"px"});
        });

        data.$menu = $(">ul", $wrapper);
        $wrapper.data(pluginName, data);
    };


    /**
     * Change menu position
     */
    var keyboardMove = function(direction) {
        var $wrapper = $(this),
            data = $wrapper.data(pluginName),
            path = data.path,
            options = data.options,
            $ul = data.$menu;

        if(path.length > 0) {
            var $current = path[path.length-1];
            $ul = $current.nextAll("ul");
        } else {
            if(direction === 37) {
                // if we're on top and want to move up - do nothing
                return;
            }
        }

        var $activeLi = $("> li."+options.activeClass, $ul);

        if(direction === 37 || direction === 8) {
            // go up one step (we already know we're not on top)

            $wrapper.logosDrillDown("goUp", 1);
            $activeLi.removeClass(options.activeClass);

            $ul.parent().parent("ul").find(">li:eq(0)").addClass(options.activeClass);

            return;
        }

        if(direction === 39 || direction === 13) {
            // go down (into)
            var $active = $(">a", $activeLi);

            if(!$activeLi.hasClass(options.expandableClass)) {
                // no move - this li is not expandable
                if(direction === 13 && $active.length) {
                    window.location = $active.attr("href");
                }

                return;
            }

            if($active.length) {
                $wrapper.logosDrillDown("goTo", $active);
                $activeLi.removeClass(options.activeClass);

                $(">li:eq(0)", $active.nextAll("ul")).addClass(options.activeClass);


            }

            return;
        }


        // now we could go left or right only

        if(direction === 40) {
            // go down
            var $newLi = $activeLi.next("li");
            if($activeLi.length === 0) {
                $newLi = $(">li:eq(0)", $ul);
            }
        } else if(direction === 38) {
            // go up
            var $newLi = $activeLi.prev("li");
            if($activeLi.length === 0) {
                $newLi = $(">li:last", $ul);
            }
        }

        if($newLi.length > 0) {
            // change active only if we're not first element
            $activeLi.removeClass(options.activeClass);
            $newLi.addClass(options.activeClass);

        }


    };

    $.fn.logosDrillDown = function(method) {
        if ( methods[method] ) {
            return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on Drill Down!' );
            return false;
        }
    };

    /** default values for plugin options **/
    $.fn.logosDrillDown.defaults = {
        myClass: "logosDrillDown", // class given automatically to the element
        expandableClass: "expandable", // Non ajax mode: this class will be given to "li" with children. Ajax mode: give this class to "li" that has children.
        onOpened: $.noop, // Callback fired just after submenu was opened (element passed as an argument)
        onBeforeOpen: $.noop, // Callback fired just before submenu opening (element passed as an argument)
        onClosed: $.noop, // Callback fired just after submenu was closed (closed element passed as an argument)
        onBeforeClose: $.noop, // Callback fired just before submenu is closed (closing element passed as an argument)
        duration: 300, // Opening/closing animation time
        easing: "linear", // Type of easing (see jquery ui docs for more)
        currentClass: "current", // Menu will automatically open on the element having this class on load (think of stateful menu)
        useCookies: false, // Set it true to activate cookie-based stateful
        heightAutoAdjust: true, // If true, plugin will update the height of container automatically based on content
        matchClass: "match", // class given to element found by search method
        startName: "Start", // name of first breadcrumb
        ajax: false, // set true to enable ajax mode
        ajaxPreloading: true, // used only in ajax mode - should menu preload following screens
        event: "click", // event on which to open submenu
        keyboardNavigation: true, // is keyboard navigation active
        activeClass: "active" // currently active position, i.e. selected on keyboard
    };

})(jQuery);

