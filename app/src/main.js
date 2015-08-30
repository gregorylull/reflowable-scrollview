define(function(require, exports, module) {
    'use strict';
    var Engine = require('famous/core/Engine');
    var Modifier = require('famous/core/Modifier');
    var Transform = require('famous/core/Transform');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var ReflowableScrollview = require('views/reflowableScrollview');
    var StateModifier = require('famous/modifiers/StateModifier');
    var OptionsView = require('views/OptionsView');
    var AppView = require('views/AppView');
    var Utility = require('famous/utilities/Utility');
    var Easing = require('famous/transitions/Easing');

    // your app here
    var appView = new AppView();
    var mainContext = Engine.createContext();
    var optionsView = new OptionsView();
    var optionsModifier = new StateModifier({
        size: [50,200],
        origin: [1, 0],
        transform: Transform.translate(0, 420, 0)
    });

    console.log('what about this?');

    optionsView.pipe(appView);

    // * greg test *
    // var addReflow = function () {
    //     // create a reflowable view
    //     var reflowable = new ReflowableScrollview({
    //         direction: Utility.Direction.Y
    //     });

    //     var arr = [];



    //     // get class 53
    //     var class_53s = document.getElementsByClassName('_53s');

    //     for (var i = 0; i < class_53s.length; i++) {
    //         var el = class_53s[i];

    //         el.setAttribute('style', 'width=211px');
    //         var s = new Surface({
    //             content: el,
    //             size: [211, 211]
    //         });

    //         reflowable.subscribe(s);
    //         arr.push(s);
    //     }

    //     reflowable.sequenceFrom(arr);
    //     var mod = new StateModifier({
    //         transform: Transform.translate(0, 420, 0)
    //     });
    //     mainContext.add(mod).add(reflowable);

    //     // cleaning
    //     var container = document.getElementById('collection_wrapper_2305272732');
    //     var parent = container.parentNode;
    //     parent.removeChild(container);

    //     // var famousContainer = document.getElementsByClassName('famous-container')[0];
    //     // parent.appendChild(famousContainer);
    // };
    // background color for fb: #e9eaed

    var surface = new Surface({
        size: [undefined, 100],
        properties: {
            backgroundColor: 'removeChild'
        }
    });

    var surfMod = new Modifier({
        transform: Transform.translate(0, 300, 0)
    });

    window.surf = surface;

    mainContext.add(surfMod).add(surface);

    // appView.clean();
    mainContext.add(appView);
    mainContext.add(optionsModifier).add(optionsView);
});
