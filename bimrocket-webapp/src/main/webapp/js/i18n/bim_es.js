/**
 * bim_ca.js
 *
 * @author realor
 */

export const translations =
{
  "button.show_all" : "Mostrar todo",
  "button.explore_selection" : "Explorar selección",
  "button.screenshot" : "Capturar pantalla",
  "button.upload_image" : "Subir imagen",
  "button.definition" : "Definición",
  "button.references" : "Referencias",

  "tool.bim_inventory.label" : "Inventario BIM",
  "tool.bim_inventory.help" : "Inventario BIM",

  "tool.bim_layout.label" : "Distribución BIM",
  "tool.bim_layout.help" : "Muestra la distribución de los edificios",

  "tool.bim_inspector.label" : "Inspector BIM",
  "tool.bim_inspector.help" : "Muestra la representación IFC",

  "tool.bcf.label" : "BCF",
  "tool.bcf.help" : "Gestión de incidencias BCF",

  "tool.ifcdb.label" : "IFCDB",

  "tool.bsdd.label" : "bSDD",

  "tool.bim_delta.label" : "Detección de cambios",

  "tool.bim_explode.label" : "Explotar modelo",
  "tool.bim_explode.help" : "Selecciona un edficio y aplica desplazamientos en cada eje.",

  "tool.bim_reset_view.label" : "Inicializar vista",

  "tab.file" : "Fichero",
  "tab.entity" : "Entidad",
  "tab.definition" : "Definición",
  "tab.references" : "Referencias",

  "tab.comments" : "Comentarios",
  "tab.viewpoints" : "Vistas",
  "tab.doc_refs" : "Documentos",
  "tab.audit" : "Auditoria",

  "tab.types" : "Tipos",
  "tab.classifications" : "Clasificaciones",
  "tab.groups" : "Grupos",
  "tab.layers" : "Capas",

  "tab.ifcdb_models" : "Modelos",
  "tab.ifcdb_command" : "Comando",

  "tab.bsdd_dictionaries" : "Diccionarios",
  "tab.bsdd_classes" : "Clases",
  "tab.bsdd_properties" : "Propiedades",

  "tab.bim_delta_tree" : "Árbol",
  "tab.bim_delta_json" : "JSON",

  "label.bcf_service" : "Servicio BCF:",
  "label.project" : "Proyecto:",
  "label.status" : "Estado:",
  "label.priority" : "Prioridad:",
  "label.assigned_to" : "Asignada a:",
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
  "label.doc_ref_url" : "Url del documento:",
  "label.doc_ref_description" : "Descripción:",
  "label.link_models" : "Enlazar modelos",
  "label.keep_pov" : "Mantener punto de vista",
  "label.ifcdb_service" : "Servicio IFCDB:",
  "label.ifcdb_modelid" : "Id. de modelo:",
  "label.ifcdb_command" : "Comando SQL:",
  "label.bsdd_filter" : "Filtro:",
  "label.bsdd_class_type" : "Tipo de clase:",
  "label.bim_delta_added" : "Objeto añadido",
  "label.bim_delta_removed" : "Objeto borrado",
  "label.bim_delta_snapshot_name" : "Nombre de la captura IFC:",
  "label.bim_explode_building" : "Edificio:",
  "label.bim_explode_xoffset" : "Desplazamiento eje X:",
  "label.bim_explode_yoffset" : "Desplazamiento eje Y:",
  "label.bim_explode_zoffset" : "Desplazamiento eje Z:",

  "col.index" : "Índ.",
  "col.topic" : "Incidencia",
  "col.status" : "Estado",

  "title.delete_project" : "Borrar proyecto",
  "title.delete_topic" : "Borrar incidencia",
  "title.delete_comment" : "Borrar comentario",
  "title.delete_viewpoint" : "Borrar punto de vista",
  "title.delete_bcf_service" : "Borrar servicio BCF",
  "title.delete_ifcdb_service" : "Borrar servicio IFCDB",
  "title.viewpoint" : "Vista de la incidencia",
  "title.delete_doc_ref" : "Borrar referencia a documento",

  "title.bim_delta_snapshots" : "Capturas IFC",

  "message.no_bim_object_selected" : "Ningún objeto BIM seleccionado.",

  "message.viewpoint" : (index, type) => `Punto de vista ${index} ${type}`,

  "message.project_saved" : "Proyecto guardado.",
  "message.project_deleted" : "Proyecto borrado.",
  "message.topic_saved" : "Incidencia guardada.",
  "message.topic_deleted" : "Incidencia borrada.",
  "message.comment_saved" : "Comentario guardado.",
  "message.comment_deleted" : "Comentario borrado.",
  "message.viewpoint_saved" : "Punto de vista guardado.",
  "message.viewpoint_deleted" : "Punto de vista borrado.",
  "message.project_extensions_saved" : "Extensiones guardadas.",
  "message.doc_ref_deleted" : "Referencia a documento borrada.",
  "message.doc_ref_saved" : "Referencia a documento guardada.",
  "message.topic_searched" : "No se han encontrado incidencias.",

  "message.bsdd_dictionary_count" : count => `Diccionarios: ${count}`,
  "message.bsdd_class_count" : count => `Clases: ${count}`,
  "message.bsdd_dictionary_found" : (count, total) => `Diccionarios encontrados: ${count} de ${total}`,
  "message.bsdd_class_found" : (count, total) => `Clases encontradas: ${count} de ${total}`,

  "message.bim_delta_changes" : changes => `Cambios: ${changes}`,
  "message.bim_delta_cannot_compare" : "Esta captura IFC no es comparable con el modelo actual o se ha generado con una versión anterior de la aplicación.",
  "message.bim_delta_not_ifc_object" : "Selecciona el objeto IFC del cual quieres generar la captura.",

  "question.delete_project" : "Quieres borrar este proyecto y todas sus incidencias?",
  "question.delete_topic" : "Quieres borrar esta incidencia?",
  "question.delete_comment" : "Quieres borrar este comentario?",
  "question.delete_viewpoint" : "Quieres borrar este punto de vista?",
  "question.delete_doc_ref" : "Quieres borrar esta referencia a documento?",
  "question.delete_bcf_service" : name => `Quieres borrar el servicio ${name}?`,
  "question.delete_ifcdb_service" : name => `Quieres borrar el servicio ${name}?`
};
