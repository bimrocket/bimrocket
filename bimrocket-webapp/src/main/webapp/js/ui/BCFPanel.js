/**
 * @author realor
 */
BIMROCKET.BCFPanel = class extends BIMROCKET.Panel
{
  constructor(application)
  {
    super(application);
    this.id = "bcf_panel";
    this.title = "BCF";
    this.position = "left";
    
    this.service = null;

    this.topics = null;
    this.extensions = null;
    this.index = -1;
    this.commentGuid = null;
    this.comments = null;
    this.viewpointGuid = null;
    this.viewpoints = null;

    // search panel
    this.searchPanelElem = document.createElement("div");
    this.searchPanelElem.id = "bcf_search_panel";
    this.searchPanelElem.className = "bcf_panel";
    this.bodyElem.appendChild(this.searchPanelElem);

    // connect panel

    this.connPanelElem = document.createElement("div");
    this.connPanelElem.className = "bcf_body";
    this.searchPanelElem.appendChild(this.connPanelElem);

    this.bcfServiceElem = Controls.addSelectField(this.connPanelElem, 
      "bcfService", "BCF service:", []);
    this.bcfServiceElem.addEventListener("change", 
      event => {
        let name = this.bcfServiceElem.value;
        this.service = this.application.services.bcf[name];
        this.filterPanelElem.style.display = "none";
        this.topicTableElem.style.display = "none";
      });

    this.connButtonsElem = document.createElement("div");
    this.connPanelElem.appendChild(this.connButtonsElem);
    this.connButtonsElem.className = "bcf_buttons";

    this.connectButton = Controls.addButton(this.connButtonsElem,
      "bcfConnect", "Connect", () => this.refreshProjects());
    this.addServiceButton = Controls.addButton(this.connButtonsElem,
      "bcfAdd", "Add", () => this.showAddDialog());
    this.editServiceButton = Controls.addButton(this.connButtonsElem,
      "bcfEdit", "Edit", () => this.showEditDialog());
    this.deleteServiceButton = Controls.addButton(this.connButtonsElem,
      "bcfDelete", "Delete", () => this.showDeleteDialog());

    // filter panel

    this.filterPanelElem = document.createElement("div");
    this.filterPanelElem.className = "bcf_body";
    this.filterPanelElem.style.display = "none";
    this.searchPanelElem.appendChild(this.filterPanelElem);

    this.projectElem = Controls.addSelectField(this.filterPanelElem,
      "bcfProject", "Project:");
    this.projectElem.addEventListener("change", () => this.changeProject());

    this.statusFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfStatusFilter", "Status:");

    this.priorityFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfPriorityFilter", "Priority:");

    this.assignedToFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfAssignedToFilter", "Assigned to:");

    this.filterButtonsElem = document.createElement("div");
    this.filterButtonsElem.className = "bcf_buttons";
    this.filterPanelElem.appendChild(this.filterButtonsElem);

    this.searchTopicsButton = Controls.addButton(this.filterButtonsElem,
      "searchTopics", "Search", () => this.searchTopics());
    this.searchTopicsButton.disabled = true;

    this.setupProjectButton = Controls.addButton(this.filterButtonsElem,
      "setupProject", "Setup", () => this.showProjectSetup());
    this.setupProjectButton.disabled = true;

    this.searchNewTopicButton = Controls.addButton(this.filterButtonsElem,
      "searchNewTopic", "New", () => this.showTopic());
    this.searchNewTopicButton.disabled = true;

    // topic table

    this.topicTableElem = Controls.addTable(this.searchPanelElem,
      "topicTable", ["Idx", "Topic", "Status"], "bcf_topic_table");
    this.topicTableElem.style.display = "none";
    this.searchPanelElem.appendChild(this.topicTableElem);

    // detail panel

    this.detailPanelElem = document.createElement("div");
    this.detailPanelElem.id = "bcf_detail_panel";
    this.detailPanelElem.className = "bcf_panel";
    this.detailPanelElem.style.display = "none";
    this.bodyElem.appendChild(this.detailPanelElem);

    this.detailBodyElem = document.createElement("div");
    this.detailBodyElem.className = "bcf_body";
    this.detailPanelElem.appendChild(this.detailBodyElem);

    this.detailHeaderElem = document.createElement("div");
    this.detailHeaderElem.className = "bcf_topic_nav";
    this.detailBodyElem.appendChild(this.detailHeaderElem);

    this.backButton = Controls.addButton(this.detailHeaderElem,
      "backTopics", "Back", () => this.showTopicList());

    this.topicNavElem = document.createElement("span");
    this.detailHeaderElem.appendChild(this.topicNavElem);

    this.previousTopicButton = Controls.addButton(this.topicNavElem,
      "previousTopic", "<", () => this.showPreviousTopic());

    this.topicSearchIndexElem = document.createElement("span");
    this.topicNavElem.appendChild(this.topicSearchIndexElem);

    this.nextTopicButton = Controls.addButton(this.topicNavElem,
      "nextTopic", ">", () => this.showNextTopic());

    this.detailNewTopicButton = Controls.addButton(this.detailHeaderElem,
      "detailNewTopic", "New", () => this.showTopic());

    this.topicIndexElem = Controls.addTextField(this.detailBodyElem,
      "topic_index", "Index:");
     this.topicIndexElem.setAttribute("readonly", true);

    this.titleElem = Controls.addTextField(this.detailBodyElem,
      "topic_title", "Title:");

    this.topicTypeElem = Controls.addSelectField(this.detailBodyElem,
      "topic_type", "Type:");

    this.priorityElem = Controls.addSelectField(this.detailBodyElem,
      "topic_priority", "Priority:");

    this.topicStatusElem = Controls.addSelectField(this.detailBodyElem,
      "topic_status", "Status:");

    this.stageElem = Controls.addSelectField(this.detailBodyElem,
      "topic_stage", "Stage:");

    this.assignedToElem = Controls.addSelectField(this.detailBodyElem,
      "topic_assigned_to", "Assigned to:");

    this.dueDateElem = Controls.addDateField(this.detailBodyElem,
      "due_date", "Due date:");

    this.descriptionElem = Controls.addTextAreaField(this.detailBodyElem,
      "description", "Description:", null, "bcf_description");

    this.detailButtonsElem = document.createElement("div");
    this.detailButtonsElem.className = "bcf_buttons";
    this.detailBodyElem.appendChild(this.detailButtonsElem);

    this.saveTopicButton = Controls.addButton(this.detailButtonsElem,
      "saveTopic", "Save", () => this.saveTopic());

    this.deleteTopicButton = Controls.addButton(this.detailButtonsElem,
      "deleteTopic", "Delete", () => {
      const dialog = new BIMROCKET.ConfirmDialog("Delete topic",
      "Really want to delete this topic?",
      () => this.deleteTopic(),
      "Delete", "Cancel");
      dialog.show();
    });

    this.tabbedPane = new BIMROCKET.TabbedPane(this.detailPanelElem);
    this.tabbedPane.paneElem.classList.add("bcf_tabs");

    /* comment panel */

    this.commentsPanelElem =
      this.tabbedPane.addTab("comments", "Comments");

    this.commentListElem = document.createElement("ul");
    this.commentListElem.classList = "bcf_list";
    this.commentsPanelElem.appendChild(this.commentListElem);

    this.commentElem = Controls.addTextAreaField(this.commentsPanelElem,
      "comment", "Comment:");
    this.saveCommentButton = Controls.addButton(this.commentsPanelElem,
      "saveComment", "Save", () => this.saveComment());

    /* viewpoints panel */

    this.viewpointsPanelElem =
      this.tabbedPane.addTab("viewpoints", "Viewpoints");

    this.viewpointListElem = document.createElement("ul");
    this.viewpointListElem.classList = "bcf_list";
    this.viewpointsPanelElem.appendChild(this.viewpointListElem);

    this.createViewpointButton = Controls.addButton(this.viewpointsPanelElem,
      "createViewpoint", "Create", () => this.createViewpoint());

    /* links panel */

    this.linksPanelElem = this.tabbedPane.addTab("links", "Links");

    /* audit panel */

    this.auditPanelElem = this.tabbedPane.addTab("audit", "Audit");
    this.auditPanelElem.classList.add("bcf_body");

    this.guidElem = Controls.addTextField(this.auditPanelElem,
      "topic_guid", "GUID:");
     this.guidElem.setAttribute("readonly", true);

    this.creationDateElem = Controls.addTextField(this.auditPanelElem,
      "topic_creation_date", "Creation date:");
     this.creationDateElem.setAttribute("readonly", true);

    this.creationAuthorElem = Controls.addTextField(this.auditPanelElem,
      "topic_creation_author", "Creation author:");
     this.creationAuthorElem.setAttribute("readonly", true);

    this.modifyDateElem = Controls.addTextField(this.auditPanelElem,
      "topic_modify_date", "Modify date:");
     this.modifyDateElem.setAttribute("readonly", true);

    this.modifyAuthorElem = Controls.addTextField(this.auditPanelElem,
      "topic_modify_author", "Modify author:");
     this.modifyAuthorElem.setAttribute("readonly", true);

    // setup panel

    this.setupPanelElem = document.createElement("div");
    this.setupPanelElem.id = "bcf_config_panel";
    this.setupPanelElem.className = "bcf_panel";
    this.setupPanelElem.style.display = "none";
    this.bodyElem.appendChild(this.setupPanelElem);

    this.setupBodyElem = document.createElement("div");
    this.setupBodyElem.className = "bcf_project_setup";
    this.setupPanelElem.appendChild(this.setupBodyElem);

    this.backSetupButton = Controls.addButton(this.setupBodyElem,
      "backSetup", "Back", () => this.showTopicList());

    this.projectNameElem = Controls.addTextField(this.setupBodyElem,
      "project_name", "Project name:");

    this.saveProjectButtonsElem = document.createElement("div");
    this.saveProjectButtonsElem.className = "bcf_buttons";
    this.setupBodyElem.appendChild(this.saveProjectButtonsElem);

    this.saveProjectNameButton = Controls.addButton(this.saveProjectButtonsElem,
      "saveProjectName", "Save", () => this.saveProjectName());

    this.extensionsElem = Controls.addTextAreaField(this.setupBodyElem,
      "extensions_json", "Project extensions:");
    this.extensionsElem.setAttribute("spellcheck", "false");

    this.saveExtensionsButtonsElem = document.createElement("div");
    this.saveExtensionsButtonsElem.className = "bcf_buttons";
    this.setupBodyElem.appendChild(this.saveExtensionsButtonsElem);

    this.saveExtensionsButton = Controls.addButton(
      this.saveExtensionsButtonsElem, "saveExtensions", "Save", 
      () => this.saveProjectExtensions());
  }

  clearTopics()
  {
    this.topicTableElem.tBodies[0].innerHTML = "";
  }

  showTopicList()
  {
    this.searchPanelElem.style.display = "";
    this.detailPanelElem.style.display = "none";
    this.setupPanelElem.style.display = "none";
    if (this.topics === null)
    {
      this.searchTopics();
    }
  }

  showTopic(topic = null, index = -1)
  {
    this.searchPanelElem.style.display = "none";
    this.detailPanelElem.style.display = "";
    this.setupPanelElem.style.display = "none";
    this.deleteTopicButton.disabled = (topic === null);
    this.index = index;

    if (this.topics && index !== -1)
    {
      this.topicSearchIndexElem.innerHTML =
        (index + 1) + " / " + this.topics.length;
      this.previousTopicButton.disabled = index === 0;
      this.nextTopicButton.disabled = index === this.topics.length - 1;
    }
    else
    {
      this.topicSearchIndexElem.innerHTML = "?";
      this.previousTopicButton.disabled = true;
      this.nextTopicButton.disabled = true;
    }

    if (topic)
    {
      this.guidElem.value = topic.guid;
      this.topicIndexElem.value = topic.index;
      this.titleElem.value = topic.title;
      this.descriptionElem.value = topic.description;
      this.dueDateElem.value = this.removeTime(topic.due_date);
      this.creationDateElem.value = this.formatDate(topic.creation_date);
      this.creationAuthorElem.value = topic.creation_author;
      this.modifyDateElem.value = this.formatDate(topic.modify_date);
      this.modifyAuthorElem.value = topic.modify_author;

      Controls.setSelectValue(this.topicTypeElem, topic.topic_type);
      Controls.setSelectValue(this.priorityElem, topic.priority);
      Controls.setSelectValue(this.topicStatusElem, topic.topic_status);
      Controls.setSelectValue(this.stageElem, topic.stage);
      Controls.setSelectValue(this.assignedToElem, topic.assigned_to);
    }
    else
    {
      this.guidElem.value = null;
      this.topicIndexElem.value = null;
      this.titleElem.value = null;
      this.descriptionElem.value = null;
      this.dueDateElem.value = null;
      this.creationDateElem.value = null;
      this.creationAuthorElem.value = null;
      this.modifyDateElem.value = null;
      this.modifyAuthorElem.value = null;

      Controls.setSelectValue(this.topicTypeElem, null);
      Controls.setSelectValue(this.priorityElem, null);
      Controls.setSelectValue(this.topicStatusElem, null);
      Controls.setSelectValue(this.stageElem, null);
      Controls.setSelectValue(this.assignedToElem, null);

      this.commentListElem.innerHTML = "";
      this.viewpointListElem.innerHTML = "";
    }

    if (topic)
    {
      this.tabbedPane.paneElem.style.display = "";
      if (index !== -1)
      {
        this.loadComments();
        this.loadViewpoints(true);
      }
    }
    else
    {
      this.tabbedPane.paneElem.style.display = "none";
    }
    this.commentGuid = null;
    this.commentElem.value = null;
  }

  showPreviousTopic()
  {
    if (this.topics)
    {
      let index = this.index;
      if (index > 0)
      {
        index--;
        this.showTopic(this.topics[index], index);
      }
    }
  }

  showNextTopic()
  {
    if (this.topics)
    {
      let index = this.index;
      if (index >= 0 && index < this.topics.length - 1)
      {
        index++;
        this.showTopic(this.topics[index], index);
      }
    }
  }

  searchTopics()
  {
    let projectId = this.getProjectId();
    if (projectId === null) return;

    let filter = {
      "status" : this.statusFilterElem.value,
      "priority" : this.priorityFilterElem.value,
      "assignedTo" : this.assignedToFilterElem.value
    };
    this.service.getTopics(projectId, filter, topics => 
    {
      this.topics = topics; 
      this.populateTopicTable(); 
    }, this.onError);
  }

  saveTopic()
  {
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    let topic = {
      "title" : this.titleElem.value,
      "topic_type" : this.topicTypeElem.value,
      "priority" : this.priorityElem.value,
      "topic_status" : this.topicStatusElem.value,
      "stage" : this.stageElem.value,
      "assigned_to" : this.assignedToElem.value,
      "description" : this.descriptionElem.value,
      "due_date" : this.addTime(this.dueDateElem.value)
    };
    
    const onCompleted = topic => 
    {
      this.showTopic(topic); 
      this.topics = null;       
      BIMROCKET.Toast.show("Topic saved.");
    };
    
    if (topicGuid) // update
    {
      this.service.updateTopic(projectId, topicGuid, topic, 
        onCompleted, this.onError);
    }
    else // creation
    {
      this.service.createTopic(projectId, topic, onCompleted, this.onError); 
    }
  }

  deleteTopic()
  {
    const onCompleted = () =>
    {
      this.showTopic();
      this.topics = null; // force topic list refresh
      BIMROCKET.Toast.show("Topic deleted.");
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.service.deleteTopic(projectId, topicGuid, onCompleted, 
        this.onError);
    }
  }

  loadComments(scrollBottom)
  {
    const onCompleted = comments =>
    {
      this.comments = comments;
      console.info(comments);
      this.populateCommentList();
      if (scrollBottom)
      {
        this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
      }
    };
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    this.service.getComments(projectId, topicGuid, onCompleted, this.onError);
  }

  saveComment()
  {
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    let comment = 
    {
      "comment" : this.commentElem.value
    };

    const onCompleted = comment => 
    {
      this.commentElem.value = null;
      console.info(comment);
      this.commentGuid = null;
      this.loadComments(true);
      BIMROCKET.Toast.show("Comment saved.");
    };

    if (this.commentGuid) // update
    {
      this.service.updateComment(projectId, topicGuid, this.commentGuid, 
        comment, onCompleted, this.onError);
    }
    else // creation
    {
      this.service.createComment(projectId, topicGuid, comment, 
        onCompleted, this.onError);
    }
  }

  deleteComment(comment)
  {
    const onCompleted = () =>
    {
      this.loadComments();
      BIMROCKET.Toast.show("Comment deleted.");
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.service.deleteComment(projectId, topicGuid, comment.guid, 
        onCompleted, this.onError);
    }
  }

  editComment(comment)
  {
    this.commentGuid = comment.guid;
    this.commentElem.value = comment.comment;
    this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
  }

  loadViewpoints(focusOnFirst)
  {
    const onCompleted = viewpoints =>
    {
      this.viewpoints = viewpoints;
      console.info(viewpoints);
      this.populateViewpointList();
      if (focusOnFirst && viewpoints.length > 0)
      {
        this.showViewpoint(viewpoints[0]);
      }
    };
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    this.service.getViewpoints(projectId, topicGuid, onCompleted, 
      this.onError);
  }

  createViewpoint()
  {
    const viewpoint = {};
    const camera = this.application.camera;
    const matrix = camera.matrixWorld;
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const position = new THREE.Vector3();

    matrix.extractBasis(xAxis, yAxis, zAxis);
    position.setFromMatrixPosition(matrix);

    if (camera instanceof THREE.PerspectiveCamera)
    {
      viewpoint.perspective_camera = {
        "camera_view_point" :
        {"x": position.x, "y" : position.y, "z" : position.z},
        "camera_direction" :
        {"x": zAxis.x, "y" : zAxis.y, "z" : zAxis.z},
        "camera_up_vector" :
        {"x": yAxis.x, "y" : yAxis.y, "z" : yAxis.z},
        "field_of_view" : camera.fov
      };
    }
    else if (camera instanceof THREE.OrthographicCamera)
    {
      viewpoint.orthogonal_camera = {
        "camera_view_point" :
        {"x": position.x, "y" : position.y, "z" : position.z},
        "camera_direction" :
        {"x": zAxis.x, "y" : zAxis.y, "z" : zAxis.z},
        "camera_up_vector" :
        {"x": yAxis.x, "y" : yAxis.y, "z" : yAxis.z},
        "view_to_world_scale" : 0.5 * camera.zoom / camera.right
      };
    }

    const onCompleted = viewpoint =>
    {
      console.info(viewpoint);
      this.loadViewpoints();
      BIMROCKET.Toast.show("Viewpoint saved.");
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    this.service.createViewpoint(projectId, topicGuid, viewpoint, 
      onCompleted, this.onError);
  }

  deleteViewpoint(viewpoint)
  {
    const onCompleted = () =>
    {
      this.loadViewpoints();
      BIMROCKET.Toast.show("Viewpoint deleted.");
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    if (topicGuid)
    {
      this.service.deleteViewpoint(projectId, topicGuid, viewpoint.guid,
        onCompleted, this.onError);
    }
  }

  updateExtensions()
  {
    let projectId = this.getProjectId();
    if (projectId === null) return;

    const onCompleted = extensions =>
    {
      this.extensions = extensions;
      console.info(extensions);
      this.populateExtensions();
    };

    this.service.getExtensions(projectId, onCompleted, this.onError);
  }
  
  refreshProjects()
  {
    const projects = [];

    const onCompleted = serverProjects =>
    {
      this.filterPanelElem.style.display = "";
      this.topicTableElem.style.display = "";
      
      console.info(serverProjects);

      const projectIdSet = new Set();

      for (let serverProject of serverProjects)
      {
        let projectId = serverProject.project_id;
        let projectName = serverProject.name;
        projectIdSet.add(projectId);
        projects.push([projectId, projectName]);
      }

      const scene = this.application.scene;
      scene.traverse(object =>
      {
        if (object._ifc instanceof BIMROCKET.IFC4.IfcProject)
        {
          let projectId = object._ifc.GlobalId;
          let projectName = object._ifc.Name || object._ifc.LongName;
          if (!projectIdSet.has(projectId))
          {
            projects.push([projectId, projectName]);
          }
        }
      });

      Controls.setSelectOptions(this.projectElem, projects);
      const disabled = projects.length === 0;
      this.searchTopicsButton.disabled = disabled;
      this.setupProjectButton.disabled = disabled;
      this.searchNewTopicButton.disabled = disabled;
      if (disabled)
      {
        this.clearTopics();
      }
      this.updateExtensions();
    };

    this.service.getProjects(onCompleted, this.onError);
  }
  
  saveProjectName()
  {
    const projectName = this.projectNameElem.value;
    const index = this.projectElem.selectedIndex;
    const options = this.projectElem.options;
    const oldProjectName = options[index].label;
            
    if (projectName !== oldProjectName)
    {
      const onCompleted = project =>
      {
        console.info(project);
        options[index].label = project.name;
        BIMROCKET.Toast.show("Project saved.");
      };
      
      const projectId = this.getProjectId();
      const project = {
        "name" : projectName
      };
      this.service.updateProject(projectId, project, onCompleted, 
        this.onError);
    }
  }
  
  saveProjectExtensions()
  {
    const extensionsText = this.extensionsElem.value;
    const oldExtensionsText = JSON.stringify(this.extensions, null, 2);

    if (extensionsText !== oldExtensionsText)
    {
      const onCompleted = extensions =>
      {
        this.extensions = extensions;
        console.info(extensions);
        this.populateExtensions();
        BIMROCKET.Toast.show("Project extensions saved.");
      };
      
      try
      {
        let extensions = JSON.parse(extensionsText);
      
        const projectId = this.getProjectId();
        this.service.updateExtensions(projectId, extensions, onCompleted, 
          this.onError);
      }
      catch (ex)
      {
        console.error(ex);
      }
    }
  }

  showViewpoint(viewpoint)
  {
    const application = this.application;
    let position, dir, up, camera;

    if (viewpoint.perspective_camera)
    {
      const pcam = viewpoint.perspective_camera;
      position = pcam.camera_view_point;
      dir = pcam.camera_direction;
      up = pcam.camera_up_vector;
      let fov = pcam.field_of_view;

      camera = this.application.perspectiveCamera;
      camera.fov = fov;
    }
    else
    {
      const ocam = viewpoint.orthogonal_camera;
      position = ocam.camera_view_point;
      dir = ocam.camera_direction;
      up = ocam.camera_up_vector;
      let scale = ocam.view_to_world_scale;

      camera = this.application.orthographicCamera;
      camera.zoom = scale;
      camera.right = 0.5;
      camera.left = -0.5;
      camera.top = 0.1;
      camera.bottom = -0.1;
      camera.near = -100;
      camera.far = 100;
    }
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3(up.x, up.y, up.z);
    const zAxis = new THREE.Vector3(dir.x, dir.y, dir.z);
    xAxis.crossVectors(yAxis, zAxis).normalize();
    yAxis.normalize();
    zAxis.normalize();

    camera.matrix.makeBasis(xAxis, yAxis, zAxis);
    camera.matrix.setPosition(position.x, position.y, position.z);
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

    camera.updateMatrixWorld(true);
    const changeEvent = {type: "nodeChanged",
      objects: [camera], source : this};
    application.notifyEventListeners("scene", changeEvent);

    application.activateCamera(camera);
  }
  
  showProjectSetup()
  {
    this.searchPanelElem.style.display = "none";
    this.detailPanelElem.style.display = "none";
    this.setupPanelElem.style.display = "";
    
    const index = this.projectElem.selectedIndex;
    const options = this.projectElem.options;
    this.projectNameElem.value = options[index].label;
    this.extensionsElem.value = JSON.stringify(this.extensions, null, 2);
  }

  populateTopicTable()
  {
    const topics = this.topics;
    const topicsElem = this.topicTableElem;
    topicsElem.tBodies[0].innerHTML = "";
    for (let i = 0; i < topics.length; i++)
    {
      let topic = topics[i];
      let rowElem = Controls.addTableRow(topicsElem);
      rowElem.children[0].innerHTML = topic.index;
      Controls.addLink(rowElem.children[1], topic.title, "#", null, null, () =>
        { this.showTopic(topic, i); });
      rowElem.children[2].innerHTML = topic.topic_status;
    }
  }

  populateCommentList()
  {
    const comments = this.comments;
    const commentsElem = this.commentListElem;
    commentsElem.innerHTML = "";
    for (let i = 0; i < comments.length; i++)
    {
      let comment = comments[i];
      let itemListElem = document.createElement("li");

      let itemListHeaderElem = document.createElement("div");
      itemListElem.appendChild(itemListHeaderElem);

      let authorDate = comment.author || "anonymous";
      if (comment.date)
      {
        authorDate += " (" + this.formatDate(comment.date) + ")";
      }
      authorDate += ":";

      Controls.addText(itemListHeaderElem, authorDate, "bcf_comment_author");
      Controls.addButton(itemListHeaderElem, "updateComment", "Edit",
         () => this.editComment(comment),
        "bcf_edit_comment");
      Controls.addButton(itemListHeaderElem, "deleteComment", "Delete",
         () => {
           const dialog = new BIMROCKET.ConfirmDialog("Delete comment",
           "Really want to delete this comment?",
           () => this.deleteComment(comment),
           "Delete", "Cancel");
           dialog.show();
         },
        "bcf_delete_comment");

      Controls.addText(itemListElem, comment.comment, "bcf_comment_text");
      commentsElem.appendChild(itemListElem);
    }
  }

  populateViewpointList()
  {
    const viewpoints = this.viewpoints;
    const viewpointsElem = this.viewpointListElem;
    viewpointsElem.innerHTML = "";
    for (let i = 0; i < viewpoints.length; i++)
    {
      let viewpoint = viewpoints[i];
      let itemListElem = document.createElement("li");
      let label = "Viewpoint " + (viewpoint.index || "");
      if (viewpoint.perspective_camera)
      {
        label += " (P)";
      }
      else if (viewpoint.orthogonal_camera)
      {
        label += " (O)";
      }
      Controls.addText(itemListElem, label, "bcf_viewpoint_text");
      Controls.addButton(itemListElem, "showViewpoint", "View",
        () => this.showViewpoint(viewpoint), "bcf_show_viewpoint");

      Controls.addButton(itemListElem, "deleteViewpoint", "Delete",
        () => {
          const dialog = new BIMROCKET.ConfirmDialog("Delete viewpoint",
          "Really want to delete this viewpoint?",
          () => this.deleteViewpoint(viewpoint),
          "Delete", "Cancel");
          dialog.show();
        }, "bcf_delete_viewpoint");

      viewpointsElem.appendChild(itemListElem);
    }
  }

  populateExtensions()
  {
    const ext = this.extensions;

    Controls.setSelectOptions(this.statusFilterElem,
      [""].concat(ext.topic_status));
    Controls.setSelectOptions(this.priorityFilterElem,
      [""].concat(ext.priority));
    Controls.setSelectOptions(this.assignedToFilterElem,
      [""].concat(ext.user_id_type));

    Controls.setSelectOptions(this.topicTypeElem, ext.topic_type);
    Controls.setSelectOptions(this.priorityElem, ext.priority);
    Controls.setSelectOptions(this.topicStatusElem, ext.topic_status);
    Controls.setSelectOptions(this.stageElem, ext.stage);
    Controls.setSelectOptions(this.assignedToElem, ext.user_id_type);    
  }

  getProjectId()
  {
    let projectId = this.projectElem.value;
    if (projectId === "") projectId = null;

    return projectId;
  }

  changeProject()
  {
    this.clearTopics();
    this.updateExtensions();
  }

  formatDate(dateString)
  {
    if (dateString === null || dateString === "") return null;

    const index = dateString.indexOf("T");
    return index === -1 ? dateString :
      dateString.substring(0, index) + " " + dateString.substring(index + 1);
  }

  addTime(dateString)
  {
    if (dateString === null || dateString === "") return null;

    return dateString + "T00:00:00";
  }

  removeTime(dateString)
  {
    if (dateString === null || dateString === "") return null;

    const index = dateString.indexOf("T");
    return dateString.substring(0, index);
  }
  
  onError(error)
  {
    let message = error.message;
    const dialog = new BIMROCKET.MessageDialog("ERROR", message, "error");
    dialog.show();    
  }

  onShow()
  {
    this.updateServices();
  }
  
  updateServices()
  {
    const application = this.application;
    const services = application.services.bcf;
    let options = [];

    for (let name in services)
    {
      let service = services[name];
      options.push([service.name, service.description || service.name]);      
    }
    Controls.setSelectOptions(this.bcfServiceElem, options);

    if (options.length > 0)
    {
      let name = this.bcfServiceElem.value;
      this.service = application.services.bcf[name];
    }
    else
    {
      this.service = null;
    }
    let service = this.service;
    this.connectButton.style.display = service ? "" : "none";
    this.addServiceButton.style.display = "";
    this.editServiceButton.style.display = service ? "" : "none";
    this.deleteServiceButton.style.display = service ? "" : "none";    
  }

  showAddDialog()
  {
    let serviceTypes = ["BCF"];
    let dialog = new BIMROCKET.ServiceDialog("Add BCF service", serviceTypes);
    dialog.serviceTypeSelect.disabled = true;
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      const service = new BIMROCKET.BCFService();
      service.name = name;
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service);
      this.updateServices();
      this.service = service;
      this.bcfServiceElem.value = name;
      this.filterPanelElem.style.display = "none";
      this.topicTableElem.style.display = "none";
    };
    dialog.show();
  }

  showEditDialog()
  {
    if (this.service === null) return;
    
    const service = this.service;    
    let serviceTypes = ["BCF"];
    let dialog = new BIMROCKET.ServiceDialog("Edit BCF service",
      serviceTypes, service.constructor.type, service.name, service.description,
      service.url, service.username, service.password);
    dialog.serviceTypeSelect.disabled = true;
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      service.serviceType = serviceType;
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service);
      this.updateServices();
      this.filterPanelElem.style.display = "none";
      this.topicTableElem.style.display = "none";
    };
    dialog.show();
  }

  showDeleteDialog()
  {
    let name = this.bcfServiceElem.value;
    if (name)
    {
      let dialog = new BIMROCKET.ConfirmDialog("Delete BCF service",
        "Delete service " + name + "?",
        () => {
          const application = this.application;
          let service = application.services.bcf[name];
          application.removeService(service);
          this.updateServices();
          this.filterPanelElem.style.display = "none";
          this.topicTableElem.style.display = "none";
      });
      dialog.show();
    }
  }
};