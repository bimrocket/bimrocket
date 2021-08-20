/**
 * bim_ca.js
 *
 * @author realor
 */

export const translations =
{
  "button.show_all" : "Mostrar todo",
  "button.explore_selection" : "Explorar selección",

  "tool.bim_inventory.label" : "Inventario BIM",
  "tool.bim_inventory.help" : "Inventario BIM",

  "tool.bim_layout.label" : "Distribución BIM",
  "tool.bim_layout.help" : "Muestra la distribución de los edificios",

  "tool.bim_inspector.label" : "Inspector BIM",
  "tool.bim_inspector.help" : "Muestra la representación IFC",

  "tool.bcf.label" : "BCF",
  "tool.bcf.help" : "Gestión de incidencias BCF",

  "tab.comments" : "Comentarios",
  "tab.viewpoints" : "Vistas",
  "tab.links" : "Enlaces",
  "tab.audit" : "Auditoria",

  "tab.types" : "Tipos",
  "tab.classifications" : "Clasificaciones",
  "tab.groups" : "Grupos",

  "label.bcf_service" : "Servicio BCF:",
  "label.project" : "Proyecto:",
  "label.status" : "Estado:",
  "label.priority" : "Prioridad:",
  "label.assigned_to" : "Asignado a:",
  "label.index" : "Índice:",
  "label.title" : "Título:",
  "label.type" : "Tipo:",
  "label.stage" : "Fase:",
  "label.due_date" : "Vencimiento:",
  "label.description" : "Descripción:",
  "label.creation_date" : "Fecha creación:",
  "label.creation_author" : "Creada por:",
  "label.modify_date" : "Fecha modific.:",
  "label.modify_author" : "Modificada por:",
  "label.project_name" : "Nombre del proyecto:",
  "label.project_extensions" : "Extensiones del proyecto:",
  "label.comment" : "Comentario:",
  "label.zoom_image" : "Ampliar imagen",

  "col.index" : "Índ.",
  "col.topic" : "Incidencia",
  "col.status" : "Estado",

  "title.delete_topic" : "Borrar incidencia",
  "title.delete_comment" : "Borrar comentario",
  "title.delete_viewpoint" : "Borrar punto de vista",
  "title.delete_bcf_service" : "Borrar servicio BCF",
  "title.viewpoint" : "Vista de la incidencia",

  "message.no_bim_object_selected" : "Ningún objeto BIM seleccionado.",

  "message.viewpoint" : (index, type) => `Punto de vista ${index} ${type}`,

  "message.topic_saved" : "Incidencia guardada.",
  "message.topic_deleted" : "Incidencia borrada.",
  "message.comment_saved" : "Comentario guardado.",
  "message.comment_deleted" : "Comentario borrado.",
  "message.viewpoint_saved" : "Punto de vista guardado.",
  "message.viewpoint_deleted" : "Punto de vista borrado.",
  "message.project_saved" : "Proyecto guardado.",
  "message.project_extensions_saved" : "Extensiones guardadas.",

  "question.delete_topic" : "Quieres borrar esta incidencia?",
  "question.delete_comment" : "Quieres borrar este comentario?",
  "question.delete_viewpoint" : "Quieres borrar este punto de vista?",
  "question.delete_bcf_service" : name => `Quieres borrar el servicio ${name}?`
};
