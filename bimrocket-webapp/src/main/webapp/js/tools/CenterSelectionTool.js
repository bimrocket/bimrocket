/* 
 * CenterTool.js
 * 
 * @autor: realor
 */

BIMROCKET.CenterSelectionTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "center_selection";
    this.label = "tool.center_selection.label";
    this.help = "tool.center_selection.help";
    this.className = "center_selection";
    this.setOptions(options);

    this.immediate = true;
    this.focusOnSelection = false;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.objects;
    if (objects.length > 0)
    {
      if (this.focusOnSelection)
      {
        application.updateVisibility(application.baseObject, 
          false, false, true);
        application.updateVisibility(objects, true, true, true);
      }
      const container = application.container;
      const aspect = container.clientWidth / container.clientHeight;   
      const camera = application.camera;

      application.scene.updateMatrixWorld(true);
      BIMROCKET.ObjectUtils.zoomAll(camera, objects, aspect);

      let changeEvent = {type: "nodeChanged", object: camera, source : this};
      application.notifyEventListeners("scene", changeEvent);
    }
  }
};
