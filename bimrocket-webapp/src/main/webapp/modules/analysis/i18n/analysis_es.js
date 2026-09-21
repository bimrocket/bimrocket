/**
 * analysis_es.js
 *
 * @author realor
 */

export const translations =
{
  "menu.analysis": "Análisis",
  "menu.measure": "Medición",

  "button.exposure": "Exposición",
  "button.select_position": "Seleccionar posición",
  "button.select_surfaces": "Seleccionar superficies",

  "tool.histogram.label": "Histograma",

  "tool.measure_angle.label": "Medir ángulo",
  "tool.measure_angle.select_first_point": "Selecciona primer punto.",
  "tool.measure_angle.select_second_point": "Selecciona segundo punto.",
  "tool.measure_angle.select_third_point": "Selecciona tercer punto.",

  "tool.measure_area.label": "Medir área",
  "tool.measure_area.help": "Dibuja el área a medir.",

  "tool.measure_length.label": "Medir longitud",
  "tool.measure_length.help": "Dibuja la linea a medir.",

  "tool.measure_selection.label": "Medir selección",

  "tool.report.label": "Informes",
  "tool.report.name": "Nombre del informe:",
  "tool.report.rules": "Reglas:",

  "tool.search.label": "Búsqueda",

  "tool.solar_simulator.label": "Simulador solar",
  "tool.solar_simulator.select_position": "Selecciona el objeto de la escena donde quieras calcular la exposición solar y pulsa el botón 'Seleccionar posición'.",
  "tool.solar_simulator.drag": "Cambia la hora arrastrando el puntero sobre el gráfico.",
  "tool.solar_simulator.cast_shadows": "Proyectar sombras",
  "tool.solar_simulator.adjust_intensity": "Ajustar la intensidad solar",
  "tool.solar_simulator.max_length_info": "Longitud máxima de los lados de los triángulos en la fase 1",
  "tool.solar_simulator.max_area_info": "Área máxima de los triángulos en la fase 2",

  "action.create_report": "Crear informe",
  "action.report": "Informe",
  "action.run_report": "Ejecutar informe",
  "action.edit_report": "Editar informe",

  "label.property_set": "Conjunto de propiedades:",
  "label.property": "Propiedad:",
  "label.group_by": "Agrupar por:",
  "label.order_by": "Ordenar por:",
  "label.highlight": "Resaltado:",
  "label.show_undefined": "Mostrar indefinido",
  "label.undefined": "Indefinido",

  "label.report_type": "Tipo de informe:",

  "label.text_to_find": "Texto a buscar:",
  "label.search_by_name": "Buscar por nombre de propiedad",
  "label.search_by_value": "Buscar por valor de propiedad",
  "label.case_sensitive": "Distinguir mayúsculas/minúsculas",

  "label.date": "Fecha:",
  "label.time": "Hora:",
  "label.azimuth": "Azimut:",
  "label.elevation": "Elevación:",
  "label.longitude": "Longitud:",
  "label.latitude": "Latitud:",
  "label.max_length": "Longitud máxima:",
  "label.max_area": "Área máxima:",

  "option.no_groups": "Sin agrupaciones",
  "option.value_asc": "Valor (ascendente)",
  "option.value_desc": "Valor (descendente)",
  "option.occurrences_asc": "Ocurrencias (ascendente)",
  "option.occurrences_desc": "Ocurrencias (descendente)",
  "option.highlight_disabled": "Deshabilitado",
  "option.highlight_random_colors": "Colores aleatorios",
  "option.highlight_color_grading": "Gradación de colores",

  "message.measure_length": (length, units) => `Longitud: ${length} ${units}`,
  "message.measure_area": (area, units) => `Área: ${area} ${units}2`,
  "message.measure_angle": angle => `Ángulo: ${angle} grados`,

  "message.solid_count": count => `Número de sólidos: ${count}`,
  "message.mesh_count": count => `Número de mallas: ${count}`,
  "message.total_area": (area, units) => `Area: ${area} ${units}2`,
  "message.total_volume": (volume, units) => `Volumen: ${volume} ${units}3`,
  "message.area_volume_ratio": ratio => `Area/Volumen: ${ratio}`,

  "message.no_matches": "Ninguna coincidencia encontrada.",
  "message.one_match": "1 coincidencia encontrada.",
  "message.matches_count": count => `${count} coincidencias encontradas.`,

  "message.solar_simulator_select_faces": "Selecciona la superficie sobre la que quieres calcular la exposición solar mediante la herramienta de selección de caras.",

  "title.report_editor": "Editor de informes",
  "title.report_type": "Nuevo informe"
};
