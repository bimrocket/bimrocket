/* 
 * MeasureDistanceTool.js
 * 
 * @autor: realor
 */

BIMROCKET.MeasureDistanceTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_distance";
    this.label = "tool.measure_distance.label";
    this.help = "tool.measure_distance.help";
    this.className = "measure_distance";
    this.setOptions(options);

    this.points = [];
    this.lineString = null;
    this.material = new THREE.LineBasicMaterial( 
      { linewidth:2, color: new THREE.Color(0x0000ff), opacity: 1, 
      depthTest: false});
    this._onMouseUp = this.onMouseUp.bind(this);
    
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    var helpElem = document.createElement("div");
    helpElem.innerHTML = I18N.get(this.help);
    this.panel.bodyElem.appendChild(helpElem);

    var scope = this;

    var resetButton = document.createElement("button");
    resetButton.innerHTML = "Reset linestring";
    this.panel.bodyElem.appendChild(resetButton);
    resetButton.addEventListener('click', 
      function() {scope.resetLineString();}, false);

    var removeButton = document.createElement("button");
    removeButton.innerHTML = "Remove last point";
    this.panel.bodyElem.appendChild(removeButton);
    removeButton.addEventListener('click', 
      function() {scope.removeLastPoint();}, false);

    this.distElem = document.createElement("div");
    this.distElem.style.textAlign = "left";
    this.distElem.style.padding = "50px";

    this.panel.bodyElem.appendChild(this.distElem);
  }

  activate()
  {
    this.panel.visible = true;
    var container = this.application.container;
    container.addEventListener('mouseup', this._onMouseUp, false);
  }
  
  deactivate()
  {
    this.panel.visible = false;
    var container = this.application.container;
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;
    
    var mousePosition = this.getMousePosition(event);
    var scene = this.application.scene;
    var intersect = this.intersect(mousePosition, scene, true);
    if (intersect)
    {
      var object = intersect.object;
      var point = intersect.point;
      this.points.push(point);

      this.updateLineString();
    }
  }

  resetLineString()
  {
    this.points = [];
    this.updateLineString();
  }

  removeLastPoint()
  {
    this.points.pop();
    this.updateLineString();
  }

  updateLineString()
  {
    var application = this.application;
    var overlays = application.overlays;

    if (this.lineString !== null)
    {
      overlays.remove(this.lineString);
    }
    let vertices = [];
    for (var i = 0; i < this.points.length; i++)
    {
      vertices.push(this.points[i]);
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(vertices);

    this.lineString = new THREE.Line(geometry, this.material, THREE.LineStrip);
    overlays.add(this.lineString);
    application.repaint();

    let distance = (this.getLineStringLength()).toFixed(application.decimals);

    this.distElem.innerHTML = "Distance: " + distance + " " + application.units;
  }

  getLineStringLength()
  {
    var distance = 0;
    for (var i = 0; i < this.points.length - 1; i++)
    {
      var p1 = this.points[i];
      var p2 = this.points[i + 1];
      var v = new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
      distance += v.length();
    }
    return distance;
  }
};