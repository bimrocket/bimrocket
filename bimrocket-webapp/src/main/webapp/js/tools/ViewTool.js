/*
 * ViewTool.js
 *
 * @autor: realor
 */

BIMROCKET.ViewTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "view";
    this.label = "tool.view.label";
    this.className = "view";
    this.immediate = true;
    this.x = 0; // degrees
    this.y = 0; // degrees
    this.z = 0; // degrees
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    const container = application.container;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = application.camera;
    
    camera.rotation.x = THREE.MathUtils.degToRad(this.x);
    camera.rotation.y = THREE.MathUtils.degToRad(this.y);
    camera.rotation.z = THREE.MathUtils.degToRad(this.z);
    camera.updateMatrix();

    application.scene.updateMatrixWorld(true);
    BIMROCKET.ObjectUtils.zoomAll(camera, application.baseObject, aspect);

    const changeEvent = {type: "nodeChanged", objects: [camera], source : this};
    application.notifyEventListeners("scene", changeEvent);
  }
};



