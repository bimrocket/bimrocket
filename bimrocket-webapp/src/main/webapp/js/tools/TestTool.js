/*
 * TestTool.js
 *
 * @autor: realor
 */

BIMROCKET.TestTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "test";
    this.label = "tool.test.label";
    this.help = "tool.test.help";
    this.className = "test";
    this.setOptions(options);

    this.object = null;
    this.mesh = null;
    this.line = null;
    this.noCut = null;
    this.loop = null;
    this.count = 0;
    this._onMouseUp = this.onMouseUp.bind(this);
    
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");

    this.panel.bodyElem.innerHTML = I18N.get(this.help);  
  }

  activate()
  {
    this.panel.visible = true;
    
    var application = this.application;
    var container = application.container;
    
    container.addEventListener('mouseup', this._onMouseUp, false);

    this.object = application.selection.object;
    this.count = 0;
  }

  deactivate()
  {
    this.panel.visible = false;

    var application = this.application;
    var container = application.container;
    
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseUp(event)
  {
    console.info("mouseup");
    if (this.object)
    {
      var application = this.application;
      
      if (this.object.geometry.faces.length > 0)
      {
        if (this.mesh !== null)
        {
          application.removeObject(this.mesh);
        }
        if (this.line !== null)
        {
          application.removeObject(this.line);
        }
        if (this.noCut !== null)
        {
          application.removeObject(this.nocut);
        }
        if (this.loop !== null)
        {
          application.removeObject(this.loop);
        }

        var face = this.object.geometry.faces.get(0);
        var geometry = new THREE.Geometry();
        // add faces to geometry
        var triangulator = BIMROCKET.Triangulator;
        triangulator.init(face);

        if (triangulator.cutVertices.length > 0)
        {
          var lineGeometry = new THREE.Geometry();
          for (var c = 0; c < triangulator.cutVertices.length; c++)
          {
            lineGeometry.vertices.push(triangulator.cutVertices[c]._position);
          }
          var lineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff, linewidth: 4});      

          this.line = new THREE.LineSegment(lineGeometry, lineMaterial);
          this.line.name = "cut_lines";
          this.object.add(this.line);
        }

        if (triangulator.noCutVertices.length > 0)
        {
          var noCutGeometry = new THREE.Geometry();
          for (var c = 0; c < triangulator.noCutVertices.length; c++)
          {
            noCutGeometry.vertices.push(triangulator.noCutVertices[c]._position);
          }
          var noCutMaterial = new THREE.LineBasicMaterial({color: 0xffff00, linewidth: 1});      

          this.noCut = new THREE.LineSegments(noCutGeometry, noCutMaterial);
          this.noCut.name = "no_cut_lines";
          this.object.add(this.noCut);
        }

        var nt = 0;
        var nv = 0;
        while (triangulator.hasMoreTriangles() && nt < this.count)
        {
          var face3V = triangulator.nextTriangle();
          geometry.vertices.push(face3V.getVertex(0)._position);
          geometry.vertices.push(face3V.getVertex(1)._position);
          geometry.vertices.push(face3V.getVertex(2)._position);

          var face3 = new THREE.Face3();
          face3.a = nv;
          face3.b = nv + 1;
          face3.c = nv + 2;
          face3.normal = face._normal;

          geometry.faces.push(face3);

          nv += 3;
          nt++;
        }

        var loopVertices = triangulator.loopVertices[0];
        if (loopVertices.length > 0)
        {
          var loopGeometry = new THREE.Geometry();
          for (var v = 0; v < loopVertices.length; v++)
          {
            loopGeometry.vertices.push(loopVertices[v]._position);
          }
          loopGeometry.vertices.push(loopVertices[0]._position);
          var loopMaterial = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 4});      

          this.loop = new THREE.Line(loopGeometry, loopMaterial, THREE.LineStrip);
          this.loop.name = "loop";
          this.object.add(this.loop);
        }

        var wireframeMaterial = new THREE.MeshPhongMaterial({wireframe: true,
          color: 0x0, polygonOffset: true, polygonOffsetFactor: 1.0, 
          polygonOffsetUnits: 0.5});

        this.mesh = new THREE.Mesh(geometry, wireframeMaterial);
        this.mesh.name = "triang_" + this.count;
        this.object.add(this.mesh);

        application.repaint();
        this.count++;
      }
    }
  }
};
