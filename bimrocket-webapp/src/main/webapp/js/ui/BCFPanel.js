/**
 * BCFPanel.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { ServiceDialog } from "./ServiceDialog.js";
import { MessageDialog } from "./MessageDialog.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Dialog } from "./Dialog.js";
import { TabbedPane } from "./TabbedPane.js";
import { Toast } from "./Toast.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { BCFService } from "../io/BCFService.js";
import * as THREE from "../lib/three.module.js";

class BCFPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "bcf_panel";
    this.title = "BCF";
    this.position = "left";
    this.group = "bcf"; // service group

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
      "bcfService", "bim|label.bcf_service", []);
    this.bcfServiceElem.addEventListener("change",
      event => {
        let name = this.bcfServiceElem.value;
        this.service = this.application.services[this.group][name];
        this.filterPanelElem.style.display = "none";
        this.topicTableElem.style.display = "none";
      });

    this.connButtonsElem = document.createElement("div");
    this.connPanelElem.appendChild(this.connButtonsElem);
    this.connButtonsElem.className = "bcf_buttons";

    this.connectButton = Controls.addButton(this.connButtonsElem,
      "bcfConnect", "button.connect", () => this.refreshProjects());
    this.addServiceButton = Controls.addButton(this.connButtonsElem,
      "bcfAdd", "button.add", () => this.showAddDialog());
    this.editServiceButton = Controls.addButton(this.connButtonsElem,
      "bcfEdit", "button.edit", () => this.showEditDialog());
    this.deleteServiceButton = Controls.addButton(this.connButtonsElem,
      "bcfDelete", "button.delete", () => this.showDeleteDialog());

    // filter panel

    this.filterPanelElem = document.createElement("div");
    this.filterPanelElem.className = "bcf_body";
    this.filterPanelElem.style.display = "none";
    this.searchPanelElem.appendChild(this.filterPanelElem);

    this.projectElem = Controls.addSelectField(this.filterPanelElem,
      "bcfProject", "bim|label.project");
    this.projectElem.addEventListener("change", () => this.changeProject());

    this.statusFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfStatusFilter", "bim|label.status");

    this.priorityFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfPriorityFilter", "bim|label.priority");

    this.assignedToFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfAssignedToFilter", "bim|label.assigned_to");

    this.filterButtonsElem = document.createElement("div");
    this.filterButtonsElem.className = "bcf_buttons";
    this.filterPanelElem.appendChild(this.filterButtonsElem);

    this.searchTopicsButton = Controls.addButton(this.filterButtonsElem,
      "searchTopics", "button.search", () => this.searchTopics());
    this.searchTopicsButton.disabled = true;

    this.setupProjectButton = Controls.addButton(this.filterButtonsElem,
      "setupProject", "button.setup", () => this.showProjectSetup());
    this.setupProjectButton.disabled = true;

    this.searchNewTopicButton = Controls.addButton(this.filterButtonsElem,
      "searchNewTopic", "button.create", () => this.showTopic());
    this.searchNewTopicButton.disabled = true;

    // topic table

    this.topicTableElem = Controls.addTable(this.searchPanelElem,
      "topicTable", ["bim|col.index", "bim|col.topic", "bim|col.status"],
      "bcf_topic_table");
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
      "backTopics", "button.back", () => this.showTopicList());

    this.topicNavElem = document.createElement("span");
    this.detailHeaderElem.appendChild(this.topicNavElem);

    this.previousTopicButton = Controls.addButton(this.topicNavElem,
      "previousTopic", "<", () => this.showPreviousTopic());

    this.topicSearchIndexElem = document.createElement("span");
    this.topicNavElem.appendChild(this.topicSearchIndexElem);

    this.nextTopicButton = Controls.addButton(this.topicNavElem,
      "nextTopic", ">", () => this.showNextTopic());

    this.detailNewTopicButton = Controls.addButton(this.detailHeaderElem,
      "detailNewTopic", "button.create", () => this.showTopic());

    this.topicIndexElem = Controls.addTextField(this.detailBodyElem,
      "topic_index", "bim|label.index");
     this.topicIndexElem.setAttribute("readonly", true);

    this.titleElem = Controls.addTextField(this.detailBodyElem,
      "topic_title", "bim|label.title");

    this.topicTypeElem = Controls.addSelectField(this.detailBodyElem,
      "topic_type", "bim|label.type");

    this.priorityElem = Controls.addSelectField(this.detailBodyElem,
      "topic_priority", "bim|label.priority");

    this.topicStatusElem = Controls.addSelectField(this.detailBodyElem,
      "topic_status", "bim|label.status");

    this.stageElem = Controls.addSelectField(this.detailBodyElem,
      "topic_stage", "bim|label.stage");

    this.assignedToElem = Controls.addSelectField(this.detailBodyElem,
      "topic_assigned_to", "bim|label.assigned_to");

    this.dueDateElem = Controls.addDateField(this.detailBodyElem,
      "due_date", "bim|label.due_date");

    this.descriptionElem = Controls.addTextAreaField(this.detailBodyElem,
      "description", "bim|label.description", null, "bcf_description");

    this.detailButtonsElem = document.createElement("div");
    this.detailButtonsElem.className = "bcf_buttons";
    this.detailBodyElem.appendChild(this.detailButtonsElem);

    this.saveTopicButton = Controls.addButton(this.detailButtonsElem,
      "saveTopic", "button.save", () => this.saveTopic());

    this.deleteTopicButton = Controls.addButton(this.detailButtonsElem,
      "deleteTopic", "button.delete", () =>
      {
        ConfirmDialog.create("bim|title.delete_topic",
          "bim|question.delete_topic")
          .setAction(() => this.deleteTopic())
          .setAcceptLabel("button.delete")
          .setI18N(application.i18n).show();
      });

    this.tabbedPane = new TabbedPane(this.detailPanelElem);
    this.tabbedPane.paneElem.classList.add("bcf_tabs");

    /* viewpoints panel */

    this.viewpointsPanelElem =
      this.tabbedPane.addTab("viewpoints", "bim|tab.viewpoints");

    this.viewpointListElem = document.createElement("ul");
    this.viewpointListElem.classList = "bcf_list";
    this.viewpointsPanelElem.appendChild(this.viewpointListElem);

    this.createViewpointButton = Controls.addButton(this.viewpointsPanelElem,
      "createViewpoint", "button.create", () => this.createViewpoint());

    /* comments panel */

    this.commentsPanelElem =
      this.tabbedPane.addTab("comments", "bim|tab.comments");

    this.commentListElem = document.createElement("ul");
    this.commentListElem.classList = "bcf_list";
    this.commentsPanelElem.appendChild(this.commentListElem);

    this.commentElem = Controls.addTextAreaField(this.commentsPanelElem,
      "comment", "bim|label.comment");
    this.saveCommentButton = Controls.addButton(this.commentsPanelElem,
      "saveComment", "button.save", () => this.saveComment());

    /* links panel */

    this.linksPanelElem = this.tabbedPane.addTab("links", "bim|tab.links");

    /* audit panel */

    this.auditPanelElem = this.tabbedPane.addTab("audit", "bim|tab.audit");
    this.auditPanelElem.classList.add("bcf_body");

    this.guidElem = Controls.addTextField(this.auditPanelElem,
      "topic_guid", "GUID:");
     this.guidElem.setAttribute("readonly", true);

    this.creationDateElem = Controls.addTextField(this.auditPanelElem,
      "topic_creation_date", "bim|label.creation_date");
     this.creationDateElem.setAttribute("readonly", true);

    this.creationAuthorElem = Controls.addTextField(this.auditPanelElem,
      "topic_creation_author", "bim|label.creation_author");
     this.creationAuthorElem.setAttribute("readonly", true);

    this.modifyDateElem = Controls.addTextField(this.auditPanelElem,
      "topic_modify_date", "bim|label.modify_date");
     this.modifyDateElem.setAttribute("readonly", true);

    this.modifyAuthorElem = Controls.addTextField(this.auditPanelElem,
      "topic_modify_author", "bim|label.modify_author");
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
      "backSetup", "button.back", () => this.showTopicList());

    this.projectNameElem = Controls.addTextField(this.setupBodyElem,
      "project_name", "bim|label.project_name");

    this.saveProjectButtonsElem = document.createElement("div");
    this.saveProjectButtonsElem.className = "bcf_buttons";
    this.setupBodyElem.appendChild(this.saveProjectButtonsElem);

    this.saveProjectNameButton = Controls.addButton(this.saveProjectButtonsElem,
      "saveProjectName", "button.save", () => this.saveProjectName());

    this.extensionsElem = Controls.addTextAreaField(this.setupBodyElem,
      "extensions_json", "bim|label.project_extensions");
    this.extensionsElem.setAttribute("spellcheck", "false");

    this.saveExtensionsButtonsElem = document.createElement("div");
    this.saveExtensionsButtonsElem.className = "bcf_buttons";
    this.setupBodyElem.appendChild(this.saveExtensionsButtonsElem);

    this.saveExtensionsButton = Controls.addButton(
      this.saveExtensionsButtonsElem, "saveExtensions", "button.save",
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
    }, error => this.onError(error));
  }

  saveTopic()
  {
    const application = this.application;
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
      Toast.create("bim|message.topic_saved")
        .setI18N(application.i18n).show();
    };

    if (topicGuid) // update
    {
      this.service.updateTopic(projectId, topicGuid, topic,
        onCompleted, error => this.onError(error));
    }
    else // creation
    {
      this.service.createTopic(projectId, topic, onCompleted,
        error => this.onError(error));
    }
  }

  deleteTopic()
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.showTopic();
      this.topics = null; // force topic list refresh
      Toast.create("bim|message.topic_deleted")
        .setI18N(application.i18n).show();
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.service.deleteTopic(projectId, topicGuid, onCompleted,
        error => this.onError(error));
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

    this.service.getComments(projectId, topicGuid, onCompleted,
      error => this.onError(error));
  }

  saveComment()
  {
    const application = this.application;
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
      Toast.create("bim|message.comment_saved")
        .setI18N(application.i18n).show();
    };

    if (this.commentGuid) // update
    {
      this.service.updateComment(projectId, topicGuid, this.commentGuid,
        comment, onCompleted, error => this.onError(error));
    }
    else // creation
    {
      this.service.createComment(projectId, topicGuid, comment,
        onCompleted, error => this.onError(error));
    }
  }

  deleteComment(comment)
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.loadComments();
      Toast.create("bim|message.comment_deleted")
        .setI18N(application.i18n).show();
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.service.deleteComment(projectId, topicGuid, comment.guid,
        onCompleted, error => this.onError(error));
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
      error => this.onError(error));
  }

  createViewpoint()
  {
    const application = this.application;
    const viewpoint = {};
    const camera = application.camera;
    const matrix = camera.matrixWorld;
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const position = new THREE.Vector3();

    matrix.extractBasis(xAxis, yAxis, zAxis);
    position.setFromMatrixPosition(matrix);

    if (camera instanceof THREE.PerspectiveCamera)
    {
      viewpoint.perspective_camera =
      {
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
      viewpoint.orthogonal_camera =
      {
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
      Toast.create("bim|message.viewpoint_saved")
        .setI18N(application.i18n).show();
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    const canvas = this.application.renderer.domElement;
    const imageSource = canvas.toDataURL("image/png");

    let image = imageSource;
    const index = image.indexOf(",");
    if (index !== -1)
    {
      image = image.substring(index + 1);
    }

    viewpoint.snapshot =
    {
      snapshot_type : "png",
      snapshot_data : image
    };

    this.service.createViewpoint(projectId, topicGuid, viewpoint,
      onCompleted, error => this.onError(error));
  }

  deleteViewpoint(viewpoint)
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.loadViewpoints();
      Toast.create("bim|message.viewpoint_deleted")
        .setI18N(application.i18n).show();
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    if (topicGuid)
    {
      this.service.deleteViewpoint(projectId, topicGuid, viewpoint.guid,
        onCompleted, error => this.onError(error));
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

    this.service.getExtensions(projectId, onCompleted,
      error => this.onError(error));
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
        if (object._ifc && object._ifc.constructor.name === "IfcProject")
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

    this.service.getProjects(onCompleted, error => this.onError(error));
  }

  saveProjectName()
  {
    const application = this.application;
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
        Toast.create("bim|message.project_saved")
          .setI18N(application.i18n).show();
      };

      const projectId = this.getProjectId();
      const project = {
        "name" : projectName
      };
      this.service.updateProject(projectId, project, onCompleted,
        error => this.onError(error));
    }
  }

  saveProjectExtensions()
  {
    const application  = this.application;
    const extensionsText = this.extensionsElem.value;
    const oldExtensionsText = JSON.stringify(this.extensions, null, 2);

    if (extensionsText !== oldExtensionsText)
    {
      const onCompleted = extensions =>
      {
        this.extensions = extensions;
        console.info(extensions);
        this.populateExtensions();
        Toast.create("bim|message.project_extensions_saved")
          .setI18N(application.i18n).show();
      };

      try
      {
        let extensions = JSON.parse(extensionsText);

        const projectId = this.getProjectId();
        this.service.updateExtensions(projectId, extensions, onCompleted,
          error => this.onError(error));
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
    for (let comment of comments)
    {
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
      Controls.addButton(itemListHeaderElem, "updateComment", "button.edit",
         () => this.editComment(comment),
        "bcf_edit_comment");
      Controls.addButton(itemListHeaderElem, "deleteComment", "button.delete",
         () =>
         {
           ConfirmDialog.create("bim|title.delete_comment",
             "bim|question.delete_comment")
             .setAction(() => this.deleteComment(comment))
             .setAcceptLabel("button.delete")
             .setI18N(this.application.i18n).show();
         }, "bcf_delete_comment");

      Controls.addText(itemListElem, comment.comment, "bcf_comment_text");
      this.application.i18n.updateTree(itemListElem);
      commentsElem.appendChild(itemListElem);
    }
  }

  populateViewpointList()
  {
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    const viewpoints = this.viewpoints;
    const viewpointsElem = this.viewpointListElem;
    viewpointsElem.innerHTML = "";
    for (let viewpoint of viewpoints)
    {
      let itemListElem = document.createElement("li");
      let vpType = "";
      if (viewpoint.perspective_camera)
      {
        vpType = " (P)";
      }
      else if (viewpoint.orthogonal_camera)
      {
        vpType += " (O)";
      }
      Controls.addTextWithArgs(itemListElem, "bim|message.viewpoint",
        [(viewpoint.index || ""), vpType], "bcf_viewpoint_text");
      Controls.addButton(itemListElem, "showViewpoint", "button.view",
        () => this.showViewpoint(viewpoint), "bcf_show_viewpoint");

      Controls.addButton(itemListElem, "deleteViewpoint", "button.delete",
        () =>
        {
          ConfirmDialog.create("bim|title.delete_viewpoint",
            "bim|question.delete_viewpoint")
            .setAction(() => this.deleteViewpoint(viewpoint))
            .setAcceptLabel("button.delete")
            .setI18N(this.application.i18n).show();
        }, "bcf_delete_viewpoint");
      this.application.i18n.updateTree(itemListElem);

      if (viewpoint.snapshot)
      {
        let type = viewpoint.snapshot.snapshot_type;
        let data = viewpoint.snapshot.snapshot_data;

        let source;
        if (data)
        {
          source = type === "png" ?
            "data:image/png;base64," + data : "data:image/jpeg;base64," + data;
        }
        else
        {
          source = this.service.url + "/bcf/2.1/projects/" + projectId +
          "/topics/" + topicGuid +
          "/viewpoints/" + viewpoint.guid + "/snapshot";
        }

        let linkElem = Controls.addLink(itemListElem, null, "#",
          "bim|label.zoom_image", "viewpoint_snapshot",
          () => this.zoomSnapshot(source));

        let imageElem = document.createElement("img");
        imageElem.className = "viewpoint_snapshot";
        imageElem.src = source;
        linkElem.appendChild(imageElem);
      }
      viewpointsElem.appendChild(itemListElem);
    }
  }

  zoomSnapshot(source)
  {
    const dialog = new Dialog("bim|title.viewpoint");
    dialog.setI18N(this.application.i18n);
    dialog.setClassName("viewpoint_dialog");

    let imageElem = document.createElement("img");
    imageElem.className = "snapshot_zoom";
    imageElem.src = source;
    imageElem.onload = () =>
    {
      const container = this.application.container;

      let imageWidth = imageElem.width;
      let imageHeight = imageElem.height;

      let imageAspectRatio = imageWidth / imageHeight;
      let screenAspectRatio = container.clientWidth / container.clientHeight;

      if (imageAspectRatio > screenAspectRatio)
      {
        let width = container.clientWidth;
        dialog.setSize(width, width / imageAspectRatio + 100);
      }
      else
      {
        let height = container.clientHeight;
        dialog.setSize((height - 100) * imageAspectRatio, height);
      }

      let acceptButton = dialog.addButton("accept", "button.close", () =>
      {
        dialog.hide();
      });

      dialog.onShow = () => acceptButton.focus();

      dialog.show();
    };
    dialog.bodyElem.appendChild(imageElem);
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
    MessageDialog.create("ERROR", message)
      .setClassName("error")
      .setI18N(this.application.i18n).show();
  }

  onShow()
  {
    this.updateServices();
  }

  updateServices()
  {
    const application = this.application;
    const services = application.services[this.group];
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
      this.service = application.services[this.group][name];
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
    let serviceTypes = ServiceManager.getTypesOf(BCFService);
    let dialog = new ServiceDialog("Add BCF service", serviceTypes);
    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      const service = new ServiceManager.classes[serviceType];
      service.name = name;
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service, this.group);
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
    let serviceTypes = ServiceManager.getTypesOf(BCFService);
    let dialog = new ServiceDialog("Edit BCF service",
      serviceTypes, service.constructor.type, service.name, service.description,
      service.url, service.username, service.password);
    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service, this.group);
      this.updateServices();
      this.filterPanelElem.style.display = "none";
      this.topicTableElem.style.display = "none";
    };
    dialog.show();
  }

  showDeleteDialog()
  {
    const application = this.application;
    let name = this.bcfServiceElem.value;
    if (name)
    {
      ConfirmDialog.create("bim|title.delete_bcf_service",
        "bim|question.delete_bcf_service", name)
        .setAction(() =>
        {
          let service = application.services[this.group][name];
          application.removeService(service, this.group);
          this.updateServices();
          this.filterPanelElem.style.display = "none";
          this.topicTableElem.style.display = "none";
        })
       .setAcceptLabel("button.delete")
       .setI18N(application.i18n).show();
    }
  }
}

export { BCFPanel };