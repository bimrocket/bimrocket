/**
 * bim.js
 *
 * @author realor
 */

export const translations =
{
  "button.show_all" : "Show all",
  "button.explore_selection" : "Explore selection",
  "button.screenshot" : "Screenshot",
  "button.upload_image" : "Upload image",
  "button.definition" : "Definition",
  "button.references" : "References",
  "button.save_extensions" : "Save extensions",

  "tool.bim_inventory.label" : "BIM inventory",
  "tool.bim_inventory.help" : "BIM inventory setup",

  "tool.bim_layout.label" : "BIM layout",
  "tool.bim_layout.help" : "Shows BIM layout",

  "tool.bim_inspector.label" : "BIM inspector",
  "tool.bim_inspector.help" : "Shows BIM data",

  "tool.bcf.label" : "BCF",
  "tool.bcf.help" : "Manage BCF topics",

  "tool.ifcdb.label" : "IFCDB",

  "tool.bsdd.label" : "bSDD",

  "tool.bim_delta.label" : "Change detection",

  "tool.bim_explode.label" : "Explode model",
  "tool.bim_explode.help" : "Select a building and apply offsets on each axis.",

  "tool.bim_reset_view.label" : "Reset view",

  "tab.file" : "File",
  "tab.entity" : "Entity",
  "tab.definition" : "Definition",
  "tab.references" : "References",

  "tab.comments" : "Comments",
  "tab.viewpoints" : "Viewpoints",
  "tab.doc_refs" : "Documents",
  "tab.audit" : "Audit",

  "tab.types" : "Types",
  "tab.classifications" : "Classifications",
  "tab.groups" : "Groups",
  "tab.layers" : "Layers",

  "tab.ifcdb_models" : "Models",
  "tab.ifcdb_command" : "Command",

  "tab.bsdd_dictionaries" : "Dictionaries",
  "tab.bsdd_classes" : "Classes",
  "tab.bsdd_properties" : "Properties",

  "tab.bim_delta_tree" : "Tree",
  "tab.bim_delta_json" : "JSON",

  "label.bcf_service" : "BCF service:",
  "label.project" : "Project:",
  "label.status" : "Status:",
  "label.priority" : "Priority:",
  "label.assigned_to" : "Assigned to:",
  "label.index" : "Index:",
  "label.title" : "Title:",
  "label.type" : "Type:",
  "label.stage" : "Stage:",
  "label.due_date" : "Due date:",
  "label.description" : "Description:",
  "label.creation_date" : "Creation date:",
  "label.creation_author" : "Creation author:",
  "label.modify_date" : "Modify date:",
  "label.modify_author" : "Modify author:",
  "label.project_name" : "Project name:",
  "label.project_extensions" : "Project extensions:",
  "label.comment" : "Comment:",
  "label.zoom_image" : "Zoom image",
  "label.doc_ref_url" : "Document url:",
  "label.doc_ref_description" : "Description:",
  "label.link_models" : "Link models",
  "label.keep_pov" : "Keep point of view",
  "label.ifcdb_service" : "IFCDB service:",
  "label.ifcdb_modelid" : "Model id:",
  "label.ifcdb_command" : "SQL command:",
  "label.bsdd_filter" : "Filter:",
  "label.bsdd_class_type" : "Class type:",
  "label.bim_delta_added" : "Object added",
  "label.bim_delta_removed" : "Object removed",
  "label.bim_delta_snapshot_name" : "IFC snapshot name:",
  "label.bim_explode_building" : "Building:",
  "label.bim_explode_xoffset" : "X axis offset:",
  "label.bim_explode_yoffset" : "Y axis offset:",
  "label.bim_explode_zoffset" : "Z axis offset:",
  "label.select_components" : "Select components in view:",

  "col.index" : "Idx.",
  "col.topic" : "Topic",
  "col.status" : "Status",

  "title.delete_project" : "Delete project",
  "title.delete_topic" : "Delete topic",
  "title.delete_comment" : "Delete comment",
  "title.delete_viewpoint" : "Delete viewpoint",
  "title.delete_bcf_service" : "Delete BCF service",
  "title.delete_ifcdb_service" : "Delete IFCDB service",
  "title.viewpoint" : "Topic viewpoint",
  "title.delete_doc_ref" : "Delete document reference",
  "title.select_components" : "Select components",

  "title.bim_delta_snapshots" : "IFC snapshots",

  "message.no_bim_object_selected" : "No BIM object selected.",

  "message.viewpoint" : (index, type) => `Viewpoint ${index} ${type}`,

  "message.project_saved" : "Project saved.",
  "message.project_deleted" : "Project deleted.",
  "message.topic_saved" : "Topic saved.",
  "message.topic_deleted" : "Topic deleted.",
  "message.comment_saved" : "Comment saved.",
  "message.comment_deleted" : "Comment deleted.",
  "message.viewpoint_saved" : "Viewpoint saved.",
  "message.viewpoint_deleted" : "Viewpoint deleted.",
  "message.project_extensions_saved" : "Project extensions saved.",
  "message.doc_ref_deleted" : "Document reference deleted.",
  "message.doc_ref_saved" : "Document reference saved.",
  "message.topic_searched" : "No topics found.",
  "message.no_components_selected": "No objects were found for this view",

  "message.bsdd_dictionary_count" : count => `Dictionaries: ${count}`,
  "message.bsdd_class_count" : count => `Classes: ${count}`,
  "message.bsdd_dictionary_found" : (count, total) => `Dictionaries found: ${count} of ${total}`,
  "message.bsdd_class_found" : (count, total) => `Classes found: ${count} of ${total}`,

  "message.bim_delta_changes" : changes => `Changes: ${changes}`,
  "message.bim_delta_cannot_compare" : "This IFC snapshot is not comparable with the current model or it was generated with a previous version of the application.",
  "message.bim_delta_not_ifc_object" : "Select the IFC object you want to generate the snapshot of.",

  "question.delete_project" : "Do you want to delete this project and all its topics?",
  "question.delete_topic" : "Do you want to delete this topic?",
  "question.delete_comment" : "Do you want to delete this comment?",
  "question.delete_viewpoint" : "Do you want to delete this viewpoint?",
  "question.delete_doc_ref" : "Do you want to delete this document reference?",
  "question.delete_bcf_service" : name => `Do you want to delete the ${name} service?`,
  "question.delete_ifcdb_service" : name => `Do you want to delete the ${name} service?`
};
