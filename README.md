# cytoscape-edge-editation
Extension for Cytoscape.js, which adds handle to nodes and allows to create different types of edges


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
    var handles = new CytoscapeEdgeEditation;
    handles.init(cy);
```

Then, you need to register handles to certain node types:

