/**
 * analysis_ca.js
 *
 * @author realor
 */

export const translations =
{
  "menu.analysis": "Anàlisi",
  "menu.measure": "Mesurament",

  "button.exposure": "Exposició",
  "button.select_position": "Selecciona posició",
  "button.select_surfaces": "Selecciona superfícies",

  "tool.histogram.label": "Histograma",

  "tool.measure_angle.label": "Mesura angle",
  "tool.measure_angle.select_first_point": "Selecciona primer punt.",
  "tool.measure_angle.select_second_point": "Selecciona segon punt.",
  "tool.measure_angle.select_third_point": "Selecciona tercer punt.",

  "tool.measure_area.label": "Mesura àrea",
  "tool.measure_area.help": "Dibuixa l'àrea a mesurar.",

  "tool.measure_length.label": "Mesura longitud",
  "tool.measure_length.help": "Dibuixa la línia a mesurar.",

  "tool.measure_selection.label": "Mesura selecció",

  "tool.report.label": "Informes",
  "tool.report.name": "Nom de l'informe:",
  "tool.report.rules": "Regles:",

  "tool.search.label": "Cerca",

  "tool.solar_simulator.label": "Simulador solar",
  "tool.solar_simulator.select_position": "Selecciona l'objecte de l'escena on vulguis calcular l'exposició solar i prem el botó 'Selecciona posició'.",
  "tool.solar_simulator.drag": "Canvia l'hora arrossegant el punter sobre la gràfica.",
  "tool.solar_simulator.cast_shadows": "Projecta ombres",
  "tool.solar_simulator.adjust_intensity": "Ajusta la intensitat solar",
  "tool.solar_simulator.max_length_info": "Longitud màxima dels costats dels triangles en la fase 1",
  "tool.solar_simulator.max_area_info": "Àrea màxima dels triangles en la fase 2",

  "action.create_report": "Crea informe",
  "action.report": "Informe",
  "action.run_report": "Executa informe",
  "action.edit_report": "Edita informe",

  "label.property_set": "Conjunt de propietats:",
  "label.property": "Propietat:",
  "label.group_by": "Agrupa per:",
  "label.order_by": "Ordena per:",
  "label.highlight": "Ressaltat:",
  "label.show_undefined": "Mostra indefinit",
  "label.undefined": "Indefinit",

  "label.report_type": "Tipus d'informe:",

  "label.text_to_find": "Text a cercar:",
  "label.search_by_name": "Cerca per nom de propietat",
  "label.search_by_value": "Cerca per valor de propietat",
  "label.case_sensitive": "Distingueix majúscules/minúscules",

  "label.date": "Data:",
  "label.time": "Hora:",
  "label.azimuth": "Azimut:",
  "label.elevation": "Elevació:",
  "label.longitude": "Longitud:",
  "label.latitude": "Latitud:",
  "label.max_length": "Longitud màxima:",
  "label.max_area": "Àrea màxima:",

  "option.no_groups": "Sense agrupacions",
  "option.value_asc": "Valor (ascendent)",
  "option.value_desc": "Valor (descendent)",
  "option.occurrences_asc": "Ocurrències (ascendent)",
  "option.occurrences_desc": "Ocurrències (descendent)",
  "option.highlight_disabled": "Deshabilitat",
  "option.highlight_random_colors": "Colors aleatoris",
  "option.highlight_color_grading": "Gradació de colors",

  "message.measure_length": (length, units) => `Longitud: ${length} ${units}`,
  "message.measure_area": (area, units) => `Àrea: ${area} ${units}2`,
  "message.measure_angle": angle => `Angle: ${angle} graus`,

  "message.solid_count": count => `Nombre de sòlids: ${count}`,
  "message.mesh_count": count => `Nombre de malles: ${count}`,
  "message.total_area": (area, units) => `Àrea: ${area} ${units}2`,
  "message.total_volume": (volume, units) => `Volum: ${volume} ${units}3`,
  "message.area_volume_ratio": ratio => `Àrea/Volum: ${ratio}`,

  "message.no_matches": "Cap coincidència trobada.",
  "message.one_match": "1 coincidència trobada.",
  "message.matches_count": count => `${count} coincidències trobades.`,

  "message.solar_simulator_select_faces": "Selecciona la superfície sobre la qual vols calcular l'exposició solar mitjançant l'eina de selecció de cares.",

  "title.report_editor": "Editor d'informes",
  "title.report_type": "Nou informe"
};
