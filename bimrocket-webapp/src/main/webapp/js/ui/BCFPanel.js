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

    this.topics = null;
    this.extensions = null;
    this.index = -1;
    this.commentGuid = null;
    this.comments = null;
    this.viewpointGuid = null;
    this.viewpoints = null;

    const scope = this;

    // search panel
    this.searchPanelElem = document.createElement("div");
    this.searchPanelElem.id = "bcf_search_panel";
    this.searchPanelElem.className = "bcf_panel";
    this.bodyElem.appendChild(this.searchPanelElem);

    // connect panel

    this.connPanelElem = document.createElement("div");
    this.connPanelElem.className = "bcf_body";
    this.searchPanelElem.appendChild(this.connPanelElem);

    this.connUrlElem = Controls.addTextField(this.connPanelElem,
      "bcfConn", "BCF URL:", localStorage.getItem("bimrocket.bcf.url") ||
      "/bimrocket-server/api/");

    this.connUserElem = Controls.addTextField(this.connPanelElem,
      "bcfUser", "Username:", localStorage.getItem("bimrocket.bcf.username"));

    this.connPasswordElem = Controls.addPasswordField(this.connPanelElem,
      "bcfPassword", "Password:", 
      localStorage.getItem("bimrocket.bcf.password"));

    this.connButtonsElem = document.createElement("div");
    this.connPanelElem.appendChild(this.connButtonsElem);
    this.connButtonsElem.className = "bcf_buttons";

    Controls.addButton(this.connButtonsElem,
      "bcfConnect", "Connect", () => scope.refreshProjects());

    // filter panel

    this.filterPanelElem = document.createElement("div");
    this.filterPanelElem.className = "bcf_body";
    this.filterPanelElem.style.display = "none";
    this.searchPanelElem.appendChild(this.filterPanelElem);

    this.projectElem = Controls.addSelectField(this.filterPanelElem,
      "bcfProject", "Project:");
    this.projectElem.addEventListener("change", () => scope.changeProject());

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
      "searchTopics", "Search", () => scope.searchTopics());
    this.searchTopicsButton.disabled = true;

    this.setupProjectButton = Controls.addButton(this.filterButtonsElem,
      "setupProject", "Setup", () => scope.showProjectSetup());
    this.setupProjectButton.disabled = true;

    this.searchNewTopicButton = Controls.addButton(this.filterButtonsElem,
      "searchNewTopic", "New", () => { scope.showTopic(); });
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
      "backTopics", "Back", () => scope.showTopicList());

    this.topicNavElem = document.createElement("span");
    this.detailHeaderElem.appendChild(this.topicNavElem);

    this.previousTopicButton = Controls.addButton(this.topicNavElem,
      "previousTopic", "<", () => scope.showPreviousTopic());

    this.topicSearchIndexElem = document.createElement("span");
    this.topicNavElem.appendChild(this.topicSearchIndexElem);

    this.nextTopicButton = Controls.addButton(this.topicNavElem,
      "nextTopic", ">", () => scope.showNextTopic());

    this.detailNewTopicButton = Controls.addButton(this.detailHeaderElem,
      "detailNewTopic", "New", () => { scope.showTopic(); });

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
      "saveTopic", "Save", () => scope.saveTopic());

    this.deleteTopicButton = Controls.addButton(this.detailButtonsElem,
      "deleteTopic", "Delete", () => {
      const dialog = new BIMROCKET.ConfirmDialog("Delete topic",
      "Really want to delete this topic?",
      () => scope.deleteTopic(),
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
      "saveComment", "Save", () => scope.saveComment());

    /* viewpoints panel */

    this.viewpointsPanelElem =
      this.tabbedPane.addTab("viewpoints", "Viewpoints");

    this.viewpointListElem = document.createElement("ul");
    this.viewpointListElem.classList = "bcf_list";
    this.viewpointsPanelElem.appendChild(this.viewpointListElem);

    this.createViewpointButton = Controls.addButton(this.viewpointsPanelElem,
      "createViewpoint", "Create", () => scope.createViewpoint());

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
      "backSetup", "Back", () => scope.showTopicList());

    this.projectNameElem = Controls.addTextField(this.setupBodyElem,
      "project_name", "Project name:");

    this.saveProjectButtonsElem = document.createElement("div");
    this.saveProjectButtonsElem.className = "bcf_buttons";
    this.setupBodyElem.appendChild(this.saveProjectButtonsElem);

    this.saveProjectNameButton = Controls.addButton(this.saveProjectButtonsElem,
      "saveProjectName", "Save", () => scope.saveProjectName());

    this.extensionsElem = Controls.addTextAreaField(this.setupBodyElem,
      "extensions_json", "Project extensions:");
    this.extensionsElem.setAttribute("spellcheck", "false");

    this.saveExtensionsButtonsElem = document.createElement("div");
    this.saveExtensionsButtonsElem.className = "bcf_buttons";
    this.setupBodyElem.appendChild(this.saveExtensionsButtonsElem);

    this.saveExtensionsButton = Controls.addButton(
      this.saveExtensionsButtonsElem, "saveExtensions", "Save", 
      () => scope.saveProjectExtensions());
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
    const scope = this;
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

    const scope = this;

    function reqListener()
    {
      scope.topics = JSON.parse(oReq.responseText);
      console.info(scope.topics);
      scope.populateTopicTable();
    }    
    let status = this.statusFilterElem.value;
    let priority = this.priorityFilterElem.value;
    let assignedTo = this.assignedToFilterElem.value;
    let filters = [];
    if (status)
    {
      filters.push("topic_status eq '" + status + "'");
    }
    if (priority)
    {
      filters.push("priority eq '" + priority + "'");
    }
    if (assignedTo)
    {
      filters.push("assigned_to eq '" + assignedTo + "'");
    }
    let filter = filters.length > 0 ? filters.join(" and ") : "";
    let orderBy = "creation_date,index";

    let query = "";
    if (filter.length > 0 || orderBy.length > 0)
    {
      query = "?";
      if (filter)
      {
        query += "$filter=" + filter;
        if (orderBy) query += "&";
      }
      if (orderBy) query += "$orderBy=" + orderBy;
    }

    const oReq = this.serverRequest("GET",
      "projects/" + projectId + "/topics" + query, reqListener);
    oReq.send();
  }

  saveTopic()
  {
    const scope = this;

    function reqListener()
    {
      const topic = JSON.parse(oReq.responseText);
      console.info(topic);
      scope.showTopic(topic);
      scope.topics = null; // force topic list refresh
      BIMROCKET.Toast.show("Topic saved.");      
    }
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    var oReq;
    if (topicGuid) // update
    {
      oReq = this.serverRequest("PUT",
        "projects/" + projectId + "/topics/" + topicGuid, reqListener);
    }
    else // creation
    {
      oReq = this.serverRequest("POST", "projects/" + projectId + "/topics",
        reqListener);
    }
    oReq.send(JSON.stringify({
      "title" : this.titleElem.value,
      "topic_type" : this.topicTypeElem.value,
      "priority" : this.priorityElem.value,
      "topic_status" : this.topicStatusElem.value,
      "stage" : this.stageElem.value,
      "assigned_to" : this.assignedToElem.value,
      "description" : this.descriptionElem.value,
      "due_date" : this.addTime(this.dueDateElem.value)
    }));
  }

  deleteTopic()
  {
    const scope = this;

    function reqListener()
    {
      scope.showTopic();
      scope.topics = null; // force topic list refresh
      BIMROCKET.Toast.show("Topic deleted.");
    }

    let projectId = this.getProjectId();
    let guid = this.guidElem.value;
    if (guid)
    {
      const oReq = this.serverRequest("DELETE",
        "projects/" + projectId + "/topics/" + guid, reqListener);
      oReq.send();
    }
  }

  loadComments(scrollBottom)
  {
    const scope = this;

    function reqListener()
    {
      scope.comments = JSON.parse(oReq.responseText);
      console.info(scope.comments);
      scope.populateCommentList();
      if (scrollBottom)
      {
        scope.detailPanelElem.scrollTop = scope.detailPanelElem.scrollHeight;
      }
    }
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    const oReq = this.serverRequest("GET",
      "projects/" + projectId + "/topics/" + topicGuid + "/comments",
      reqListener);
    oReq.send();
  }

  saveComment()
  {
    const scope = this;

    function reqListener()
    {
      scope.commentElem.value = null;
      const comment = JSON.parse(oReq.responseText);
      console.info(comment);
      scope.commentGuid = null;
      scope.loadComments(true);
      BIMROCKET.Toast.show("Comment saved.");
    }
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    var oReq;

    if (this.commentGuid) // update
    {
      oReq = this.serverRequest("PUT",
        "projects/" + projectId + "/topics/" + topicGuid + "/comments/" +
        this.commentGuid, reqListener);
    }
    else // creation
    {
      oReq = this.serverRequest("POST",
        "projects/" + projectId + "/topics/" + topicGuid + "/comments",
        reqListener);
    }
    oReq.send(JSON.stringify({
      "comment" : this.commentElem.value
    }));
  }

  deleteComment(comment)
  {
    const scope = this;

    function reqListener()
    {
      scope.loadComments();
      BIMROCKET.Toast.show("Comment deleted.");
    }

    let projectId = this.getProjectId();
    let guid = this.guidElem.value;
    if (guid)
    {
      const oReq = this.serverRequest("DELETE",
        "projects/" + projectId + "/topics/" + guid +
        "/comments/" + comment.guid, reqListener);
      oReq.send();
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
    const scope = this;

    function reqListener()
    {
      scope.viewpoints = JSON.parse(oReq.responseText);
      console.info(scope.viewpoints);
      scope.populateViewpointList();
      if (focusOnFirst && scope.viewpoints.length > 0)
      {
        scope.showViewpoint(scope.viewpoints[0]);
      }
    }
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    const oReq = this.serverRequest("GET",
      "projects/" + projectId +
      "/topics/" + topicGuid + "/viewpoints", reqListener);

    oReq.send();
  }

  createViewpoint()
  {
    const scope = this;
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

    function reqListener()
    {
      let viewpoint = JSON.parse(oReq.responseText);
      console.info(viewpoint);
      scope.loadViewpoints();
      BIMROCKET.Toast.show("Viewpoint saved.");
    }

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    const oReq = this.serverRequest("POST",
      "projects/" + projectId + "/topics/" + topicGuid + "/viewpoints",
      reqListener);

    oReq.send(JSON.stringify(viewpoint));
  }

  deleteViewpoint(viewpoint)
  {
    const scope = this;

    function reqListener()
    {
      scope.loadViewpoints();
      BIMROCKET.Toast.show("Viewpoint deleted.");
    }

    let projectId = this.getProjectId();
    let guid = this.guidElem.value;

    if (guid)
    {
      const oReq = this.serverRequest("DELETE",
        "projects/" + projectId + "/topics/" + guid +
        "/viewpoints/" + viewpoint.guid, reqListener);
      oReq.send();
    }
  }

  updateExtensions()
  {
    let projectId = this.getProjectId();
    if (projectId === null) return;

    const scope = this;

    function reqListener()
    {
      scope.extensions = JSON.parse(oReq.responseText);
      console.info(scope.extensions);
      scope.populateExtensions();
    }

    const oReq = this.serverRequest("GET",
      "projects/" + projectId + "/extensions", reqListener);

    oReq.send();
  }
  
  refreshProjects()
  {
    const scope = this;
    const projects = [];

    function reqListener()
    {
      localStorage.setItem("bimrocket.bcf.url", scope.connUrlElem.value);
      localStorage.setItem("bimrocket.bcf.username", scope.connUserElem.value);
      localStorage.setItem("bimrocket.bcf.password", 
        scope.connPasswordElem.value);
      
      scope.filterPanelElem.style.display = "";
      scope.topicTableElem.style.display = "";
      
      let serverProjects = JSON.parse(oReq.responseText);
      console.info(serverProjects);

      const projectIdSet = new Set();

      for (let serverProject of serverProjects)
      {
        let projectId = serverProject.project_id;
        let projectName = serverProject.name;
        projectIdSet.add(projectId);
        projects.push([projectId, projectName]);
      }

      const scene = scope.application.scene;
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

      Controls.setSelectOptions(scope.projectElem, projects);
      const disabled = projects.length === 0;
      scope.searchTopicsButton.disabled = disabled;
      scope.setupProjectButton.disabled = disabled;
      scope.searchNewTopicButton.disabled = disabled;
      if (disabled)
      {
        scope.clearTopics();
      }
      scope.updateExtensions();
    }

    const oReq = this.serverRequest("GET", "projects", reqListener);
    oReq.send();
  }
  
  saveProjectName()
  {
    const scope = this;
    const projectName = this.projectNameElem.value;
    const index = this.projectElem.selectedIndex;
    const options = this.projectElem.options;
    const oldProjectName = options[index].label;
            
    if (projectName !== oldProjectName)
    {
      function reqListener()
      {
        const project = JSON.parse(oReq.responseText);
        console.info(project);
        options[index].label = project.name;
      }
      
      const projectId = this.getProjectId();
      const oReq = this.serverRequest("PUT", "projects/" + projectId, 
        reqListener);
      oReq.send(JSON.stringify({
        "name" : projectName
      }));
    }
  }
  
  saveProjectExtensions()
  {
    const scope = this;
    const extensions = this.extensionsElem.value;
    const oldExtensions = JSON.stringify(this.extensions, null, 2);

    if (extensions !== oldExtensions)
    {
      function reqListener()
      {
        scope.extensions = JSON.parse(oReq.responseText);
        console.info(scope.extensions);
        scope.populateExtensions();
      }
      
      const projectId = this.getProjectId();
      const oReq = this.serverRequest("PUT", "projects/" + projectId + 
        "/extensions", reqListener);
      oReq.send(extensions);
    }
  }

  showViewpoint(viewpoint)
  {
    const application = this.application;
    var position, dir, up, camera;

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
    const scope = this;
    const topics = this.topics;
    const topicsElem = this.topicTableElem;
    topicsElem.tBodies[0].innerHTML = "";
    for (let i = 0; i < topics.length; i++)
    {
      let topic = topics[i];
      let rowElem = Controls.addTableRow(topicsElem);
      rowElem.children[0].innerHTML = topic.index;
      Controls.addLink(rowElem.children[1], topic.title, "#", null, null, () =>
        { scope.showTopic(topic, i); });
      rowElem.children[2].innerHTML = topic.topic_status;
    }
  }

  populateCommentList()
  {
    const scope = this;
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
         () => scope.editComment(comment),
        "bcf_edit_comment");
      Controls.addButton(itemListHeaderElem, "deleteComment", "Delete",
         () => {
           const dialog = new BIMROCKET.ConfirmDialog("Delete comment",
           "Really want to delete this comment?",
           () => scope.deleteComment(comment),
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
    const scope = this;
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
        () => scope.showViewpoint(viewpoint), "bcf_show_viewpoint");

      Controls.addButton(itemListElem, "deleteViewpoint", "Delete",
        () => {
          const dialog = new BIMROCKET.ConfirmDialog("Delete viewpoint",
          "Really want to delete this viewpoint?",
          () => scope.deleteViewpoint(viewpoint),
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
    const scope = this;
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

  serverRequest(method, path, listener)
  {
    const oReq = new XMLHttpRequest();
    oReq.open(method, this.connUrlElem.value + "bcf/2.1/" + path);
    if (listener) oReq.addEventListener("load", () =>
    {
      if (oReq.status === 200)
      {
        listener();
      }
      else
      {
        this.showError(oReq);
      }
    });
    oReq.setRequestHeader("Content-Type", "application/json");

    const username = this.connUserElem.value;
    const password = this.connPasswordElem.value;
    if (username)
    {
      const userPass = username + ":" + password;
      oReq.setRequestHeader("Authorization", "Basic " + btoa(userPass));
    }
    return oReq;
  }

  showError(oReq)
  {
    let message;
    try
    {
      message = JSON.parse(oReq.response).message;
    }
    catch (ex)
    {
      message = "Error " + oReq.status;
    }    
    const dialog = new BIMROCKET.MessageDialog("ERROR", message, "error");
    dialog.show();
  }

  onShow()
  {
  }
};