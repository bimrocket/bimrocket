/**
 * bim_ca.js
 *
 * @author realor
 */

export const translations =
{
  "button.show_all" : "Mostra tot",
  "button.explore_selection" : "Explora selecció",
  "button.screenshot" : "Captura pantalla",
  "button.upload_image" : "Puja imatge",
  "button.definition" : "Definició",
  "button.references" : "Referències",
  "button.save_extensions" : "Desa extensions",
  "button.new_user": "Usuari nou",

  "tool.bim_inventory.label" : "Inventari BIM",
  "tool.bim_inventory.help" : "Inventari BIM",

  "tool.bim_layout.label" : "Distribució BIM",
  "tool.bim_layout.help" : "Mostra la distribució dels edificis",

  "tool.bim_inspector.label" : "Inspector BIM",
  "tool.bim_inspector.help" : "Mostra la representació IFC",

  "tool.bcf.label" : "BCF",
  "tool.bcf.help" : "Gestió d'incidencies BCF",

  "tool.ifcdb.label" : "IFCDB",

  "tool.bsdd.label" : "bSDD",

  "tool.bim_delta.label" : "Detecció de canvis",

  "tool.bim_explode.label" : "Explota model",
  "tool.bim_explode.help" : "Selecciona un edfici i aplica desplaçaments en cada eix.",

  "tool.bim_reset_view.label" : "Inicialitza vista",

  "tool.server_admin.label" : "Admin. del servei",

  "tab.file" : "Fitxer",
  "tab.entity" : "Entitat",
  "tab.definition" : "Definició",
  "tab.references" : "Referències",

  "tab.comments" : "Comentaris",
  "tab.viewpoints" : "Vistes",
  "tab.doc_refs" : "Documents",
  "tab.audit" : "Auditoria",

  "tab.types" : "Tipus",
  "tab.classifications" : "Classificacions",
  "tab.groups" : "Grups",
  "tab.layers" : "Capes",

  "tab.ifcdb_models" : "Models",
  "tab.ifcdb_command" : "Comanda",

  "tab.bsdd_dictionaries" : "Diccionaris",
  "tab.bsdd_classes" : "Classes",
  "tab.bsdd_properties" : "Propietats",

  "tab.bim_delta_tree" : "Àrbre",
  "tab.bim_delta_json" : "JSON",

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
  "label.doc_ref_url" : "Url del document:",
  "label.doc_ref_description" : "Descripció:",
  "label.link_models" : "Enllaça models",
  "label.keep_pov" : "Manté punt de vista",
  "label.ifcdb_service" : "Servei IFCDB:",
  "label.ifcdb_modelname" : "Nom del model:",
  "label.ifcdb_command" : "Comanda SQL:",
  "label.ifcdb_modelid" : "Id del model:",
  "label.ifcdb_modeldesc" : "Descripció del model:",
  "label.ifcdb_read_roles" : "Rols de consulta:",
  "label.ifcdb_upload_roles" : "Rols de pujada:",
  "label.bsdd_filter" : "Filtre:",
  "label.bsdd_class_type" : "Tipus de classe:",
  "label.bim_delta_added" : "Objecte afegit",
  "label.bim_delta_removed" : "Objecte esborrat",
  "label.bim_delta_snapshot_name" : "Nom de la captura IFC:",
  "label.bim_explode_building" : "Edifici:",
  "label.bim_explode_xoffset" : "Desplaçament eix X:",
  "label.bim_explode_yoffset" : "Desplaçament eix Y:",
  "label.bim_explode_zoffset" : "Desplaçament eix Z:",
  "label.select_components" : "Selecciona els objectes de la vista:",

  "label.admin_service" : "Servidor Admin:",
  "label.users": "Gestió d'usuaris",
  "label.roles_management": "Gestió de rols",
  "label.id": "Id:",
  "label.email": "Email:",
  "label.roles": "Rols:",
  "label.configuration": "Configuració",
  "label.confirm_password": "Confirma paraula de pas:",

  "col.index" : "Ídx.",
  "col.topic" : "Incidència",
  "col.sta servicetus" : "Estat",
  "col.id" : "Id",
  "col.name" : "Nom",
  "col.role" : "Rol",

  "title.delete_project" : "Esborra projecte",
  "title.delete_topic" : "Esborra incidència",
  "title.delete_comment" : "Esborra comentari",
  "title.delete_viewpoint" : "Esborra punt de vista",
  "title.delete_bcf_service" : "Esborra servei BCF",
  "title.delete_ifcdb_service" : "Esborra servei IFCDB",
  "title.delete_ifcdb_model" : "Esborra model IFC",
  "title.viewpoint" : "Vista de la incidència",
  "title.delete_doc_ref" : "Esborra referència a document",
  "title.select_components" : "Selecciona objectes",

  "title.delete_user" : "Esborra usuari",

  "title.bim_delta_snapshots" : "Captures IFC",

  "title.admin_service": "Administració del servei",

  "message.no_bim_object_selected" : "Cap objecte BIM seleccionat.",

  "message.viewpoint" : (index, type) => `Punt de vista ${index} ${type}`,

  "message.project_saved" : "Projecte desat.",
  "message.project_deleted" : "Projecte esborrat.",
  "message.topic_saved" : "Incidència desada.",
  "message.topic_deleted" : "Incidència esborrada.",
  "message.comment_saved" : "Comentari desat.",
  "message.comment_deleted" : "Comentari esborrat.",
  "message.viewpoint_saved" : "Punt de vista desat.",
  "message.viewpoint_deleted" : "Punt de vista esborrat.",
  "message.project_extensions_saved" : "Extensions desades.",
  "message.doc_ref_deleted" : "Referència a document esborrada.",
  "message.doc_ref_saved" : "Referència a document desada.",
  "message.topic_searched" : "No s'ha trobat cap incidència.",
  "message.no_components_selected": "No s'han trobat objectes per a aquesta vista",

  "message.extensions_phase_started": "Fase de revisió iniciada correctament.",
  "message.extensions_phase_ended": "Fase de revisió finalitzada correctament.",
  "message.extensions_phase_published": "Fase pública iniciada correctament.",
  "message.operation_completed": "Operació completada",

  "message.bsdd_dictionary_count" : count => `Diccionaris: ${count}`,
  "message.bsdd_class_count" : count => `Classes: ${count}`,
  "message.bsdd_dictionary_found" : (count, total) => `Diccionaris trobats: ${count} de ${total}`,
  "message.bsdd_class_found" : (count, total) => `Classes trobades: ${count} de ${total}`,

  "message.bim_delta_changes" : changes => `Canvis: ${changes}`,
  "message.bim_delta_cannot_compare" : "Aquesta captura IFC no és comparable amb el model actual o s'ha generat amb una versió anterior de l'aplicació.",
  "message.bim_delta_not_ifc_object" : "Selecciona l'objecte IFC del qual vols generar la captura.",

  "message.user_saved" : "Usuari desat.",
  "message.user_deleted" : "Usuari esborrat.",
  "message.confirm_password_error" : "Les contrasenyes no coincideixen.",
  "message.user_searched" : "No s'ha trobat cap usuari.",
  "message.fields_required" : "El nom i l'email són obligatoris.",
  "message.no_model_found" : "No s'ha trobat cap model.",
  "message.model_saved" : "Model desat.",
  "message.model_updated" : "Model actualitzat.",
  "message.model_deleted" : "Model esborrat.",

  "question.delete_project" : "Vols esborrar aquest projecte i totes les seves incidències?",
  "question.delete_topic" : "Vols esborrar aquesta incidència?",
  "question.delete_comment" : "Vols esborrar aquest comentari?",
  "question.delete_viewpoint" : "Vols esborrar aquest punt de vista?",
  "question.delete_doc_ref" : "Vols esborrar aquesta referència a document?",
  "question.delete_bcf_service" : name => `Vols esborrar el servei ${name}?`,
  "question.delete_ifcdb_service" : name => `Vols esborrar el servei ${name}?`,
  "question.delete_ifcdb_model" : name => `Vols esborrar el model ${name}?`,
  "question.delete_user" : "Vols esborrar aquest usuari?",

  "placeholder.keep_password": "Deixa en blanc per mantenir la paraula de pas actual",
  "placeholder.confirm_password": "Repeteix la nova paraula de pas",
  "placeholder.add_tags": "Escriu i prem Enter per afegir etiquetes"
};
