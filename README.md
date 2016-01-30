# cytoscape.js-edge-editation
Extension for Cytoscape.js, which adds handles to nodes and allows to create different types of edges


## Dependencies

Extension was tested with these versions of libraries:

* jQuery 2.1.1
* Cytoscape.js 2.6.0

## Install

Use git clone or direct zip download and unpack archive into your project. Then, simply insert \<script\> tag after
Cytoscape.js and jQuery:

```html
<script src="https://code.jquery.com/jquery-2.2.0.min.js"></script>
<script src="cytoscape.js"></script>
<script src="CytoscapeEdgeEditation.js"></script>
```

## How to use

First, you need to initialize extension. After initializing Cytoscape.js:

```js
var cy = cytoscape({...});
var handles = new CytoscapeEdgeEditation;
handles.init(cy);
```

Then, you need to register handles to certain node types:

```js
handles.registerHandle({
    positionX: "left",          //horizontal position of the handle  (left | center | right)
    positionY: "center",        //vertical position of the handle  (top | center | bottom)
    color: "#48FF00",           //color of the handle 
    type: "some_type",          //stored as data() attribute, can be used for styling            
    single: true,               //wheter only one edge of this type can start from same node (default false) 
    nodeTypeNames: ["type2"]    //which types of nodes will contain this handle
    noMultigraph: false         //whereter two nodes can't be connected with multiple edges (does not consider orientation) 
});

handles.registerHandle({...});
handles.registerHandle({...});
```

Type of node is stored in data section:

```js
cy.add({
    data: { id: 'n4', type: "type2"},
});
```
![Screenshot](http://i.imgbox.com/drCuXQqu.png)
![Screenshot](http://i.imgbox.com/23jr7qPa.png)
