/**
 * design.js
 *
 * @author realor
 */

export const translations =
{
  "menu.design": "Design",
  "menu.design.add": "Add",
  "menu.design.add_solid": "Solid",
  "menu.design.add_profile": "Profile",
  "menu.design.add_cord": "Cord",
  "menu.design.add_camera": "Camera",
  "menu.design.add_light": "Light",
  "menu.design.boolean_operation": "Boolean operation",
  "menu.design.geometry": "Geometry tools",
  "menu.design.transform": "Transform",

  "button.finish": "Finish",
  "button.make_profile": "Make profile",
  "button.change_axis": "Change axis",

  "button.optimize": "Optimize",

  "button.preview_material": "Preview material",
  "button.apply_material": "Apply material",
  "button.restore_materials": "Restore materials",
  "button.material_usage": "Usage",

  "tool.add_object.label": "Add object",

  "tool.union.label": "Union",

  "tool.intersection.label": "Intersection",

  "tool.subtraction.label": "Subtraction",

  "tool.clip.label": "Clip",

  "tool.cloner.label": "Cloner",

  "tool.decompose.label": "Decompose",

  "tool.draw.label": "Draw",
  "tool.draw.add_vertex": "Add vertex to the cord.",
  "tool.draw.first_vertex": "Draw the first vertex of the cord.",
  "tool.draw.select_vertex": "Select vertex to move or insert.",
  "tool.draw.vertex_destination": "Select new vertex position.",

  "tool.extrude.label": "Extrude",
  "tool.extrude.drag_pointer": "Drag the pointer to extrude the selected object dynamically.",
  "tool.extrude.select_object": "Select profile or solid to extrude.",

  "tool.inspect_geometry.label": "Inspect geometry",
  "tool.inspect_geometry.help": "Select geometry to inspect",

  "tool.merge_geometries.label": "Merge geometries",

  "tool.mesh_to_solid.label": "Mesh to Solid",

  "tool.move.label": "Move",
  "tool.move.select_anchor_point": "Select anchor point.",
  "tool.move.select_destination_point": "Select destination point.",
  "tool.move.edit_offset": "Edit offset or select anchor point.",

  "tool.offset_geometries.label": "Offset geometries",

  "tool.paint.label": "Paint",

  "tool.place.label": "Place",
  "tool.place.help": "Select a point to place the object.",

  "tool.solid_to_mesh.label": "Solid to Mesh",

  "tool.rebuild.label": "Rebuild",

  "tool.reduce_coordinates.label": "Reduce coordinates",

  "tool.reset_matrix.label": "Reset matrix",

  "tool.revolve.label": "Revolve",
  "tool.revolve.set_axis_first_point": "Set the first point of the axis of revolution.",
  "tool.revolve.set_axis_second_point": "Set the second point of the axis of revolution.",
  "tool.revolve.drag_pointer": "Drag pointer to revolve the selected object dynamically.",
  "tool.revolve.select_object": "Select profile or solid to revolve.",

  "tool.rotate.label": "Rotate",
  "tool.rotate.select_first_point": "Select the first point of the axis of rotation.",
  "tool.rotate.select_second_point": "Select the second point of the axis of rotation.",
  "tool.rotate.select_anchor_point": "Select anchor point.",
  "tool.rotate.select_destination_point": "Select destination point.",
  "tool.rotate.edit_rotation": "Edit rotation or select anchor point.",

  "tool.scale.label": "Scale",
  "tool.scale.select_first_point": "Select the origin point.",
  "tool.scale.select_anchor_point": "Select anchor point.",
  "tool.scale.select_destination_point": "Select destination point.",
  "tool.scale.edit_scale": "Edit scale or select anchor point.",

  "tool.smooth_edges.label": "Smooth edges",

  "tool.add_box.label": "Box",
  "tool.add_cylinder.label": "Cylinder",
  "tool.add_cone.label": "Cone",
  "tool.add_sphere.label": "Sphere",
  "tool.add_torus.label": "Torus",
  "tool.add_spring.label": "Spring",
  "tool.add_object3D.label": "Object 3D",
  "tool.add_group.label": "Group",
  "tool.add_rectangle.label": "Rectangle",
  "tool.add_circle.label": "Circle",
  "tool.add_ellipse.label": "Ellipse",
  "tool.add_trapezium.label": "Trapezium",
  "tool.add_iprofile.label": "I Profile",
  "tool.add_lprofile.label": "L Profile",
  "tool.add_tprofile.label": "T Profile",
  "tool.add_uprofile.label": "U Profile",
  "tool.add_zprofile.label": "Z Profile",
  "tool.add_helicoid.label": "Helicoid",
  "tool.add_text2D.label": "Text 2D",
  "tool.add_sprite.label": "Sprite",
  "tool.add_perspective_camera.label": "Perspective camera",
  "tool.add_orthographic_camera.label": "Orthographic camera",
  "tool.add_ambient_light.label": "Ambient light",
  "tool.add_hemisphere_light.label": "Hemisphere light",
  "tool.add_directional_light.label": "Directional light",
  "tool.add_point_light.label": "Point light",
  "tool.add_spot_light.label": "Spot light",

  "label.geometries_display": "Geometries to display:",
  "label.geometry_inventory": "Inventory",
  "label.geometry_detail": "Geometry",
  "label.geometry_id": "Id",
  "label.geometry_instances": "Instances",
  "label.geometry_triangles": "Triangles",
  "label.geometry_total_triangles": "Total",

  "label.material_list": "Materials:",
  "label.color": "Diffuse color:",
  "label.specular": "Specular color:",
  "label.emissive": "Emissive color:",
  "label.material_side": "Applied to:",
  "label.front_side": "Front side",
  "label.back_side": "Back side",
  "label.double_side": "Double side",
  "label.depth_test": "Depth test",
  "label.depth_write": "Depth write",
  "label.opacity": opacity => `Opacity: ${opacity}%`,
  "label.material_name": "Name:",
  "label.material_on_selection": "On selection",

  "label.place_mode": "Mode:",

  "label.smooth_angle": "Smooth angle:",

  "label.scale_factor": "Scale factor:",
  "label.scale_keep_proportions": "Keep proportions",

  "message.object_name": objectName => `Object: ${objectName}`,
  "message.geometry_id": id => `Geometry id: ${id}`,
  "message.vertex_count": count => `Vertices: ${count}`,
  "message.face_count": count => `Faces: ${count}`,
  "message.is_manifold": manifold => `Is manifold: ${manifold ? "yes" : "no"}`,
  "message.geometry_count": count => `Geometries: ${count}`,
  "message.instance_count": count => `Instances: ${count}`,
  "message.modeled_triangle_count": count => `Modeled triangles: ${count}`,
  "message.rendered_triangle_count": count => `Rendered triangles: ${count}`,

  "message.invalid_revolution_axis": "Invalid axis of revolution. This axis can not be projected onto the plane of the profile.",

  "title.new_material": "New material",
  "title.rename_material": "Rename material"
};
