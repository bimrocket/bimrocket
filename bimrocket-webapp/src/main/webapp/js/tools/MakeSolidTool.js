/*
 * MakeSolidTool.js
 *
 * @autor: realor
 */

BIMROCKET.MakeSolidTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "make_solid";
    this.label = "tool.make_solid.label";
    this.help = "tool.make_solid.help";
    this.className = "make_solid";
    this.setOptions(options);
    this.immediate = true;
  }

  execute()
  {
    var application = this.application;
    var object = application.selection.object;
    if (object instanceof THREE.Mesh)
    {
      var solid = new BIMROCKET.Solid(object.geometry);
      object.matrix.decompose(solid.position, solid.rotation, solid.scale);
      solid.updateMatrix();
      var parent = object.parent;      
      application.removeObject(object);
      application.addObject(solid, parent, false);
      application.selection.set(solid);
    }
    else if (object instanceof BIMROCKET.Solid)
    {
      application.selection.clear();
      object.updateGeometry(object.geometry, true, true, true, true);      
      application.selection.set(object);
    }
  }
};
