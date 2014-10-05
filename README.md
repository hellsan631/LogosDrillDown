LogosDrillDown
==============

A responsive drill down menu system that focuses on great features without sacrificing performance

http://mathew-kleppin.com/storage/logosDrillDown/

## Getting Started

### Requirements

```
Requires jQuery
Requires Twitter Bootstrap CSS
```

#### Recommended

```
Recommended VelocityJS
http://julian.com/research/velocity/
```

### Installation

Just include the twitter bootstrap css in the header, along with the (recommended) base style sheet.

```html
<head>
  <link href="assets/css/bootstrap.css" rel="stylesheet" type="text/css">
  <link href="assets/css/styleBase.css" rel="stylesheet" type="text/css">
</head>
```

Next, Add in your content in the body

```html
<body>
  <div class="nav-wrapper">
  
      <div class="menu-breadcrumbs"></div>
  
      <nav id="nav">
  
          <ul>
              <li><a href="#">Home</a></li>
              <li>
                  <a href="#">About Us</a>
                  <ul>
                      <li class="menu-label">About Us</li>
                      <li><a href="#">History</a></li>
                  </ul>
              </li>
              <li><a href="#">Contact</a></li>
          </ul>
      </nav>
  </div>
</body>
```

Then add in your scripts

```html
<script src="assets/js/jquery-2.js"></script>
<script src="assets/js/velocity.min.js"></script>
<script src="./logosDrillDown.min.js"></script>

<script>

    // Initialize menu
    $(document).ready(function() {

        'use strict';

        var $breadcrumbs = $(".nav-wrapper .menu-breadcrumbs"),
                $drillDown = $("#nav");

        $drillDown.logosDrillDown({
            onOpened: manageBreadcrumbs,
            onClosed: manageBreadcrumbs,
            expandableClass: "has-children",
            startName: "Home"
        });

        //If you want the menu to resize when you resize the window,
        //just call this function
        $(window).on('resize', function(){
            $drillDown.logosDrillDown("windowResizeEvent");
        });
        
        //functions to manage the breadcrumbs as you go deeper into the menu
        function manageBreadcrumbs() {
            $breadcrumbs.html($drillDown.logosDrillDown("getBreadcrumbsFormatted"));
        }

        manageBreadcrumbs();
    });

</script>
```

### Enjoy!

The menu was build using jQuery, with most of the animations using VelocityJS for maximum performance on desktop and mobile devices.

As there are a few scripts included in here, each script that isn't of my design is copyright its original authors.
