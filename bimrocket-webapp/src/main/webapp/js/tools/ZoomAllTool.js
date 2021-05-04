/*
 * ZoomAllTool.js
 *
 * @autor: realor
 */

BIMROCKET.ZoomAllTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "zoom_all";
    this.label = "tool.zoom_all.label";
    this.help = "tool.zoom_all.help";
    this.className = "zoom_all";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    var application = this.application;
    var container = application.container;
    var aspect = container.clientWidth / container.clientHeight;
    var camera = application.camera;

    application.scene.updateMatrixWorld(true);
    BIMROCKET.ObjectUtils.zoomAll(camera, application.baseObject, aspect);

    var changeEvent = {type: "nodeChanged", object: camera, source : this};
    application.notifyEventListeners("scene", changeEvent);
  }
};
