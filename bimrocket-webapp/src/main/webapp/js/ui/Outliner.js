/**
 * @author realor
 */
BIMROCKET.Outliner = class extends BIMROCKET.Panel
{
  constructor(application)
  {
    super(application);
    this.id = "outliner";
    this.title = "Outliner";
    this.position = "right";

    this.selectedLabels = [];
    this.lastSelectedLabel = null;
    this.activeCameraLabel = null;
    this.cutLabels = [];
    
    var scope = this;

    application.addEventListener("selection", function(event)
    {
      scope.updateSelection();
    });

    application.addEventListener("scene", function(event)
    {
      if (event.type === 'cut')
      {
        for (let i = 0; i < scope.cutLabels.length; i++)
        {
          let labelElem = scope.cutLabels[i];
          labelElem._cut = false;
          scope.updateLabelStyle(labelElem);
        }
        scope.cutLabels = [];
        let objects = event.objects;
        for (let i = 0; i < objects.length; i++)
        {
          let object = objects[i];
          let labelId = 'ol-lab-' + object.id;
          let labelElem = document.getElementById(labelId);
          labelElem._cut = true;
          scope.updateLabelStyle(labelElem);
          scope.cutLabels.push(labelElem);
        }
      }
      else if (event.type === 'added')
      {
        let parentListId = 'ol-ul-' + event.parent.id;
        let parentListElem = document.getElementById(parentListId);
        if (parentListElem)
        {
          scope.populateList(event.object, parentListElem);
        }
        else
        {
          let parentItemId = 'ol-li-' + event.parent.id;
          let parentItemElem = document.getElementById(parentItemId);
          parentItemElem.innerHTML = "";
          scope.populateItem(event.parent, parentItemElem);
        }
      }
      else if (event.type === 'removed')
      {
        let itemId = 'ol-li-' + event.object.id;
        let itemElem = document.getElementById(itemId);
        if (itemElem)
        {
          itemElem.parentNode.removeChild(itemElem);
          if (scope.childCount(event.parent) === 0)
          {
            let buttonElemId = 'ol-but-' + event.parent.id;
            let buttonElem = document.getElementById(buttonElemId);
            if (buttonElem)
            {
              buttonElem.parentNode.removeChild(buttonElem);
            }
            let parentListId = 'ol-ul-' + event.parent.id;
            let parentListElem = document.getElementById(parentListId);
            if (parentListElem)
            {
              parentListElem.parentNode.removeChild(parentListElem);
            }
          }
        }
      }
      else if (event.type === 'pasted')
      {
        for (let i = 0; i < scope.cutLabels.length; i++)
        {
          let labelElem = scope.cutLabels[i];
          labelElem._cut = false;
          scope.updateLabelStyle(labelElem);
        }
        if (event.objects.length > 0)
        {
          scope.expandObject(event.objects[0]);
        }
      }
      else if (event.type === 'nodeChanged')
      {
        var object = event.object;
        var labelId = 'ol-lab-' + object.id;
        var labelElem = document.getElementById(labelId);
        if (labelElem !== null)
        {
          scope.updateLabel(labelElem, object);
        }
      }
      else  if (event.type === 'cameraActivated')
      {
        var labelId = 'ol-lab-' + event.object.id;
        var labelElem = document.getElementById(labelId);
        if (labelElem !== scope.activeCameraLabel)
        {
          if (scope.activeCameraLabel !== null)
          {
            scope.activeCameraLabel._activeCamera = false;
            scope.updateLabelStyle(scope.activeCameraLabel);
          }
          labelElem._activeCamera = true;
          scope.updateLabelStyle(labelElem);
          scope.activeCameraLabel = labelElem;
        }
      }
      else if (event.type === 'structureChanged')
      {
        scope.update();
      }
    });

    if (application.scene) this.update();
  }

  update()
  {
    this.bodyElem.innerHTML = "";
    let listElem = document.createElement('ul');
    listElem.className = "outliner";
    this.bodyElem.appendChild(listElem);
    this.populateList(this.application.scene, listElem);
  }

  populateList(object, parentListElem)
  {
    let name = object.name;
    if (name === null || name === undefined || name === '')
      name = 'object-' + object.id;
    if (name.indexOf(BIMROCKET.HIDDEN_PREFIX) !== 0) // not hidden object
    {
      // li
      let itemElem = document.createElement('li');
      itemElem.id = 'ol-li-' + object.id;
      itemElem.className = object.type;
      parentListElem.appendChild(itemElem);

      this.populateItem(object, itemElem);
    }
  }

  populateItem(object, itemElem)
  {
    const scope = this;

    const buttonListener = function(event)
    {
      let buttonElem = event.srcElement || event.target;
      buttonElem.className = (buttonElem.className === 'expand') ? 
        'collapse' : 'expand';
      let id = buttonElem.id.substring(7);
      let elem = document.getElementById("ol-ul-" + id);
      if (elem)
      {
        elem.className = (elem.className === 'expanded') ? 
          'collapsed' : 'expanded';
      }
    };

    const labelListener = function(event)
    {
      var labelElem = event.srcElement || event.target;
      var objectIdString = labelElem.id.substring(7);
      var objectId = parseInt(objectIdString, 10);
      if (isNaN(objectId)) objectId = objectIdString;
      scope.lastSelectedLabel = labelElem;
      scope.selectObjectById(objectId, event.shiftKey);
    };    
    
    let hasChildren = this.childCount(object) > 0;
    // expand/collapse button
    if (hasChildren)
    {
      var buttonId = 'ol-but-' + object.id;
      var buttonElem = document.createElement('button');
      buttonElem.id = buttonId;
      buttonElem.className = 'expand';
      buttonElem.addEventListener('click', buttonListener);
      itemElem.appendChild(buttonElem);
    }

    // label
    let labelElem = document.createElement('span');
    let labelId = 'ol-lab-' + object.id;
    labelElem.id = labelId;
    labelElem._selected = false;
    labelElem._cut = false;
    this.updateLabel(labelElem, object);
    labelElem.addEventListener('click', labelListener);
    itemElem.appendChild(labelElem);

    // children
    if (hasChildren)
    {
      // ul
      let listId = 'ol-ul-' + object.id;
      let listElem = document.createElement('ul');
      listElem.id = listId;
      listElem.className = 'collapsed';
      itemElem.appendChild(listElem);

      for (let i = 0; i < object.children.length; i++)
      {
        let child = object.children[i];
        this.populateList(child, listElem);
      }
    }
  }

  updateSelection()
  {
    // clear selection
    for (let i = 0; i < this.selectedLabels.length; i++)
    {
      let labelElem = this.selectedLabels[i];
      labelElem._selected = false;
      this.updateLabelStyle(labelElem);
    }
    // show new selection
    let selection = this.application.selection;
    let objects = selection.objects;
    this.selectedLabels = [];
    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      let labelId = 'ol-lab-' + object.id;
      let selectedLabel = document.getElementById(labelId);
      if (selectedLabel)
      {
        this.selectedLabels.push(selectedLabel);
        selectedLabel._selected = true;
        this.updateLabelStyle(selectedLabel);
      }
    }
    // scroll and expand last selected object
    if (this.selectedLabels.length > 0)
    {
      let object = objects[objects.length - 1];
      let selectedLabel = this.selectedLabels[this.selectedLabels.length - 1];
      this.expandObject(object);

      if (selectedLabel !== this.lastSelectedLabel)
      {
        selectedLabel.scrollIntoView(false);
        this.bodyElem.scrollLeft = 0;
        this.lastSelectedLabel = selectedLabel;
      }
    }
  }
  
  expandObject(object)
  {
    var curr = object.parent;
    while (curr)
    {
      var id = curr.id;
      var childrenElem = document.getElementById('ol-ul-' + id);
      var buttonElem = document.getElementById('ol-but-' + id);
      childrenElem.className = 'expanded';
      buttonElem.className = 'collapse';
      curr = curr.parent;
    }
  }
    
  selectObjectById(objectId, add = false)
  {
    let application = this.application;
    let object = application.scene.getObjectById(objectId, true);
    if (object)
    {
      if (add)
      {
        application.selection.add(object);        
      }
      else
      {
        application.selection.set(object);        
      }
      this.updateSelection();
    }
    else if (!add)
    {
      application.selection.clear();
      this.updateSelection();
    }
  }
    
  childCount(object)
  {
    var count = 0;
    var children = object.children;
    for (var i = 0; i < children.length; i++)
    {
      var child = children[i];
      if (child.name === null || 
          child.name.indexOf(BIMROCKET.HIDDEN_PREFIX) !== 0) count++;
    }
    return count;
  }
  
  updateLabel(labelElem, object)
  {
    var objectName = object.name;
    if (objectName === null || object.name.trim().length === 0)
    {
      objectName = object.id;
    }
    labelElem.innerHTML = objectName;
    labelElem._visible = object.visible;
    if (object === this.application.camera)
    {
      labelElem._activeCamera = true;
      this.activeCameraLabel = labelElem;
    }
    this.updateLabelStyle(labelElem);    
  }

  updateLabelStyle(labelElem)
  {
    var classNames = [];
    if (labelElem._typeClass)
    {
      classNames.push(labelElem._typeClass);
    }
    if (labelElem._selected)
    {
      classNames.push("selected");
    }
    if (labelElem._activeCamera)
    {
      classNames.push("active_camera");
    }
    if (labelElem._cut)
    {
      classNames.push("cut");
    }
    if (!labelElem._visible)
    {
      classNames.push("hidden");
    }
    labelElem.className = classNames.join(" ");
  }
};
