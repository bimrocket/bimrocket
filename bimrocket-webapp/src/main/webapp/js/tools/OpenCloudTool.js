/* 
 * OpenCloudTool.js
 * 
 * @autor: realor
 */

BIMROCKET.OpenCloudTool = class extends BIMROCKET.IOServiceTool
{
  constructor(application, options)
  {
    super(application);
    this.name = "opencloud";
    this.label = "tool.opencloud.label";
    this.help = "tool.opencloud.help";
    this.className = "opencloud";
    this.setOptions(options);
    
    this.createPanel();

    this._onMouseUp = this.onMouseUp.bind(this);
    this._objectToInsert = null;  
  }

  setupPanel()
  {
    super.setupPanel();

    this.appendCheckbox = document.createElement("input");
    this.appendCheckbox.type = "checkbox";
    this.appendCheckbox.id = this.name + "_" + this.id + "_append";

    this.placeCheckbox = document.createElement("input");
    this.placeCheckbox.type = "checkbox";
    this.placeCheckbox.id = this.name + "_" + this.id + "_place";

    var appendLabel = document.createElement("label");
    appendLabel.innerHTML = "Append";
    appendLabel.setAttribute("for", this.appendCheckbox.id);

    var placeLabel = document.createElement("label");
    placeLabel.innerHTML = "Place";
    placeLabel.setAttribute("for", this.placeCheckbox.id);

    this.optionsBoxElem.appendChild(this.appendCheckbox);
    this.optionsBoxElem.appendChild(appendLabel);
    this.optionsBoxElem.appendChild(this.placeCheckbox);
    this.optionsBoxElem.appendChild(placeLabel);
  };

  activate()
  {
    this.goHome();
    this.panel.visible = true;
    var container = this.application.container;
    container.addEventListener('mouseup', this._onMouseUp, false);
  };

  deactivate()
  {
    this.panel.visible = false;
    var container = this.application.container;
    container.removeEventListener('mouseup', this._onMouseUp, false);
  };

  showButtons(entryName, entryType)
  {
    if (entryName)
    {
      this.openButtonElem.innerHTML = this.openLabel;
      this.openButtonElem.style.display = "inline";
    }
    else
    {
      this.openButtonElem.style.display = "none";    
    }
  }

  processDblClick(entryName, entryType)
  {
    this.openPath(this.basePath + "/" + entryName);
  }

  processObject(result)
  {
    var application = this.application;
    if (this.placeCheckbox.checked)
    {
      this._objectToInsert = result.object;
      this.messageElem.style.display = "block";
      this.serviceElem.style.display = "none";
      this.openButtonElem.style.display = "inline";
      if (!this.appendCheckbox.checked)
      {
        application.initScene();
      }
    }
    else
    {
      if (this.appendCheckbox.checked)
      {
        application.addObject(result.object, application.baseObject);
      }
      else
      {
        application.initScene(result.object);
      }
    }
  }

  onMouseUp(event)
  {
    if (this._objectToInsert !== null)
    {
      var application = this.application;
      var object = this._objectToInsert;
      var mousePosition = this.getMousePosition(event);
      var scene = application.scene;
      var intersect = this.intersect(mousePosition, scene, true);
      if (intersect)
      {
        object.updateMatrix();
        var point = intersect.point;
        var matrix = new THREE.Matrix4();

        var matrixWorld = application.baseObject.matrixWorld;
        matrix.copy(matrixWorld).invert();

        var translation = new THREE.Matrix4();
        translation.makeTranslation(point.x, point.y, point.z);

        matrix.multiply(translation);
        matrix.multiply(object.matrix);
        matrix.decompose(object.position, object.quaternion, object.scale);

        application.addObject(this._objectToInsert, application.baseObject);

        this._objectToInsert = null;
        this.messageElem.style.display = "none";
        this.serviceElem.style.display = "block";
        application.repaint();
      }
    }
  }
};
