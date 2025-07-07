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
import { LoginDialog } from "./LoginDialog.js";
import { Dialog } from "./Dialog.js";
import { TabbedPane } from "./TabbedPane.js";
import { Toast } from "./Toast.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { BCFService } from "../io/BCFService.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class BCFPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "bcf_panel";
    this.title = "BCF";
    this.position = "left";
    this.group = "bcf"; // service group
    this.minimumHeight = 200;

    this.service = null;

    this.topics = null;
    this.extensions = null;
    this.index = -1;
    this.viewpointGuid = null;
    this.viewpoints = null;
    this.commentGuid = null;
    this.comments = null;
    this.docRefs = null;
    this.docRefGuid = null;
    this.projectMap = new Map();

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

    this.typeFilterElem = Controls.addSelectField(this.filterPanelElem,
      "bcfTypeFilter", "bim|label.type");

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

    this.searchNewTopicButton = Controls.addButton(this.filterButtonsElem,
      "searchNewTopic", "button.create", () => this.showTopic());
    this.searchNewTopicButton.disabled = true;

    this.exportButton = Controls.addButton(this.filterButtonsElem,
      "export", "button.export", () => this.exportTopicTable());
    this.exportButton.disabled = true;

    this.setupProjectButton = Controls.addButton(this.filterButtonsElem,
      "setupProject", "button.setup", () => this.showProjectSetup());
    this.setupProjectButton.disabled = true;

    // topic table

    this.topicTableElem = Controls.addTable(this.searchPanelElem,
      "topicTable", ["bim|col.index", "bim|col.topic", "bim|col.status"],
      "data");
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
      "previousTopic", "", () => this.showPreviousTopic());
    this.previousTopicButton.className = "topic_nav_button previous";
    I18N.set(this.previousTopicButton, "title", "button.previous");

    this.topicSearchIndexElem = document.createElement("span");
    this.topicNavElem.appendChild(this.topicSearchIndexElem);

    this.nextTopicButton = Controls.addButton(this.topicNavElem,
      "nextTopic", "", () => this.showNextTopic());
    this.nextTopicButton.className = "topic_nav_button next";
    I18N.set(this.nextTopicButton, "title", "button.next");

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

    this.createdByElem = Controls.addTextField(this.detailBodyElem,
      "topic_created_by", "bim|label.creation_author");
     this.createdByElem.setAttribute("readonly", true);

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
      "createViewpoint", "bim|button.screenshot",
      () => this.createViewpoint());

    this.createViewpointFromFileButton = Controls.addButton(
      this.viewpointsPanelElem, "createViewpointFF", "bim|button.upload_image",
      () => this.createViewpointFromFile());

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
    this.cancelCommentButton = Controls.addButton(this.commentsPanelElem,
      "cancelComment", "button.cancel", () => this.cancelComment());

    /* document reference panel */

    this.docRefsPanelElem =
      this.tabbedPane.addTab("documents", "bim|tab.doc_refs");

    this.docRefListElem = document.createElement("ul");
    this.docRefListElem.classList = "bcf_list";
    this.docRefsPanelElem.appendChild(this.docRefListElem);

    this.docRefUrlElem = Controls.addTextAreaField(this.docRefsPanelElem,
      "docRefUrl", "bim|label.doc_ref_url");
    this.docRefDescElem = Controls.addTextAreaField(this.docRefsPanelElem,
      "docRefDesc", "bim|label.doc_ref_description");
    this.saveDocRefButton = Controls.addButton(this.docRefsPanelElem,
      "saveDocRef", "button.save", () => this.saveDocumentReference());
    this.cancelDocRefButton = Controls.addButton(this.docRefsPanelElem,
      "cancelDocRef", "button.cancel", () => this.cancelDocumentReference());

    /* audit panel */

    this.auditPanelElem = this.tabbedPane.addTab("audit", "bim|tab.audit");
    this.auditPanelElem.classList.add("bcf_body");

    this.guidElem = Controls.addTextField(this.auditPanelElem,
      "topic_guid", "GUID:");
     this.guidElem.setAttribute("readonly", true);

    this.creationDateElem = Controls.addTextField(this.auditPanelElem,
      "topic_creation_date", "bim|label.creation_date");
     this.creationDateElem.setAttribute("readonly", true);

    // Añadir este bloque nuevo para mostrar los IDs seleccionados
    this.selectedComponentsElem = document.createElement("div");
    this.selectedComponentsElem.className = "selected_components";
    this.auditPanelElem.appendChild(this.selectedComponentsElem);

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

    this.projectSetupElem = document.createElement("div");
    this.projectSetupElem.className = "bcf_project_setup";
    this.setupPanelElem.appendChild(this.projectSetupElem);

    this.extensionsSetupElem = document.createElement("div");
    this.extensionsSetupElem.className = "bcf_extensions_setup";
    this.setupPanelElem.appendChild(this.extensionsSetupElem);

    this.backSetupButton = Controls.addButton(this.projectSetupElem,
      "backSetup", "button.back", () => this.showTopicList());

    this.projectNameElem = Controls.addTextField(this.projectSetupElem,
      "project_name", "bim|label.project_name");

    this.projectButtonsElem = document.createElement("div");
    this.projectButtonsElem.className = "bcf_buttons";
    this.projectSetupElem.appendChild(this.projectButtonsElem);

    this.saveProjectButton = Controls.addButton(this.projectButtonsElem,
      "saveProject", "button.save", () => this.saveProject());

    this.deleteProjectButton = Controls.addButton(this.projectButtonsElem,
      "deleteProject", "button.delete", () => {
       ConfirmDialog.create("bim|title.delete_project",
         "bim|question.delete_project")
         .setAction(() => this.deleteProject())
         .setAcceptLabel("button.delete")
         .setI18N(this.application.i18n).show();
      });

    this.extensionsView = Controls.addCodeEditor(this.extensionsSetupElem,
      "extensions_json", "bim|label.project_extensions", "",
      { "language" : "json", "height" : "200px" });
    this.extensionsView.dom.parentElement.parentElement.style.flexGrow = "1";

    this.saveExtensionsButtonsElem = document.createElement("div");
    this.saveExtensionsButtonsElem.className = "bcf_buttons";
    this.extensionsSetupElem.appendChild(this.saveExtensionsButtonsElem);

    this.saveExtensionsButton = Controls.addButton(
      this.saveExtensionsButtonsElem, "saveExtensions", "bim|button.save_extensions",
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
    this.searchTopics();
  }

  showTopic(topic = null, index = -1)
  {
    // index == -1 when topic was created or udpated
    this.searchPanelElem.style.display = "none";
    this.detailPanelElem.style.display = "";
    this.setupPanelElem.style.display = "none";
    this.tabbedPane.paneElem.style.display = "none";

    if (topic === null || index !== -1)
    {
      this.viewpointListElem.innerHTML = "";
      this.commentListElem.innerHTML = "";
      this.docRefListElem.innerHTML = "";
    }

    this.deleteTopicButton.disabled = (topic === null);
    this.index = index;

    if (this.topics && index !== -1)
    {
      this.topicSearchIndexElem.textContent =
        (index + 1) + " / " + this.topics.length;
      this.previousTopicButton.disabled = index === 0;
      this.nextTopicButton.disabled = index === this.topics.length - 1;
    }
    else
    {
      this.topicSearchIndexElem.textContent = "?";
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
      this.createdByElem.value = topic.creation_author;
      this.creationAuthorElem.value = topic.creation_author;
      this.modifyDateElem.value = this.formatDate(topic.modify_date);
      this.modifyAuthorElem.value = topic.modify_author;

      Controls.setSelectValue(this.topicTypeElem, topic.topic_type);
      Controls.setSelectValue(this.priorityElem, topic.priority);
      Controls.setSelectValue(this.topicStatusElem, topic.topic_status);
      Controls.setSelectValue(this.stageElem, topic.stage);
      Controls.setSelectValue(this.assignedToElem, topic.assigned_to);

      this.tabbedPane.paneElem.style.display = "";

      if (index !== -1)
      {
        this.loadComments(false,
          () => this.loadViewpoints(false,
          () => this.loadDocumentReferences(false)));
      }
    }
    else
    {
      this.guidElem.value = null;
      this.topicIndexElem.value = null;
      this.titleElem.value = null;
      this.descriptionElem.value = null;
      this.dueDateElem.value = null;
      this.creationDateElem.value = null;
      this.createdByElem.value = null;
      this.creationAuthorElem.value = null;
      this.modifyDateElem.value = null;
      this.modifyAuthorElem.value = null;

      Controls.setSelectValue(this.topicTypeElem, null);
      Controls.setSelectValue(this.priorityElem, null);
      Controls.setSelectValue(this.topicStatusElem, null);
      Controls.setSelectValue(this.stageElem, null);
      Controls.setSelectValue(this.assignedToElem, null);
    }

    this.commentGuid = null;
    this.commentElem.value = null;
    this.docRefGuid = null;
    this.docRefUrlElem.value = null;
    this.docRefDescElem.value = null;
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
    this.exportButton.disabled = false;
    let projectId = this.getProjectId();
    if (projectId === null) return;

    const onCompleted = topics =>
    {
      this.hideProgressBar();
      this.topics = topics;
      this.populateTopicTable();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.searchTopics());
    };

    let filter = {
      "topic_type" : this.typeFilterElem.value,
      "topic_status" : this.statusFilterElem.value,
      "priority" : this.priorityFilterElem.value,
      "assigned_to" : this.assignedToFilterElem.value
    };
    this.showProgressBar();
    this.service.getTopics(projectId, filter, onCompleted, onError);
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
      console.info(topic);
      this.hideProgressBar();
      this.showTopic(topic, this.index);
      if (this.topics && this.index >= 0)
      {
        this.topics[this.index] = topic;
      }
      Toast.create("bim|message.topic_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.saveTopic());
    };

    this.showProgressBar();
    if (topicGuid) // update
    {
      this.service.updateTopic(projectId, topicGuid, topic,
        onCompleted, onError);
    }
    else // creation
    {
      this.service.createTopic(projectId, topic, onCompleted, onError);
    }
  }

  deleteTopic()
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.hideProgressBar();
      this.showTopic();
      this.topics = null; // force topic list refresh
      Toast.create("bim|message.topic_deleted")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.deleteTopic());
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.showProgressBar();
      this.service.deleteTopic(projectId, topicGuid, onCompleted, onError);
    }
  }

  loadViewpoints(scrollBottom, onSuccess)
  {
    const onCompleted = viewpoints =>
    {
      this.hideProgressBar();
      this.viewpoints = viewpoints;
      this.populateViewpointList();
      if (scrollBottom)
      {
        this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
      }
      if (onSuccess) onSuccess();
    };

    const onError = error =>
    {
      this.handleError(error,
        () => this.loadViewpoints(scrollBottom, onSuccess));
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    this.showProgressBar();
    this.service.getViewpoints(projectId, topicGuid, onCompleted, onError);
  }

  createViewpoint(imageURL = null)
  {
    const application = this.application;
    const viewpoint = {};
    const camera = application.camera;
    const matrix = camera.matrixWorld;
    console.log(THREE)
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const position = new THREE.Vector3();

    matrix.extractBasis(xAxis, yAxis, zAxis);
    position.setFromMatrixPosition(matrix);

    const basePos = application.baseObject.position;
    position.sub(basePos);

    const selection = bimrocket.selection.objects || [bimrocket.selection.object].filter(Boolean);
    const globalIds = selection
      .map(obj => obj?.userData?.IFC?.GlobalId)
      .filter(Boolean)
      .map(globalId => ({ ifc_guid: globalId }));

    if (globalIds.length > 0) 
    {
      viewpoint.components = 
      { 
        selection: globalIds 
      };
    }
    
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
      this.hideProgressBar();
      console.log(viewpoint)
      this.loadViewpoints(true);
      Toast.create("bim|message.viewpoint_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.createViewpoint(imageURL));
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    if (imageURL === null)
    {
      // capture image from canvas
      const canvas = this.application.renderer.domElement;
      imageURL = canvas.toDataURL("image/png");
    }

    let format = null;

    if (imageURL.startsWith("data:image/jpeg;base64,"))
    {
      format = "jpeg";
    }
    else if (imageURL.startsWith("data:image/png;base64,"))
    {
      format = "png";
    }
    if (format)
    {
      const index = imageURL.indexOf(",");
      let image = imageURL.substring(index + 1);

      viewpoint.snapshot =
      {
        snapshot_type : format,
        snapshot_data : image
      };

      this.showProgressBar();
      this.service.createViewpoint(projectId, topicGuid, viewpoint,
        onCompleted, onError);
    }
    else
    {
      this.handleError({ code : 0, message : "Unsupported image format" });
    }
  }

  createViewpointFromFile()
  {
    const onChange = () =>
    {
      let files = this.inputFile.files;
      if (files.length > 0)
      {
        let file = files[0];
        let reader = new FileReader();
        reader.onload = () =>
        {
          let imageURL = reader.result;
          this.createViewpoint(imageURL);
        };
        reader.readAsDataURL(file);
      }
    };

    let inputFile = document.createElement("input");
    this.inputFile = inputFile;

    inputFile.type = "file";
    inputFile.id = this.name + "_file";

    inputFile.accept = ".jpeg, .jpg, .png";
    inputFile.addEventListener("change", onChange, false);

    inputFile.click();
  }

  deleteViewpoint(viewpoint)
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.hideProgressBar();
      this.loadViewpoints();
      Toast.create("bim|message.viewpoint_deleted")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.deleteViewpoint(viewpoint));
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    if (topicGuid)
    {
      this.showProgressBar();
      this.service.deleteViewpoint(projectId, topicGuid, viewpoint.guid,
        onCompleted, onError);
    }
  }

  loadComments(scrollBottom, onSuccess)
  {
    const onCompleted = comments =>
    {
      this.hideProgressBar();
      this.comments = comments;
      this.populateCommentList();
      if (scrollBottom)
      {
        this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
      }
      if (onSuccess) onSuccess();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.loadComments(scrollBottom, onSuccess));
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    this.showProgressBar();
    this.service.getComments(projectId, topicGuid, onCompleted, onError);
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
      this.hideProgressBar();
      this.commentElem.value = null;
      this.commentGuid = null;
      this.loadComments(true);
      Toast.create("bim|message.comment_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.saveComment());
    };

    this.showProgressBar();
    if (this.commentGuid) // update
    {
      this.service.updateComment(projectId, topicGuid, this.commentGuid,
        comment, onCompleted, onError);
    }
    else // creation
    {
      this.service.createComment(projectId, topicGuid, comment,
        onCompleted, onError);
    }
  }

  deleteComment(comment)
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.hideProgressBar();
      this.loadComments();
      Toast.create("bim|message.comment_deleted")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.deleteComment());
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.showProgressBar();
      this.service.deleteComment(projectId, topicGuid, comment.guid,
        onCompleted, onError);
    }
  }

  editComment(comment)
  {
    this.commentGuid = comment.guid;
    this.commentElem.value = comment.comment;
    this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
  }

  cancelComment()
  {
    this.commentGuid = null;
    this.commentElem.value = null;
    this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
  }

  loadDocumentReferences(scrollBottom, onSuccess)
  {
    const onCompleted = docRefs =>
    {
      this.hideProgressBar();
      this.docRefs = docRefs;
      this.populateDocumentReferenceList();
      if (scrollBottom)
      {
        this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
      }
      if (onSuccess) onSuccess();
    };

    const onError = error =>
    {
      this.handleError(error,
        () => this.loadDocumentReferences(scrollBottom, onSuccess));
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;

    this.showProgressBar();
    this.service.getDocumentReferences(projectId, topicGuid,
      onCompleted, onError);
  }

  saveDocumentReference()
  {
    const application = this.application;
    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    let docRef =
    {
      "url" : this.docRefUrlElem.value,
      "description" : this.docRefDescElem.value
    };

    const onCompleted = docRef =>
    {
      this.hideProgressBar();
      this.docRefUrlElem.value = null;
      this.docRefDescElem.value = null;
      this.docRefGuid = null;
      this.loadDocumentReferences(true);
      Toast.create("bim|message.doc_ref_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.saveDocumentReference());
    };

    this.showProgressBar();
    if (this.docRefGuid) // update
    {
      this.service.updateDocumentReference(projectId, topicGuid,
        this.docRefGuid, docRef, onCompleted, onError);
    }
    else // creation
    {
      this.service.createDocumentReference(projectId, topicGuid, docRef,
        onCompleted, onError);
    }
  }

  editDocumentReference(docRef)
  {
    this.docRefGuid = docRef.guid;
    this.docRefUrlElem.value = docRef.url;
    this.docRefDescElem.value = docRef.description;
    this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
  }

  cancelDocumentReference()
  {
    this.docRefGuid = null;
    this.docRefUrlElem.value = null;
    this.docRefDescElem.value = null;
    this.detailPanelElem.scrollTop = this.detailPanelElem.scrollHeight;
  }

  deleteDocumentReference(docRef)
  {
    const application = this.application;
    const onCompleted = () =>
    {
      this.hideProgressBar();
      this.loadDocumentReferences();
      Toast.create("bim|message.doc_ref_deleted")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.deleteDocumentReference(docRef));
    };

    let projectId = this.getProjectId();
    let topicGuid = this.guidElem.value;
    if (topicGuid)
    {
      this.showProgressBar();
      this.service.deleteDocumentReference(projectId, topicGuid, docRef.guid,
        onCompleted, onError);
    }
  }

  refreshExtensions()
  {
    let projectId = this.getProjectId();
    if (projectId === null) return;

    const onCompleted = extensions =>
    {
      this.hideProgressBar();
      this.extensions = extensions;
      this.populateExtensions();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.refreshExtensions());
    };

    this.showProgressBar();
    this.service.getExtensions(projectId, onCompleted, onError);
  }

  refreshProjects()
  {
    const onCompleted = serverProjects =>
    {
      this.hideProgressBar();
      this.filterPanelElem.style.display = "";
      this.topicTableElem.style.display = "";

      const projectMap = this.projectMap;
      projectMap.clear();

      // add loaded projects first
      const children = this.application.baseObject.children;
      for (let object of children)
      {
        if (object.userData.IFC?.ifcClassName === "IfcProject")
        {
          const ifc = object.userData.IFC;
          let projectId = ifc.GlobalId;
          let projectName = ifc.Name || ifc.LongName || object.name;
          let project = {
            id: projectId,
            name : projectName,
            persistent : false,
            visible : true
          };
          projectMap.set(projectId, project);
        }
      }

      for (let serverProject of serverProjects)
      {
        let projectId = serverProject.project_id;
        let projectName = serverProject.name;
        let project = projectMap.get(projectId);
        if (project)
        {
          project.name = projectName; // take project name from database
          project.persistent = true;
        }
        else
        {
          project = {
            id: projectId,
            name : projectName,
            persistent: true,
            visible : false
          };
          projectMap.set(projectId, project);
        }
      }

      const options = [];
      projectMap.forEach((project, projectId) =>
      {
        let name = project.name + " [";
        if (project.persistent) name += "P";
        if (project.visible) name += "V";
        name += "]";

        options.push([projectId, name]);
      });
      Controls.setSelectOptions(this.projectElem, options);

      this.updateFilterControls();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.refreshProjects());
    };

    this.clearTopics();
    this.showProgressBar();
    this.service.getProjects(onCompleted, onError);
  }

  saveProject()
  {
    const application = this.application;
    const projectName = this.projectNameElem.value;
    const index = this.projectElem.selectedIndex;
    const options = this.projectElem.options;

    const onCompleted = project =>
    {
      this.hideProgressBar();
      Toast.create("bim|message.project_saved")
        .setI18N(application.i18n).show();
      this.refreshProjects();
//      this.showTopicList();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.saveProject());
    };

    const projectId = this.getProjectId();
    const project = {
      "name" : projectName
    };
    this.showProgressBar();
    this.service.updateProject(projectId, project, onCompleted, onError);
  }

  deleteProject()
  {
    const application = this.application;

    const onCompleted = () =>
    {
      this.hideProgressBar();
      Toast.create("bim|message.project_deleted")
        .setI18N(application.i18n).show();
      this.refreshProjects();
      this.showTopicList();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.deleteProject());
    };

    const projectId = this.getProjectId();
    this.showProgressBar();
    this.service.deleteProject(projectId, onCompleted, onError);
  }

  saveProjectExtensions()
  {
    const application  = this.application;
    const extensionsText = this.extensionsView.state.doc.toString();

    const onCompleted = extensions =>
    {
      this.hideProgressBar();
      this.extensions = extensions;
      this.populateExtensions();
      Toast.create("bim|message.project_extensions_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.saveProjectExtensions());
    };

    try
    {
      let extensions = JSON.parse(extensionsText);

      const projectId = this.getProjectId();
      this.showProgressBar();
      this.service.updateExtensions(projectId, extensions,
        onCompleted, onError);
    }
    catch (ex)
    {
      this.handleError(ex, () => this.saveProjectExtensions());
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
      camera.near = -5000;
      camera.far = 5000;
    }
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3(up.x, up.y, up.z);
    const zAxis = new THREE.Vector3(dir.x, dir.y, dir.z);
    xAxis.crossVectors(yAxis, zAxis).normalize();
    yAxis.normalize();
    zAxis.normalize();

    const basePos = application.baseObject.position;
    const cameraPos = new THREE.Vector3();

    if (position)
    {
      cameraPos.x = position.x;
      cameraPos.y = position.y;
      cameraPos.z = position.z;
    }

    cameraPos.add(basePos);

    camera.matrix.makeBasis(xAxis, yAxis, zAxis);
    camera.matrix.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

    camera.updateMatrixWorld(true);
    application.notifyObjectsChanged(camera, this);
    application.activateCamera(camera);
  }

  showProjectSetup()
  {
    this.searchPanelElem.style.display = "none";
    this.detailPanelElem.style.display = "none";
    this.setupPanelElem.style.display = "";

    const projectId = this.projectElem.value;
    this.projectNameElem.value = this.projectMap.get(projectId).name;

    const json = JSON.stringify(this.extensions, null, 2);

    const state = this.extensionsView.state;
    const tx = state.update(
      { changes: { from: 0, to: state.doc.length, insert: json } });
    this.extensionsView.dispatch(tx);
  }

  populateTopicTable()
  {
    const topics = this.topics;
    const topicsElem = this.topicTableElem;
    topicsElem.tBodies[0].innerHTML = "";
    if (topics.length === 0) {
      this.exportButton.disabled = true;
      let rowElem = topicsElem.tBodies[0].insertRow();
      let cell = rowElem.insertCell(0);
      cell.colSpan = 3;
      I18N.set(cell, "textContent", "bim|message.topic_searched");
      this.application.i18n.update(cell);
      cell.style.textAlign = "center";
      return;
    }
    for (let i = 0; i < topics.length; i++)
    {
      let topic = topics[i];
      let rowElem = Controls.addTableRow(topicsElem);

      const openTopic = () => { this.showTopic(topic, i); };

      Controls.addLink(rowElem.children[0], topic.index, "#", null, null,
        openTopic);
      Controls.addLink(rowElem.children[1], topic.title, "#", null, null,
        openTopic);
      rowElem.children[2].textContent = topic.topic_status;
    }
  }

  exportTopicTable()
  {
    if (!this.topics) {
      console.warn("No topics available to export.");
      return;
    }

    const selectedProjectId = this.projectElem?.value;

    const topics = this.topics;
    if (topics.length === 0) {
      console.warn("No topics to export for the selected project.");
      return;
    }

    let csvContent = "Index;Title;Type;Priority;Status;Stage;Creation Author;Assigned To;Due Date;Description\n";

    topics.forEach(topic => {
      let row = `${topic.index};"${topic.title}";${topic.topic_type};${topic.priority};${topic.topic_status};${topic.stage};"${topic.creation_author}";"${topic.assigned_to}";${topic.due_date};"${topic.description}"`;
      csvContent += row + "\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    let linkElem = document.createElement("a");
    linkElem.download = `topics_${selectedProjectId}.csv`;
    linkElem.href = url;
    linkElem.style.display = "none";
    document.body.appendChild(linkElem);
    linkElem.click();
    document.body.removeChild(linkElem);
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

      let spanElem = document.createElement("span");
      spanElem.className = "icon comment";
      itemListHeaderElem.appendChild(spanElem);

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

  populateDocumentReferenceList()
  {
    const docRefs = this.docRefs;
    const docRefsElem = this.docRefListElem;
    docRefsElem.innerHTML = "";
    for (let docRef of docRefs)
    {
      let itemListElem = document.createElement("li");

      let spanElem = document.createElement("span");
      spanElem.className = "icon doc_ref";
      itemListElem.appendChild(spanElem);

      let linkElem = document.createElement("a");
      linkElem.href = docRef.url;
      linkElem.target = "_blank";
      linkElem.textContent = docRef.description;
      itemListElem.appendChild(linkElem);

      Controls.addButton(itemListElem, "updateDocRef", "button.edit",
         () => this.editDocumentReference(docRef),
        "bcf_edit_doc_ref");
      Controls.addButton(itemListElem, "deleteDocRef", "button.delete",
         () =>
         {
           ConfirmDialog.create("bim|title.delete_doc_ref",
             "bim|question.delete_doc_ref")
             .setAction(() => this.deleteDocumentReference(docRef))
             .setAcceptLabel("button.delete")
             .setI18N(this.application.i18n).show();
         }, "bcf_delete_doc_ref");

      this.application.i18n.updateTree(itemListElem);
      docRefsElem.appendChild(itemListElem);
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

      // Contenedor principal para el viewpoint
      let viewpointContainer = document.createElement("div");
      viewpointContainer.className = "viewpoint-container";
      itemListElem.appendChild(viewpointContainer);

      let spanElem = document.createElement("span");
      spanElem.className = "icon viewpoint";
      itemListElem.appendChild(spanElem);

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

      // llistat Ids
      if (viewpoint.components && viewpoint.components.selection) {
        let componentsContainer = document.createElement("div");
        componentsContainer.className = "components-container";
        
        let componentsLabel = document.createElement("div");
        componentsLabel.textContent = "Ids dels components:";
        componentsContainer.appendChild(componentsLabel);
        
        let componentsList = document.createElement("ul");
        componentsList.className = "components-list";
        
        // viewpoint.components.selection.forEach(component => {
        //   let componentItem = document.createElement("li");
        //   componentItem.textContent = component.ifc_guid || "No GUID";
        //   componentsList.appendChild(componentItem);
        // });

        viewpoint.components.selection.forEach(component => {
          let componentItem = document.createElement("li");
          componentItem.textContent = component.ifc_guid || "No GUID";
          
          componentItem.style.cursor = "pointer";
          componentItem.style.textDecoration = "underline";
          componentItem.style.color = "#0066cc";
          
          componentItem.addEventListener("click", async (event) => {
            event.stopPropagation();
            if (viewpoint.components && viewpoint.components.selection) {
              const firstComponent = viewpoint.components.selection[0];
              if (firstComponent && firstComponent.ifc_guid) {
                
                if (bimrocket.selection.selectObject) {
                  bimrocket.selection.selectObject({
                    userData: {
                      IFC: {
                        GlobalId: firstComponent.ifc_guid
                      }
                    }
                  });
                  console.log(`Selected object with GUID: ${firstComponent.ifc_guid}`);
                } else {
                  console.error("No method found to select the object.");
                }
              } else {
                console.warn("No valid IFC GUID found in the selection.");
              }
            } else {
              console.warn("No components found in the viewpoint selection.");
            }
          });
          
          componentsList.appendChild(componentItem);
        });
        
        componentsContainer.appendChild(componentsList);
        viewpointContainer.appendChild(componentsContainer);
      }
      // fin llistat Ids

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

  selectIfcComponentByGuid(ifcGuid) {
    if (!ifcGuid) return null;
  
    try {
      const foundObjects = this.findObjectsByIfcGuid(ifcGuid);
      
      if (foundObjects.length === 0 && this.application.loadIFCElementByGuid) {
        this.application.loadIFCElementByGuid(ifcGuid);
        return this.findObjectsByIfcGuid(ifcGuid);
      }
      
      return foundObjects;
    } catch (error) {
      console.error("Error in selectIfcComponentByGuid:", error);
      return null;
    }
  }
  
  findObjectsByIfcGuid(ifcGuid) {
    const foundObjects = [];
    
    const normalizedGuid = ifcGuid.replace(/-/g, '').toUpperCase();
    
    this.application.scene.traverse(object => {
      const objectGuid = this.extractGuidFromObject(object);
      if (objectGuid && objectGuid.replace(/-/g, '').toUpperCase() === normalizedGuid) {
        foundObjects.push(object);
      }
    });
    
    return foundObjects;
  }
  
  extractGuidFromObject(object) {
    if (object.userData?.ifc_guid) return object.userData.ifc_guid;
    
    
    if (object.properties?.GlobalId) return object.properties.GlobalId;
    
    if (object.metadata?.guid) return object.metadata.guid;
    
    if (object.userData?.expressID && this.application.getGlobalId) {
      return this.application.getGlobalId(object.userData.expressID);
    }
    
    return null;
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

    Controls.setSelectOptions(this.typeFilterElem,
      [""].concat(ext.topic_type));
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
    this.updateFilterControls();
    this.exportButton.disabled = true;
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

  onShow()
  {
    this.refreshServices();
  }

  refreshServices()
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
    dialog.services = this.application.services[this.group];

    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (serviceType, parameters) =>
    {
      const service = new ServiceManager.classes[serviceType];
      service.setParameters(parameters);
      this.application.addService(service, this.group);
      this.refreshServices();
      this.service = service;
      this.bcfServiceElem.value = service.name;
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
      serviceTypes, service.constructor.name, service);
    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, parameters) =>
    {
      service.setParameters(parameters);
      this.application.addService(service, this.group);
      this.refreshServices();
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
          this.refreshServices();
          this.filterPanelElem.style.display = "none";
          this.topicTableElem.style.display = "none";
        })
       .setAcceptLabel("button.delete")
       .setI18N(application.i18n).show();
    }
  }

  updateFilterControls()
  {
    const projectMap = this.projectMap;
    let projectId = this.projectElem.value;
    let project = projectMap.get(projectId);

    const noProjects = projectMap.size === 0;
    this.searchTopicsButton.disabled = noProjects || !project.persistent;
    this.searchNewTopicButton.disabled = noProjects || !project.persistent;
    this.setupProjectButton.disabled = noProjects;

    this.refreshExtensions();

    const enableField = (fieldElem, fieldName) =>
    {
      const enabled = this.isFilterFieldEnabled(fieldName);
      fieldElem.parentElement.style.display = enabled ? "" : "none";
    };

    enableField(this.typeFilterElem, "topic_type");
    enableField(this.statusFilterElem, "topic_status");
    enableField(this.priorityFilterElem, "priority");
    enableField(this.assignedToFilterElem, "assigned_to");
  }

  isFilterFieldEnabled(fieldName)
  {
    return true; // enable all by default
  }

  handleError(error, onLogin)
  {
    this.hideProgressBar();

    if (error.code === 401)
    {
      this.requestCredentials("message.invalid_credentials", onLogin);
    }
    else if (error.code === 403)
    {
      this.requestCredentials("message.action_denied", onLogin);
    }
    else
    {
      let message = error.message;
      MessageDialog.create("ERROR", message)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  requestCredentials(message, onLogin, onFailed)
  {
    const loginDialog = new LoginDialog(this.application, message);
    loginDialog.login = (username, password) =>
    {
      this.service.setCredentials("admin", "bimrocket");
      if (onLogin) onLogin();
    };
    loginDialog.onCancel = () =>
    {
      loginDialog.hide();
      if (onFailed) onFailed();
    };
    loginDialog.show();
  }

  showProgressBar()
  {
    this.application.progressBar.message = "";
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
  }

  hideProgressBar()
  {
    this.application.progressBar.visible = false;
  }
}

export { BCFPanel };