/**
 * bim_ca.js
 *
 * @author realor
 */

export const translations =
{
  "button.show_all" : "Mostra tot",
  "button.explore_selection" : "Explora selecció",

  "tool.bim_inventory.label" : "Inventari BIM",
  "tool.bim_inventory.help" : "Inventari BIM",

  "tool.bim_layout.label" : "Distribució BIM",
  "tool.bim_layout.help" : "Mostra la distribució dels edificis",

  "tool.bim_inspector.label" : "Inspector BIM",
  "tool.bim_inspector.help" : "Mostra la representació IFC",

  "tool.bcf.label" : "BCF",
  "tool.bcf.help" : "Gestió d'incidencies BCF",

  "tab.comments" : "Comentaris",
  "tab.viewpoints" : "Vistes",
  "tab.links" : "Enllaços",
  "tab.audit" : "Auditoria",

  "tab.types" : "Tipus",
  "tab.classifications" : "Classificacions",
  "tab.groups" : "Grups",
  "tab.layers" : "Capes",

  "label.bcf_service" : "Servei BCF:",
  "label.project" : "Projecte:",
  "label.status" : "Estat:",
  "label.priority" : "Prioritat:",
  "label.assigned_to" : "Assignada a:",
  "label.index" : "Índex:",
  "label.title" : "Títol:",
  "label.type" : "Tipus:",
  "label.stage" : "Fase:",
  "label.due_date" : "Venciment:",
  "label.description" : "Descripció:",
  "label.creation_date" : "Data creació:",
  "label.creation_author" : "Creat per:",
  "label.modify_date" : "Data modific.:",
  "label.modify_author" : "Modificat per:",
  "label.project_name" : "Nom del projecte:",
  "label.project_extensions" : "Extensions del projecte:",
  "label.comment" : "Comentari:",
  "label.zoom_image" : "Amplia imatge",

  "col.index" : "Ídx.",
  "col.topic" : "Incidència",
  "col.status" : "Estat",

  "title.delete_topic" : "Esborra incidència",
  "title.delete_comment" : "Esborra comentari",
  "title.delete_viewpoint" : "Esborra punt de vista",
  "title.delete_bcf_service" : "Esborra servei BCF",
  "title.viewpoint" : "Vista de la incidència",

  "message.no_bim_object_selected" : "Cap objecte BIM seleccionat.",

  "message.viewpoint" : (index, type) => `Punt de vista ${index} ${type}`,

  "message.topic_saved" : "Incidència desada.",
  "message.topic_deleted" : "Incidència esborrada.",
  "message.comment_saved" : "Comentari desat.",
  "message.comment_deleted" : "Comentari esborrat.",
  "message.viewpoint_saved" : "Punt de vista desat.",
  "message.viewpoint_deleted" : "Punt de vista esborrat.",
  "message.project_saved" : "Projecte desat.",
  "message.project_extensions_saved" : "Extensions desades.",

  "question.delete_topic" : "Vols esborrar aquesta incidència?",
  "question.delete_comment" : "Vols esborrar aquest comentari?",
  "question.delete_viewpoint" : "Vols esborrar aquest punt de vista?",
  "question.delete_bcf_service" : name => `Vols esborrar el servei ${name}?`
};
