/*globals define*/
define(function(require, exports, module) {
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var ScrollView = require('famous/views/ScrollView');
    var ViewSequence = require('famous/core/ViewSequence');
    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');
    var TransitionableTransform = require('famous/transitions/TransitionableTransform');

    /*
     * @name reflowableScrollview
     * @constructor
     * @description
     */

    function reflowableScrollview (options) {
        ScrollView.apply(this, arguments);
        this.setOptions(reflowableScrollview.DEFAULT_OPTIONS);
        this.setOptions(options);
        this.debounceFlag = true;
        this._previousSize = [undefined, undefined];
        this._scroller.commit = _customCommit.bind(this);
        this._previousTranslationObject = null;
        this._currentTranslationObject = null;
    }

    reflowableScrollview.prototype = Object.create(ScrollView.prototype);
    reflowableScrollview.prototype.constructor = reflowableScrollview;

    reflowableScrollview.DEFAULT_OPTIONS = {
    };

    function _customCommit(context) {
        // 'this' will be an instance of reflowableScrollview
        var _scroller = this._scroller;

        var transform = context.transform;
        var opacity = context.opacity;
        var origin = context.origin;
        var size = context.size;

        // reset edge detection on size change
        // Implemented bug fix here
        if (!_scroller.options.clipSize && (size[0] !== _scroller._contextSize[0] || size[1] !== _scroller._contextSize[1])) {
            _scroller._onEdge = 0;
            _scroller._contextSize[0] = size[0];
            _scroller._contextSize[1] = size[1];
            if (this.debounceFlag) {
                _createNewViewSequence.call(this, context);
                this.debounceFlag = false;
            }
            this._previousTranslationObject = this._currentTranslationObject;

            var _timeDebouncedCreateNewViewSequence = Timer.debounce(_createNewViewSequence,1000);
            _timeDebouncedCreateNewViewSequence.call(this, context);


            if (_scroller.options.direction === Utility.Direction.X) {
                _scroller._size[0] = _getClipSize.call(_scroller);
                _scroller._size[1] = undefined;
            }
            else {
                _scroller._size[0] = undefined;
                _scroller._size[1] = _getClipSize.call(_scroller);
            }
        }

        var scrollTransform = _scroller._masterOutputFunction(-_scroller._position);

        return {
            transform: Transform.multiply(transform, scrollTransform),
            opacity: opacity,
            origin: origin,
            target: _scroller.group.render()
        };
    }

    function _createNewViewSequence(context) {
        // 'this' will be an instance of reflowableScrollview
        this._originalArray = this._originalArray || this._node._.array;

        var direction = this.options.direction;
        var offsetDirection = (direction === 0 ? 1 : 0);
        var contextSize = context.size; // this is an array
        var result = [];

        var currentView = new View();
        var accumulatedSize = 0;
        var maxSequenceItemSize = 0;
        var numSequenceItems = 0;
        var gutterInfo = _calculateGutterInfo.call(null, this._originalArray, direction, contextSize);
        var accumulatedSizeWithGutter;
        var rowNumber = 0;
        var rowNumberCounter = 1;
        var sequenceItem;
        var currentSequenceItemSize;
        var currentSequenceItemMaxSize;
        var translationObject = [];
        var xyCoordinates = [];

        this._transitionableArray = [];

        for (var i = 0; i < this._originalArray.length; i += 1) {
            this._transitionableArray.push(new TransitionableTransform());
        }

        for (var j = 0; j < this._originalArray.length; j += 1) {
            sequenceItem = this._originalArray[j];
            currentSequenceItemSize = sequenceItem.getSize()[offsetDirection];
            currentSequenceItemMaxSize = sequenceItem.getSize()[direction];

            // Check if sum of item sizes is larger than context size
            if (accumulatedSize + currentSequenceItemSize < contextSize[offsetDirection]) {

                // find max view size
                if (currentSequenceItemMaxSize > maxSequenceItemSize) {
                    maxSequenceItemSize = currentSequenceItemMaxSize;
                }

                // first sequenceItem will be on the left / top most edge
                if (accumulatedSize === 0) {
                    accumulatedSizeWithGutter = accumulatedSize;
                } else {
                    // want to include number of gutters proportional to the number of items in a row
                    accumulatedSizeWithGutter = accumulatedSize + gutterInfo[rowNumber][0] * (rowNumberCounter === gutterInfo[rowNumber][1] ? rowNumberCounter : rowNumberCounter++);
                }

                // collect xyCoordinates of each item
                xyCoordinates.push([accumulatedSizeWithGutter]);

                _addToView.call(this, currentView, accumulatedSizeWithGutter, sequenceItem, j);
                accumulatedSize += currentSequenceItemSize;
            } else {
                // result array is populated enough
                // console.log(maxSequenceItemSize);
                currentView.setOptions({ size: direction === 1 ? [undefined, maxSequenceItemSize] : [maxSequenceItemSize, undefined] });
                result.push(currentView);

                // add max view size to each xyCoordinates subarray
                xyCoordinates.forEach(function(array) {
                    var element = {};
                    element['position'] = (direction === 1 ? [array[0],maxSequenceItemSize]: [maxSequenceItemSize, array[0]]);
                    element['row'] = rowNumber;
                    // element['transitionable'] = new TransitionableTransform();
                    translationObject.push(element);
                });

                // reset
                rowNumber += 1; // make sure we're increasing rowNumber so that we're grabbing correct info from gutterInfo
                rowNumberCounter = 1;
                accumulatedSize = 0;
                maxSequenceItemSize = 0;
                currentView = new View();
                xyCoordinates = [];

                // for first item in each row:
                currentSequenceItemMaxSize = sequenceItem.getSize()[direction];

                if (currentSequenceItemMaxSize > maxSequenceItemSize) {
                    maxSequenceItemSize = currentSequenceItemMaxSize;
                }

                xyCoordinates.push([accumulatedSize]);
                _addToView.call(this, currentView, accumulatedSize, sequenceItem, j);
                accumulatedSize += currentSequenceItemSize;
            }

                // remnant items in currentView
            if (j === this._originalArray.length - 1) {
                currentView.setOptions({ size: direction === 1 ? [undefined, maxSequenceItemSize] : [maxSequenceItemSize, undefined] });
                result.push(currentView);
                xyCoordinates.forEach(function(array) {
                    var element = {};
                    element['position'] = (direction === 1 ? [array[0],maxSequenceItemSize]: [maxSequenceItemSize, array[0]]);
                    element['row'] = rowNumber;
                    // element['transitionable'] = new TransitionableTransform();
                    translationObject.push(element);
                });
            }
        }
        // console.log('translationObject ', translationObject);
        this._currentTranslationObject = translationObject;

        for (var i = 0; i < this._currentTranslationObject.length; i += 1) {
            this._transitionableArray[i].setTranslate([200, 200, 0], {duration: 3000, curve: 'easeInOut'});
            // this._currentTranslationObject[i].transitionable.setTranslate([200, 200, 0], {duration: 3000, curve: 'easeInOut'});
        }

        this.sequenceFrom.call(this, result);
        // return result;
    }

    function _addToView(view, offset, sequenceItem, idx) {
        // var transitionable;
        var modifier = new Modifier({
            // transform: this.options.direction === 0 ? Transform.translate(0, offset, 0) : Transform.translate(offset, 0, 0)
            transform: _customFunction.call(this, offset, idx)
        });
        view.add(modifier).add(sequenceItem);
    }

    function _customFunction(offset, idx) {
        // var current = new TransitionableTransform();
        // var o
        // return (this.options.direction === 0 ? Transform.translate(0, offset, 0) : Transform.translate(offset, 0, 0));
        return this._transitionableArray[idx];
    }

    function _getPreviousPosition() {

    }

    // Test
    // function _addToView(view, offset, sequenceItem) {
    //     console.log('addtoView');
    //     var transitionableTransform = new TransitionableTransform();
    //     var modifier = new Modifier({
    //         transform: transitionableTransform
    //     });
    //     transitionableTransform.setTranslate(this.options.direction === 0 ? [0, offset, 0] : [offset, 0, 0], {duration: 1000});
    //     view.add(modifier).add(sequenceItem);
    // }

    // function _transition(view, offset, sequenceItem, index) {
    //     var transitionableTransform = new TransitionableTransform();
    //     this._modifier[index].transform = transitionableTransform;
    //     view.add(this._modifier[index]).add(sequenceItem);
    //     transitionableTransform.setTranslate([0,offset,0], {duration: 3000});
    // }


    function _calculateGutterInfo(sequenceItems, direction, contextSize) {
        // 'this' will be an instance of reflowableScrollview
        // _calculateGetter.call(this, this._originalArray, direction)

        var offsetDirection = (direction === 0 ? 1 : 0);
        var accumulatedSize = 0;
        var numSequenceItems = 0;
        var gutterInfo = [];
        var totalGutter;
        var sequenceItem;
        var currentSequenceItemSize;


        for (var i = 0; i < sequenceItems.length; i += 1) {
            sequenceItem = sequenceItems[i];
            currentSequenceItemSize = sequenceItem.getSize()[offsetDirection];

            if (accumulatedSize + currentSequenceItemSize < contextSize[offsetDirection]) {
                accumulatedSize += currentSequenceItemSize;
                numSequenceItems += 1;

                // last item in sequenceItems
                if (i === sequenceItems.length - 1) {
                    totalGutter = contextSize[offsetDirection] - accumulatedSize;
                    gutterInfo.push( [Math.floor(totalGutter / (numSequenceItems - 1)), numSequenceItems] );
                }
            } else {
                totalGutter = contextSize[offsetDirection] - accumulatedSize;
                gutterInfo.push( [Math.floor(totalGutter / (numSequenceItems - 1)), numSequenceItems] );

                // reset
                accumulatedSize = 0;
                numSequenceItems = 0;

                accumulatedSize += currentSequenceItemSize;
                numSequenceItems += 1;
            }
        }

        return gutterInfo; // [[total gutter / number of items, number of items]] => one inner array for each row
    }

    function _sizeForDir(size) {
        if (!size) size = this._contextSize;
        var dimension = (this.options.direction === Utility.Direction.X) ? 0 : 1;
        return (size[dimension] === undefined) ? this._contextSize[dimension] : size[dimension];
    }

    function _getClipSize() {
        if (this.options.clipSize) return this.options.clipSize;
        else return _sizeForDir.call(this, this._contextSize);
    }

    module.exports = reflowableScrollview;
});
