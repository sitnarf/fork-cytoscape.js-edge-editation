(function(scope){
    var Class = function(param1, param2) {
        var extend, mixins, definition;
        if(param2){     //two parameters passed, first is extends, second definition object
            extend = Array.isArray(param1)?param1[0]:param1;
            mixins = Array.isArray(param1)?param1.slice(1):null;
            definition = param2;
        }else{      //only one parameter passed => no extend, only definition
            extend = null;
            definition = param1;
        }


        var Definition = definition.hasOwnProperty("constructor")?definition.constructor:function(){ };

        Definition.prototype = Object.create(extend?extend.prototype:null);
        var propertiesObject = definition.propertiesObject?definition.propertiesObject:{};
        if(mixins){
            var i,i2;
            for(i in mixins){
                for(i2 in mixins[i].prototype){
                    Definition.prototype[i2] = mixins[i].prototype[i2];
                }
                for(var i2 in mixins[i].prototype.propertiesObject){
                    propertiesObject[i2] = mixins[i].prototype.propertiesObject[i2];
                }
            }
        }

        Definition.prototype.propertiesObject = propertiesObject;

        Object.defineProperties(Definition.prototype, propertiesObject);

        for(var key in definition){
            if(definition.hasOwnProperty(key)){
                Definition.prototype[key] = definition[key];
            }
        }

        Definition.prototype.constructor = Definition;

        return Definition ;
    };


    var Interface = function(properties){
        this.properties = properties;
    };

    var InterfaceException = function(message){
        this.name = "InterfaceException";
        this.message = message || "";
    };

    InterfaceException.prototype = new Error();

    Interface.prototype.implements = function(target){
        for(var i in this.properties){
            if(target[this.properties[i]] == undefined){
                throw new InterfaceException("Missing property " + this.properties[i] );
            }
        }
        return true;
    };

    Interface.prototype.doesImplement = function(target){
        for(var i in this.properties){
            if(target[this.properties[i]] === undefined){
                return false;
            }
        }
        return true;
    };

    var VectorMath = {
        distance: function (vector1, vector2) {
            return Math.sqrt(Math.pow(vector1.x - vector2.x,2) + Math.pow(vector1.y - vector2.y,2));
        }
    };

    var EventDispatcher = Class({
        constructor: function(){
            this.events = {};
        },
        on: function(name, listener, context){
            this.events[name] = this.events[name]?this.events[name]:[];
            this.events[name].push({
                listener: listener,
                context: context
            })
        },
        once: function(name,listener, context){
            this.off(name,listener,context);
            this.on(name, listener, context);
        },
        off: function(name, listener, context){
            //no event with this name registered? => finish
            if(!this.events[name]){
                return;
            }
            if(listener){		//searching only for certains listeners
                for(var i in this.events[name]){
                    if(this.events[name][i].listener === listener){
                        if(!context || this.events[name][i].context === context) {
                            this.events[name].splice(i,1);
                        }
                    }
                }
            }else{
                delete this.events[name];
            }
        },
        trigger: function(name){
            var listeners = this.events[name];

            for(var i in listeners){
                listeners[i].listener.apply(listeners[i].context, Array.prototype.slice.call(arguments,1));
            }
        }
    });

    scope.CytoscapeEdgeEditation = Class({

        init: function (cy) {
            this.DOUBLE_CLICK_INTERVAL = 300;
            this.HANDLE_SIZE = 5;
            this.ARROW_END_ID = "ARROW_END_ID";

            this._handles = {};
            this._dragging = false;
            this._hover = null;


            this._cy = cy;
            this._$container = $(cy.container());

            this._cy.on('mouseover tap', 'node', this._mouseOver.bind(this));
            this._cy.on('mouseout', 'node', this._mouseOut.bind(this));

            this._$container.on('mouseout', function(e){
                this._clear();
            }.bind(this));

            this._$container.on('mouseover', function(e){
                if(this._hover) {
                    this._mouseOver({cyTarget: this._hover});
                }
            }.bind(this));

            this._cy.on("select", "node", this._redraw.bind(this))

            this._cy.on("mousedown", "node", function(){
                this._nodeClicked = true;
            }.bind(this));

            this._cy.on("mouseup", "node", function(){
                this._nodeClicked = false;
            }.bind(this));

            this._cy.on("remove", "node", function(){
                this._hover = false;
                this._clear();
            }.bind(this))

            this._cy.bind('zoom pan', this._redraw.bind(this));


            this._$canvas = $('<canvas></canvas>');
            this._$canvas.css("top", 0);
            this._$canvas.on("mousedown", this._mouseDown.bind(this));
            this._$canvas.on("mousemove", this._mouseMove.bind(this));

            this._ctx = this._$canvas[0].getContext('2d');
            this._$container.children("div").append(this._$canvas);

            $(window).bind('mouseup',  this._mouseUp.bind(this));

            /*$(window).bind('resize', this._resizeCanvas.bind(this));
            $(window).bind('resize', this._resizeCanvas.bind(this));*/

            this._cy.on("resize", this._resizeCanvas.bind(this));

            this._$container.bind('resize', function(){
                this._resizeCanvas();
            }.bind(this));

            this._resizeCanvas();

            this._arrowEnd = this._cy.add({
                group: "nodes",
                data: {
                    "id": this.ARROW_END_ID,
                    "position": {x: 150,y:150}
                }
            });

            this._arrowEnd.css({
                "opacity": 0,
                'width': 0.0001,
                'height': 0.0001
            });

        },
        registerHandle: function(handle){
            if(handle.nodeTypeNames){
                for(var i in handle.nodeTypeNames){
                    var nodeTypeName = handle.nodeTypeNames[i];
                    this._handles[nodeTypeName] = this._handles[nodeTypeName] || [];
                    this._handles[nodeTypeName].push(handle);
                }
            }else{
                this._handles["*"] = this._handles["*"] || [];
                this._handles["*"].push(handle);
            }

        },
        _showHandles: function(target){
            var nodeTypeName = target.data().type;
            if(nodeTypeName){

                var handles = this._handles[nodeTypeName]?this._handles[nodeTypeName]:this._handles["*"];

                for(var i in handles){
                    if(handles[i].type != null){
                        this._drawHandle(handles[i], target);
                    }
                }
            }

        },
        _clear: function(){

            var w = this._$container.width();
            var h = this._$container.height();
            this._ctx.clearRect( 0, 0, w, h );
        },
        _drawHandle: function(handle, target){

            var position = this._getHandlePosition(handle, target);

            this._ctx.beginPath();
            this._ctx.arc(position.x, position.y, this.HANDLE_SIZE, 0, 2 * Math.PI, false);
            this._ctx.fillStyle = handle.color;
            this._ctx.strokeStyle = "white";
            this._ctx.lineWidth = 2;
            this._ctx.fill();
            this._ctx.stroke();
        },
        _drawArrow: function(fromNode, toPosition, handle){
            var toNode;
            if(this._hover){
                toNode = this._hover;
            }else{
                this._arrowEnd.renderedPosition(toPosition);
                toNode = this._arrowEnd;
            }


            if(this._edge){
               this._edge.remove();
            }

            this._edge = this._cy.add({
                group: "edges",
                data: {
                    id: "edge",
                    source: fromNode.id(),
                    target: toNode.id()
                },
                css: $.extend(
                    this._getEdgeCSSByHandle(handle),
                    { opacity: 0.5}
                )
            });

        },
        _clearArrow: function(){
            if(this._edge){
                this._edge.remove();
                this._edge = null;
            }
        },
        _resizeCanvas: function () {
            this._$canvas
                .attr('height', this._$container.height())
                .attr('width', this._$container.width())
                .css({
                    'position': 'absolute',
                    'z-index': '999'
                });
        },
        _mouseDown: function(e) {
            this._hit = this._hitTestHandles(e);

            if(this._hit){
                this._lastClick = Date.now();
                this._dragging = this._hover;
                this._hover = null;
                e.stopImmediatePropagation();
            }
        },
        _mouseUp: function(){
            if(this._hover){
                if(this._hit){
                    var edgeToRemove = this._checkSingleEdge(this._hit.handle, this._dragging);
                    if(edgeToRemove){
                        this._cy.remove("#"+edgeToRemove.id());
                    }
                    var edge = this._cy.add({
                        data: {
                            source: this._dragging.id(),
                            target: this._hover.id(),
                            type: this._hit.handle.type
                        }
                    });
                    this._initEdgeEvents(edge);
                }
            }
            this._dragging = false;
            this._clearArrow();
        },
        _mouseMove: function(e){
            if(this._hover){
                var hit = this._hitTestHandles(e);
                if(hit){
                    $("body").css("cursor", "pointer");
                }else{
                    $("body").css("cursor", "inherit");
                }
            }else{
                $("body").css("cursor", "inherit");
            }

            if(this._dragging && this._hit.handle){
                this._drawArrow(this._dragging, this._getRelativePosition(e), this._hit.handle);
            }

            if(this._nodeClicked){
                this._clear();
            }
        },
        _mouseOver: function (e) {

            if (this._dragging) {
                if (e.cyTarget.id() != this._dragging.id() || this._hit.handle.allowLoop) {
                    this._hover = e.cyTarget;
                }
            } else {
                this._hover = e.cyTarget;
                this._showHandles(this._hover);
            }
        },
        _mouseOut: function(){
            this._clear();
            this._hover = null;
        },
        _removeEdge: function(edge){
            edge.off("mousedown");
            this._cy.remove("#"+edge.id());
        },
        _initEdgeEvents: function(edge){
            var self = this;
            edge.on("mousedown", function(){
                if(self.__lastClick && Date.now() - self.__lastClick < self.DOUBLE_CLICK_INTERVAL ){
                    self._removeEdge(this);
                }
                self.__lastClick = Date.now();
            })
        },
        _hitTestHandles: function(e){
            var mousePoisition = this._getRelativePosition(e);

            if(this._hover){
                var nodeTypeName = this._hover.data().type;
                if(nodeTypeName) {
                    var handles = this._handles[nodeTypeName]?this._handles[nodeTypeName]:this._handles["*"];

                    for(var i in handles){
                        var handle = handles[i];

                        var position = this._getHandlePosition(handle, this._hover);
                        if(VectorMath.distance(position, mousePoisition) < this.HANDLE_SIZE){
                            return {
                                handle: handle,
                                position: position
                            };
                        }
                    }
                }
            }
        },
        _getHandlePosition: function(handle, target){
            var position = target.renderedPosition();
            var width = target.renderedOuterWidth();
            var height = target.renderedOuterHeight();
            var xpos = null;
            var ypos = null;

            switch(handle.positionX){
                case "left":
                    xpos = position.x - width/2 + this.HANDLE_SIZE;
                    break;
                case "right":
                    xpos = position.x + width/2 - this.HANDLE_SIZE;
                    break;
                case "center":
                    xpos = position.x;
                    break;
            }

            switch(handle.positionY){
                case "top":
                    ypos = position.y - height / 2 + this.HANDLE_SIZE;
                    break;
                case "center":
                    ypos = position.y;
                    break;
                case "bottom":
                    ypos = position.y + height /2 - this.HANDLE_SIZE;
                    break;
            }

            return {x: xpos, y: ypos};
        },
        _getEdgeCSSByHandle: function(handle){
            var color = handle.lineColor?handle.lineColor:handle.color;
            return {
                "line-color": color,
                "target-arrow-color": color
            };
        },
        _getHandleByType: function(type){
            for(var i in this._handles){
                var byNodeType = this._handles[i];
                for(var i2 in byNodeType) {
                    var handle = byNodeType[i2];
                    if (handle.type == type) {
                        return handle;
                    }
                }
            }
        },
        _getRelativePosition: function (e) {
            var containerPosition = this._$container.offset();
            return {
                x: e.pageX - containerPosition.left,
                y: e.pageY - containerPosition.top
            }
        },
        _checkSingleEdge: function (handle, node) {

            if(handle.noMultigraph){
                var edges = this._cy.edges("[source='"+this._hover.id()+"'][target='"+node.id()+"'],[source='"+node.id()+"'][target='"+this._hover.id()+"']");

                for(var i = 0; i < edges.length; i++ ){
                    return edges[i];
                }
            }else{

                if(handle.single == false){
                    return;
                }
                var edges = this._cy.edges("[source='"+node.id()+"']");

                for(var i = 0; i < edges.length; i++ ){
                    if(edges[i].data()["type"] == handle.type){
                        return edges[i];
                    }
                }
            }
        },
        _redraw: function(){
            this._clear();
            if(this._hover){
                this._showHandles(this._hover);
            }
        }
    });

})(this);